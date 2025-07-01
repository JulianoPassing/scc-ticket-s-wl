const { Client, GatewayIntentBits, Collection, Events, PermissionFlagsBits, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Load configuration once at startup
let config;
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (error) {
    console.error('Error loading config.json:', error);
    process.exit(1);
}

// Create a collection for commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Bot ready event
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    client.user.setActivity('Managing support tickets', { type: 'WATCHING' });
});

// Rate limiting system
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(userId) {
    const now = Date.now();
    const userRequests = rateLimit.get(userId) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }
    
    // Add current request
    recentRequests.push(now);
    rateLimit.set(userId, recentRequests);
    
    return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [userId, requests] of rateLimit.entries()) {
        const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
        if (recentRequests.length === 0) {
            rateLimit.delete(userId);
        } else {
            rateLimit.set(userId, recentRequests);
        }
    }
}, RATE_LIMIT_WINDOW);

// UNIFIED Interaction Handler
client.on(Events.InteractionCreate, async interaction => {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('There was an error while executing this command!')
                .setTimestamp();

            const replyOptions = { embeds: [errorEmbed], ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }
        }
    } 
    
    // 2. Handle Button Interactions
    else if (interaction.isButton()) {
        // Apply rate limiting
        if (isRateLimited(interaction.user.id)) {
            const rateLimitEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Rate Limited')
                .setDescription('Você está fazendo muitas requisições. Aguarde um momento antes de tentar novamente.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [rateLimitEmbed], ephemeral: true });
        }
        
        if (interaction.customId === 'close_ticket') {
            const { generateTranscript, saveTranscript } = require('./utils/transcriptGenerator');
            
            try {
                const channel = interaction.channel;
                
                const hasStaffRole = interaction.member.roles.cache.has(config.staffRoleId);
                const hasOtherStaffRole = interaction.member.roles.cache.some(role => config.supportRoles.includes(role.name));
                
                if (!hasStaffRole && !hasOtherStaffRole && !channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ManageChannels)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Acesso Negado')
                        .setDescription('Apenas membros da equipe podem fechar tickets!');
                    
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId('close_ticket_modal')
                    .setTitle('🔒 Fechar Ticket');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('close_reason')
                    .setLabel('Motivo do Fechamento')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Descreva o motivo do fechamento do ticket...')
                    .setRequired(true)
                    .setMaxLength(500);

                const actionRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);

            } catch (error) {
                console.error('Error handling ticket close button:', error);
            }

        } else if (interaction.customId === 'create_ticket_panel') {
            try {
                const existingTicket = interaction.guild.channels.cache.find(
                    channel => channel.name === `seg-${interaction.user.username.toLowerCase()}` && channel.type === ChannelType.GuildText
                );

                if (existingTicket) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Ticket Já Existe')
                        .setDescription(`Você já tem um ticket aberto: ${existingTicket}`)
                        .setTimestamp();

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId('ticket_reason_modal')
                    .setTitle('🛡️ Criar Ticket de Segurança');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel('Motivo do Ticket de Segurança')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Basta aguardar, que o pessoal da segurança já está a caminho!')
                    .setRequired(true)
                    .setMaxLength(500);

                const actionRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);

            } catch (error) {
                console.error('Error showing ticket modal:', error);
            }
        }
    } 
    
    // 3. Handle Modal Submissions
    else if (interaction.isModalSubmit()) {
        // Apply rate limiting
        if (isRateLimited(interaction.user.id)) {
            const rateLimitEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Rate Limited')
                .setDescription('Você está fazendo muitas requisições. Aguarde um momento antes de tentar novamente.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [rateLimitEmbed], ephemeral: true });
        }
        
        if (interaction.customId === 'ticket_reason_modal') {
            const { createTicketChannel, getNextTicketNumber } = require('./utils/ticketManager');
            
            try {
                const reason = interaction.fields.getTextInputValue('ticket_reason');
                const guild = interaction.guild;
                const user = interaction.user;

                console.log(`[TICKET MODAL] User ${user.tag} (${user.id}) attempting to create ticket`);

                // Double-check for existing ticket before creating
                const existingTicket = guild.channels.cache.find(
                    channel => channel.name === `seg-${user.username.toLowerCase()}` && channel.type === ChannelType.GuildText
                );

                if (existingTicket) {
                    console.log(`[TICKET MODAL] User ${user.tag} already has ticket: ${existingTicket.name}`);
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Ticket Já Existe')
                        .setDescription(`Você já tem um ticket aberto: ${existingTicket}`)
                        .setTimestamp();

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                console.log(`[TICKET MODAL] Creating ticket for user ${user.tag}`);
                const ticketNumber = await getNextTicketNumber();
                const channelName = `seg-${user.username.toLowerCase()}`;
                
                const ticketChannel = await createTicketChannel(guild, channelName, user, reason, ticketNumber);
                console.log(`[TICKET MODAL] Successfully created ticket: ${ticketChannel.name} for user ${user.tag}`);

                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Ticket de Segurança Criado')
                    .setDescription(`Seu ticket de segurança foi criado: ${ticketChannel}`)
                    .addFields(
                        { name: '🛡️ Número do Ticket', value: `#${ticketNumber}`, inline: true },
                        { name: '📝 Motivo', value: reason, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [successEmbed], ephemeral: true });

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle(`🛡️ Ticket de Segurança #${ticketNumber}`)
                    .setDescription(`Olá ${user}! Seu ticket de segurança foi criado com sucesso.`)
                    .addFields(
                        { name: '📝 Relatório', value: reason },
                        { name: '🔒 Confidencialidade', value: 'Este canal é privado e seguro. Apenas você e a equipe de segurança têm acesso.' },
                        { name: '⚠️ Importante', value: 'Apenas membros da equipe podem fechar este ticket.' }
                    )
                    .setFooter({ text: 'Equipe de segurança será notificada' })
                    .setTimestamp();

                const closeButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('🔒 Fechar Ticket (Apenas Staff)')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                await ticketChannel.send({    
                    content: `${user}`,    
                    embeds: [welcomeEmbed],    
                    components: [closeButton]    
                });

            } catch (error) {
                console.error('Error creating ticket from modal:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erro ao Criar Ticket')
                    .setDescription('Houve um erro ao criar seu ticket. Tente novamente ou contate um administrador.')
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } else if (interaction.customId === 'close_ticket_modal') {
            const { generateTranscript, saveTranscript } = require('./utils/transcriptGenerator');
            
            try {
                const closeReason = interaction.fields.getTextInputValue('close_reason');
                const channel = interaction.channel;

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🔒 Fechando Ticket')
                    .setDescription('Gerando transcript e fechando ticket em 3 segundos...')
                    .addFields(
                        { name: '📝 Motivo do Fechamento', value: closeReason },
                        { name: '👤 Fechado por', value: `${interaction.user}` },
                        { name: '📋 Canal', value: `#${channel.name}` }
                    )
                    .setFooter({ text: 'A equipe agradece seu contato!' })
                    .setTimestamp();

                await interaction.reply({ embeds: [confirmEmbed] });

                try {
                    const transcriptHTML = await generateTranscript(channel, interaction.user);
                    const transcriptPath = await saveTranscript(transcriptHTML, channel.name);
                    
                    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                    
                    if (!logChannel) {
                        console.error(`Log channel with ID ${config.logChannelId} not found`);
                        return;
                    }

                    const logEmbed = new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('🎫 Ticket Fechado')
                        .setDescription(`O ticket **${channel.name}** foi fechado.`)
                        .addFields(
                            { name: '👤 Fechado por', value: `${interaction.user}`, inline: true },
                            { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '📋 Canal', value: `#${channel.name}`, inline: true },
                            { name: '📝 Motivo do Fechamento', value: closeReason }
                        )
                        .setFooter({ text: 'Transcript anexado • Sistema de Tickets' })
                        .setTimestamp();

                    await logChannel.send({    
                        embeds: [logEmbed],
                        files: [{
                            attachment: transcriptPath,
                            name: `transcript-${channel.name}.html`
                        }]
                    });

                } catch (transcriptError) {
                    console.error('Error generating transcript:', transcriptError);
                }

                setTimeout(async () => {
                    try {
                        await channel.delete(`Ticket fechado por ${interaction.user.tag} - Motivo: ${closeReason}`);
                    } catch (error) {
                        console.error('Error deleting ticket channel:', error);
                    }
                }, 3000);

            } catch (error) {
                console.error('Error handling ticket close modal:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erro ao Fechar Ticket')
                    .setDescription('Houve um erro ao fechar o ticket.')
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN || config.token;
if (!token) {
    console.error('❌ No Discord token provided! Please set DISCORD_TOKEN environment variable or add token to config.json');
    process.exit(1);
}

client.login(token);

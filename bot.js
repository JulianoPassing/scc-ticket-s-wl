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

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

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

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

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
});

// Handle button interactions for ticket management
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        const { generateTranscript, saveTranscript } = require('./utils/transcriptGenerator');
        
        try {
            const channel = interaction.channel;
            
            // Check if this is a security ticket channel
            if (!channel.name.startsWith('seg-')) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Erro')
                    .setDescription('Este comando só pode ser usado em canais de segurança!');
                
                return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }

            // Check permissions - only staff can close tickets
            const hasStaffRole = interaction.member.roles.cache.has(config.staffRoleId);
            const hasOtherStaffRole = interaction.member.roles.cache.some(role => config.supportRoles.includes(role.name));
            
            if (!hasStaffRole && !hasOtherStaffRole && !channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Acesso Negado')
                    .setDescription('Apenas membros da equipe podem fechar tickets de segurança!');
                
                return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }

            // Show modal to get close reason
            const modal = new ModalBuilder()
                .setCustomId('close_ticket_modal')
                .setTitle('🔒 Fechar Ticket de Segurança');

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
            console.error('Error handling ticket close:', error);
        }
    } else if (interaction.customId === 'create_ticket_panel') {
        // Handle ticket creation from panel
        const { createTicketChannel, getNextTicketNumber } = require('./utils/ticketManager');

        
        try {
            // Check if user already has an open ticket (check for seg-@username format)
            const existingTicket = interaction.guild.channels.cache.find(
                channel => channel.name === `seg-${interaction.user.username}` && channel.type === ChannelType.GuildText
            );

            if (existingTicket) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Ticket Já Existe')
                    .setDescription(`Você já tem um ticket aberto: ${existingTicket}`)
                    .setTimestamp();

                return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }

            // Create modal for ticket reason
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
});

// Handle modal submissions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'ticket_reason_modal') {
        const { createTicketChannel, getNextTicketNumber } = require('./utils/ticketManager');
        
        try {
            const reason = interaction.fields.getTextInputValue('ticket_reason');
            const guild = interaction.guild;
            const user = interaction.user;

            // Create ticket channel
            const ticketNumber = getNextTicketNumber();
            const channelName = `seg-${user.username}`;
            
            const ticketChannel = await createTicketChannel(guild, channelName, user, reason, ticketNumber);

            // Success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Ticket de Segurança Criado')
                .setDescription(`Seu ticket de segurança foi criado: ${ticketChannel}`)
                .addFields(
                    { name: '🛡️ Número do Ticket', value: `#${ticketNumber}`, inline: true },
                    { name: '📝 Motivo', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], flags: 64 });

            // Send welcome message in ticket channel
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

            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
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
                    { name: '📝 Motivo do Fechamento', value: closeReason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed] });

            // Generate transcript
            try {
                const transcriptHTML = await generateTranscript(channel, interaction.user);
                const transcriptPath = await saveTranscript(transcriptHTML, channel.name);
                
                // Send transcript to logs channel
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                
                if (!logChannel) {
                    console.error(`Log channel with ID ${config.logChannelId} not found`);
                    return;
                }

                const logEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🎫 Ticket de Segurança Fechado')
                    .setDescription(`Ticket **${channel.name}** foi fechado`)
                    .addFields(
                        { name: '👤 Fechado por', value: `${interaction.user}`, inline: true },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '📋 Canal', value: `#${channel.name}`, inline: true },
                        { name: '📝 Motivo do Fechamento', value: closeReason }
                    )
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

            // Delete the channel after 3 seconds
            setTimeout(async () => {
                try {
                    await channel.delete(`Ticket fechado por ${interaction.user.tag} - Motivo: ${closeReason}`);
                } catch (error) {
                    console.error('Error deleting ticket channel:', error);
                }
            }, 3000);

        } catch (error) {
            console.error('Error handling ticket close:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erro ao Fechar Ticket')
                .setDescription('Houve um erro ao fechar o ticket.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
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

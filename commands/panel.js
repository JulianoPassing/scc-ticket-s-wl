const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelseg')
        .setDescription('Create a security ticket panel for users to report security issues')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            // Load configuration
            const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            
            // Check if the command is being used in a recognized security category
            const isInSecurityCategory = (channel) => {
                if (!channel.parent) return false;
                return config.securityCategories.includes(channel.parent.id);
            };
            
            if (!isInSecurityCategory(interaction.channel)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Categoria Inválida')
                    .setDescription('Este comando só pode ser usado em categorias de segurança reconhecidas!')
                    .addFields(
                        { name: '📋 Categorias Válidas', value: config.securityCategories.map(id => `<#${id}>`).join('\n') }
                    )
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const panelEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🛡️ Painel de Tickets de Segurança')
                .setDescription(
                    '**Precisa reportar um problema, denúncia ou situação confidencial?**\n\n'
                    + 'Clique no botão abaixo para abrir um ticket privado com a equipe de segurança.\n\n'
                    + '```\n✔️ Atendimento rápido e sigiloso\n🔒 Apenas a equipe de segurança terá acesso\n📄 Você receberá um registro completo da conversa\n```'
                )
                .addFields(
                    { name: 'Como funciona?', value: '1️⃣ Clique em **"🛡️ Abrir Ticket"**\n2️⃣ Descreva o motivo\n3️⃣ Aguarde o atendimento da equipe', inline: false },
                    { name: 'Atenção', value: '⚠️ **Abuso do sistema pode resultar em punição. Use apenas para assuntos sérios!**', inline: false }
                )
                .setFooter({ text: 'Sistema de Segurança • Confidencialidade garantida', iconURL: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png' })
                .setImage('https://i.imgur.com/ShgYL6s.png')
                .setTimestamp();

            const ticketButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket_panel')
                        .setLabel('🛡️ Abrir Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🛡️')
                );

            // Send the panel message directly to the channel
            await interaction.channel.send({ 
                embeds: [panelEmbed], 
                components: [ticketButton] 
            });

            // Reply ephemeral to confirm creation
            await interaction.reply({ 
                content: '✅ Painel de segurança criado com sucesso!',
                flags: 64 // ephemeral
            });

        } catch (error) {
            console.error('Error creating security panel:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erro')
                .setDescription('Houve um erro ao criar o painel de segurança.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
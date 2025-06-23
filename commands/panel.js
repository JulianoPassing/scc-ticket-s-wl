const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelseg')
        .setDescription('Create a security ticket panel for users to report security issues')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            const panelEmbed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('🛡️ Sistema de Segurança')
                .setDescription('Precisa reportar algo para a equipe de segurança? Clique no botão abaixo!\n\n🔒 **Como funciona:**\n• Clique em "Abrir Ticket"\n• Basta abrir o ticket e aguardar, em breve a equipe lhe respondera\n• Apenas a equipe de segurança terá acesso')
                .addFields(
                    { name: '👥 Acesso', value: 'Apenas staff', inline: true },
                    { name: '📊 Categoria', value: 'Segurança', inline: true }
                )
                .setFooter({ text: 'Sistema de Segurança • Confidencial e protegido' })
                .setTimestamp();

            const ticketButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket_panel')
                        .setLabel('🛡️ Abrir Ticket')
                        .setStyle(ButtonStyle.Danger)
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
            console.error('Error creating ticket panel:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erro')
                .setDescription('Houve um erro ao criar o painel de tickets.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};
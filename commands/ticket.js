const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createTicketChannel, getNextTicketNumber } = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage support tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new support ticket')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for creating the ticket')
                        .setRequired(true)
                        .setMaxLength(200)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket (use in ticket channel)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the current ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the current ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreateTicket(interaction);
                break;
            case 'close':
                await handleCloseTicket(interaction);
                break;
            case 'add':
                await handleAddUser(interaction);
                break;
            case 'remove':
                await handleRemoveUser(interaction);
                break;
        }
    },
};

async function handleCreateTicket(interaction) {
    const reason = interaction.options.getString('reason');
    const guild = interaction.guild;
    const user = interaction.user;

    try {
        // Check if user already has an open ticket (check for seg-@username format)
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === `seg-${user.username}` && channel.type === ChannelType.GuildText
        );

        if (existingTicket) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Ticket Already Exists')
                .setDescription(`You already have an open ticket: ${existingTicket}`)
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Create ticket channel
        const ticketNumber = getNextTicketNumber();
        const channelName = `seg-${user.username}`;
        
        const ticketChannel = await createTicketChannel(guild, channelName, user, reason, ticketNumber);

        // Success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Ticket Created')
            .setDescription(`Your ticket has been created: ${ticketChannel}`)
            .addFields(
                { name: '🎫 Ticket Number', value: `#${ticketNumber}`, inline: true },
                { name: '📝 Reason', value: reason, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], flags: 64 }); // 64 = ephemeral flag

        // Send welcome message in ticket channel
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🎫 Support Ticket #${ticketNumber}`)
            .setDescription(`Hello ${user}! Thank you for creating a support ticket.`)
            .addFields(
                { name: '📝 Reason', value: reason },
                { name: '📋 Instructions', value: 'Please describe your issue in detail. A support team member will assist you shortly.' }
            )
            .setFooter({ text: 'Use the button below to close this ticket when resolved' })
            .setTimestamp();

        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        await ticketChannel.send({ 
            content: `${user}`, 
            embeds: [welcomeEmbed], 
            components: [closeButton] 
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error Creating Ticket')
            .setDescription('There was an error creating your ticket. Please try again or contact an administrator.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleCloseTicket(interaction) {
    const channel = interaction.channel;
    
    // Check if this is a security ticket channel
    if (!channel.name.startsWith('seg-')) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Canal Inválido')
            .setDescription('Este comando só pode ser usado em canais de segurança!');
        
        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    // Check permissions - only staff can close tickets
    const config = require('../config.json');
    const hasStaffRole = interaction.member.roles.cache.has(config.staffRoleId);
    const hasOtherStaffRole = interaction.member.roles.cache.some(role => config.supportRoles.includes(role.name));
    
    if (!hasStaffRole && !hasOtherStaffRole && !channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ManageChannels)) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Acesso Negado')
            .setDescription('Apenas membros da equipe podem fechar tickets de segurança!');
        
        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    const confirmEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔒 Closing Ticket')
        .setDescription('This ticket will be deleted in 5 seconds...')
        .setFooter({ text: `Closed by ${interaction.user.tag}` })
        .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed] });

    // Delete the channel after 5 seconds
    setTimeout(async () => {
        try {
            await channel.delete(`Ticket closed by ${interaction.user.tag}`);
        } catch (error) {
            console.error('Error deleting ticket channel:', error);
        }
    }, 5000);
}

async function handleAddUser(interaction) {
    const channel = interaction.channel;
    const userToAdd = interaction.options.getUser('user');
    
    // Check if this is a security ticket channel
    if (!channel.name.startsWith('seg-')) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Canal Inválido')
            .setDescription('Este comando só pode ser usado em canais de segurança!');
        
        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    // Check permissions - only staff can manage tickets
    const config = require('../config.json');
    const hasStaffRole = interaction.member.roles.cache.has(config.staffRoleId);
    const hasOtherStaffRole = interaction.member.roles.cache.some(role => config.supportRoles.includes(role.name));
    
    if (!hasStaffRole && !hasOtherStaffRole && !channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ManageChannels)) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Acesso Negado')
            .setDescription('Apenas membros da equipe podem adicionar usuários em tickets de segurança!');
        
        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    try {
        await channel.permissionOverwrites.create(userToAdd, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ User Added')
            .setDescription(`${userToAdd} has been added to this ticket.`)
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error adding user to ticket:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription('There was an error adding the user to this ticket.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleRemoveUser(interaction) {
    const channel = interaction.channel;
    const userToRemove = interaction.options.getUser('user');
    
    // Check if this is a security ticket channel
    if (!channel.name.startsWith('seg-')) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Canal Inválido')
            .setDescription('Este comando só pode ser usado em canais de segurança!');
        
        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    // Check permissions - only staff can manage tickets
    const config = require('../config.json');
    const hasStaffRole = interaction.member.roles.cache.has(config.staffRoleId);
    const hasOtherStaffRole = interaction.member.roles.cache.some(role => config.supportRoles.includes(role.name));
    
    if (!hasStaffRole && !hasOtherStaffRole && !channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ManageChannels)) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Acesso Negado')
            .setDescription('Apenas membros da equipe podem remover usuários de tickets de segurança!');
        
        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    try {
        await channel.permissionOverwrites.delete(userToRemove);

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ User Removed')
            .setDescription(`${userToRemove} has been removed from this ticket.`)
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error removing user from ticket:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription('There was an error removing the user from this ticket.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

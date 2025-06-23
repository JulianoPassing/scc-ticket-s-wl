const { ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// File to store ticket counter
const ticketCounterFile = path.join(__dirname, '..', 'ticket-counter.json');

/**
 * Get the next ticket number
 * @returns {number} Next ticket number
 */
function getNextTicketNumber() {
    let counter = 1;
    
    try {
        if (fs.existsSync(ticketCounterFile)) {
            const fileContent = fs.readFileSync(ticketCounterFile, 'utf8').trim();
            if (fileContent) {
                const data = JSON.parse(fileContent);
                counter = data.counter || 1;
            }
        }
    } catch (error) {
        console.error('Error reading ticket counter:', error);
        // Reset counter file if corrupted
        try {
            fs.writeFileSync(ticketCounterFile, JSON.stringify({ counter: 1 }, null, 2));
        } catch (writeError) {
            console.error('Error resetting ticket counter:', writeError);
        }
    }

    // Increment and save
    const newCounter = counter + 1;
    try {
        fs.writeFileSync(ticketCounterFile, JSON.stringify({ counter: newCounter }, null, 2));
    } catch (error) {
        console.error('Error saving ticket counter:', error);
    }

    return counter;
}

/**
 * Create a new ticket channel with proper permissions
 * @param {Guild} guild - Discord guild
 * @param {string} channelName - Name for the channel
 * @param {User} user - User who created the ticket
 * @param {string} reason - Reason for the ticket
 * @param {number} ticketNumber - Ticket number
 * @returns {Promise<GuildChannel>} Created channel
 */
async function createTicketChannel(guild, channelName, user, reason, ticketNumber) {
    const config = require('../config.json');
    
    try {
        // Find the specific category by ID
        let ticketCategory = guild.channels.cache.get(config.categoryId);
        
        if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
            throw new Error(`Category with ID ${config.categoryId} not found or is not a category`);
        }

        // Create permission overwrites
        const permissionOverwrites = [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ],
            },
        ];

        // Add staff role by ID
        if (config.staffRoleId) {
            const staffRole = guild.roles.cache.get(config.staffRoleId);
            if (staffRole) {
                permissionOverwrites.push({
                    id: staffRole.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.ManageChannels
                    ],
                });
            }
        }

        // Add support roles to the channel (backup roles)
        for (const roleName of config.supportRoles) {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.ManageChannels
                    ],
                });
            }
        }

        // Create the ticket channel with new naming format: seg-@username
        const securityChannelName = `seg-${user.username}`;
        const ticketChannel = await guild.channels.create({
            name: securityChannelName,
            type: ChannelType.GuildText,
            parent: ticketCategory,
            topic: `Ticket de Segurança #${ticketNumber} | ${user.tag} | ${reason}`,
            permissionOverwrites: permissionOverwrites,
        });

        console.log(`Created security ticket channel: ${ticketChannel.name} for ${user.tag}`);
        return ticketChannel;

    } catch (error) {
        console.error('Error creating ticket channel:', error);
        throw error;
    }
}

/**
 * Get all open ticket channels
 * @param {Guild} guild - Discord guild
 * @returns {Collection} Collection of ticket channels
 */
function getTicketChannels(guild) {
    return guild.channels.cache.filter(channel => 
        channel.name.startsWith('ticket-') && 
        channel.type === ChannelType.GuildText
    );
}

/**
 * Check if a user has an open ticket
 * @param {Guild} guild - Discord guild
 * @param {string} userId - User ID
 * @returns {GuildChannel|null} Ticket channel if exists
 */
function getUserTicket(guild, userId) {
    return guild.channels.cache.find(channel => 
        channel.name === `ticket-${userId}` && 
        channel.type === ChannelType.GuildText
    );
}

/**
 * Clean up old ticket channels (helper function for maintenance)
 * @param {Guild} guild - Discord guild
 * @param {number} maxAgeHours - Maximum age in hours
 */
async function cleanupOldTickets(guild, maxAgeHours = 168) { // Default 7 days
    const ticketChannels = getTicketChannels(guild);
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    
    for (const [, channel] of ticketChannels) {
        try {
            // Get the last message in the channel
            const messages = await channel.messages.fetch({ limit: 1 });
            if (messages.size === 0) continue;
            
            const lastMessage = messages.first();
            const timeSinceLastMessage = now - lastMessage.createdTimestamp;
            
            if (timeSinceLastMessage > maxAge) {
                console.log(`Cleaning up old ticket: ${channel.name}`);
                await channel.delete('Automatic cleanup - inactive ticket');
            }
        } catch (error) {
            console.error(`Error cleaning up ticket ${channel.name}:`, error);
        }
    }
}

module.exports = {
    getNextTicketNumber,
    createTicketChannel,
    getTicketChannels,
    getUserTicket,
    cleanupOldTickets
};

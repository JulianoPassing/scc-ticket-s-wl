const { ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises; // Use promises for async operations
const path = require('path');

// File to store ticket counter
const ticketCounterFile = path.join(__dirname, '..', 'ticket-counter.json');

/**
 * Get the next ticket number
 * @returns {Promise<number>} Next ticket number
 */
async function getNextTicketNumber() {
    let counter = 1;
    
    try {
        const fileContent = await fs.readFile(ticketCounterFile, 'utf8');
        if (fileContent.trim()) {
            const data = JSON.parse(fileContent);
            counter = data.counter || 1;
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, start with counter = 1
            console.log('Ticket counter file not found, starting from 1');
        } else {
            console.error('Error reading ticket counter:', error);
            // Reset counter file if corrupted
            try {
                await fs.writeFile(ticketCounterFile, JSON.stringify({ counter: 1 }, null, 2));
            } catch (writeError) {
                console.error('Error resetting ticket counter:', writeError);
            }
        }
    }

    // Increment and save
    const newCounter = counter + 1;
    try {
        await fs.writeFile(ticketCounterFile, JSON.stringify({ counter: newCounter }, null, 2));
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
        console.log(`[TICKET MANAGER] Creating ticket channel: ${channelName} for user ${user.tag}`);
        
        // Single check for existing ticket before creating
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === channelName && channel.type === ChannelType.GuildText
        );

        if (existingTicket) {
            console.log(`[TICKET MANAGER] Ticket already exists: ${existingTicket.name} for user ${user.tag}`);
            throw new Error(`Ticket channel ${channelName} already exists`);
        }

        // Find the specific category by ID
        let ticketCategory = guild.channels.cache.get(config.categoryId);
        
        if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
            throw new Error(`Category with ID ${config.categoryId} not found or is not a category`);
        }

        // Create permission overwrites efficiently
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

        // Add support roles to the channel (backup roles) - optimized
        const supportRoles = config.supportRoles || [];
        const existingRoles = guild.roles.cache;
        
        for (const roleName of supportRoles) {
            const role = existingRoles.find(r => r.name === roleName);
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

        // Create the ticket channel
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: ticketCategory,
            topic: `Ticket de Segurança #${ticketNumber} | ${user.tag} | ${reason}`,
            permissionOverwrites: permissionOverwrites,
        });

        console.log(`[TICKET MANAGER] Successfully created ticket: ${ticketChannel.name} for user ${user.tag}`);
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

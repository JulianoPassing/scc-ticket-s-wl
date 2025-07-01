const fs = require('fs');
const path = require('path');

/**
 * Generate HTML transcript for a ticket channel
 * @param {TextChannel} channel - Discord channel
 * @param {User} closedBy - User who closed the ticket
 * @returns {Promise<string>} HTML content
 */
async function generateTranscript(channel, closedBy) {
    try {
        // Fetch all messages from the channel with safety limits
        const messages = [];
        let lastMessageId;
        let fetchCount = 0;
        const MAX_FETCHES = 50; // Limit to prevent infinite loops
        const MESSAGES_PER_FETCH = 100;
        
        while (fetchCount < MAX_FETCHES) {
            const options = { limit: MESSAGES_PER_FETCH };
            if (lastMessageId) {
                options.before = lastMessageId;
            }
            
            const fetchedMessages = await channel.messages.fetch(options);
            if (fetchedMessages.size === 0) break;
            
            messages.push(...fetchedMessages.values());
            lastMessageId = fetchedMessages.last().id;
            fetchCount++;
            
            // Add a small delay to prevent rate limiting
            if (fetchCount % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Sort messages by creation time (oldest first)
        messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        // Generate HTML
        const html = generateHTML(channel, messages, closedBy);
        return html;
        
    } catch (error) {
        console.error('Error generating transcript:', error);
        throw error;
    }
}

/**
 * Generate HTML content for the transcript
 */
function generateHTML(channel, messages, closedBy) {
    const channelName = channel.name;
    const guildName = channel.guild.name;
    const createdAt = new Date(channel.createdTimestamp).toLocaleString('pt-BR');
    const closedAt = new Date().toLocaleString('pt-BR');
    
    let messagesHTML = '';
    
    for (const message of messages) {
        const author = message.author;
        const timestamp = new Date(message.createdTimestamp).toLocaleString('pt-BR');
        const content = message.content || '';
        const isBot = author.bot;
        
        // Handle embeds
        let embedsHTML = '';
        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                embedsHTML += `
                <div class="embed" style="border-left: 4px solid ${embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#202225'}; background: #2f3136; padding: 12px; margin: 8px 0; border-radius: 4px;">
                    ${embed.title ? `<div class="embed-title" style="font-weight: bold; color: #ffffff; margin-bottom: 8px;">${embed.title}</div>` : ''}
                    ${embed.description ? `<div class="embed-description" style="color: #dcddde;">${embed.description}</div>` : ''}
                    ${embed.fields && embed.fields.length > 0 ? embed.fields.map(field => 
                        `<div class="embed-field" style="margin: 8px 0;">
                            <div class="embed-field-name" style="font-weight: bold; color: #ffffff; font-size: 14px;">${field.name}</div>
                            <div class="embed-field-value" style="color: #dcddde;">${field.value}</div>
                        </div>`
                    ).join('') : ''}
                </div>`;
            }
        }
        
        // Handle attachments
        let attachmentsHTML = '';
        if (message.attachments.size > 0) {
            for (const attachment of message.attachments.values()) {
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    attachmentsHTML += `<div class="attachment"><img src="${attachment.url}" alt="${attachment.name}" style="max-width: 400px; border-radius: 4px; margin: 8px 0;"></div>`;
                } else {
                    attachmentsHTML += `<div class="attachment" style="background: #2f3136; padding: 8px; border-radius: 4px; margin: 8px 0;"><a href="${attachment.url}" style="color: #00b0f4; text-decoration: none;">📎 ${attachment.name}</a></div>`;
                }
            }
        }
        
        messagesHTML += `
        <div class="message ${isBot ? 'bot-message' : 'user-message'}" style="margin: 16px 0; padding: 8px 0;">
            <div class="message-header" style="display: flex; align-items: center; margin-bottom: 4px;">
                <span class="author-name" style="font-weight: bold; color: ${isBot ? '#5865f2' : '#ffffff'}; margin-right: 8px;">${author.displayName || author.username}</span>
                ${isBot ? '<span class="bot-tag" style="background: #5865f2; color: white; font-size: 10px; padding: 2px 4px; border-radius: 3px; margin-right: 8px;">BOT</span>' : ''}
                <span class="timestamp" style="color: #72767d; font-size: 12px;">${timestamp}</span>
            </div>
            ${content ? `<div class="message-content" style="color: #dcddde; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(content)}</div>` : ''}
            ${embedsHTML}
            ${attachmentsHTML}
        </div>`;
    }
    
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${channelName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #2f3136;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .header {
            background: linear-gradient(90deg, #5865f2, #3ba55c);
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        .header .info {
            margin-top: 12px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
        }
        .content {
            padding: 24px;
        }
        .ticket-info {
            background: #40444b;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            border-left: 4px solid #5865f2;
        }
        .ticket-info h3 {
            margin: 0 0 12px 0;
            color: #ffffff;
        }
        .ticket-info .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        .ticket-info .info-item {
            background: #36393f;
            padding: 12px;
            border-radius: 4px;
        }
        .ticket-info .info-label {
            font-size: 12px;
            color: #72767d;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .ticket-info .info-value {
            color: #ffffff;
            font-weight: 500;
        }
        .messages {
            background: #40444b;
            border-radius: 8px;
            padding: 16px;
        }
        .messages h3 {
            margin: 0 0 16px 0;
            color: #ffffff;
            border-bottom: 2px solid #5865f2;
            padding-bottom: 8px;
        }
        .message {
            border-bottom: 1px solid #2f3136;
            padding: 12px 0;
        }
        .message:last-child {
            border-bottom: none;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
        }
        .author-name {
            font-weight: bold;
            margin-right: 8px;
        }
        .bot-tag {
            background: #5865f2;
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 3px;
            margin-right: 8px;
        }
        .timestamp {
            color: #72767d;
            font-size: 12px;
        }
        .message-content {
            color: #dcddde;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin-top: 4px;
        }
        .embed {
            border-left: 4px solid #202225;
            background: #2f3136;
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
        }
        .embed-title {
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .embed-description {
            color: #dcddde;
        }
        .embed-field {
            margin: 8px 0;
        }
        .embed-field-name {
            font-weight: bold;
            color: #ffffff;
            font-size: 14px;
        }
        .embed-field-value {
            color: #dcddde;
        }
        .attachment img {
            max-width: 400px;
            border-radius: 4px;
            margin: 8px 0;
        }
        .footer {
            background: #2f3136;
            padding: 16px 24px;
            text-align: center;
            border-top: 1px solid #40444b;
            color: #72767d;
            font-size: 12px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .header {
                padding: 16px;
            }
            .content {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Transcript do Ticket</h1>
            <div class="info">Servidor: ${escapeHtml(guildName)} • Canal: #${escapeHtml(channelName)}</div>
        </div>
        
        <div class="content">
            <div class="ticket-info">
                <h3>📋 Informações do Ticket</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Canal</div>
                        <div class="info-value">#${escapeHtml(channelName)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Servidor</div>
                        <div class="info-value">${escapeHtml(guildName)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Criado em</div>
                        <div class="info-value">${createdAt}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Fechado em</div>
                        <div class="info-value">${closedAt}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Fechado por</div>
                        <div class="info-value">${escapeHtml(closedBy.displayName || closedBy.username)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Total de mensagens</div>
                        <div class="info-value">${messages.length}</div>
                    </div>
                </div>
            </div>
            
            <div class="messages">
                <h3>💬 Conversas</h3>
                ${messagesHTML || '<div style="color: #72767d; text-align: center; padding: 20px;">Nenhuma mensagem encontrada</div>'}
            </div>
        </div>
        
        <div class="footer">
            Transcript gerado automaticamente pelo Sistema de Tickets • ${closedAt}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Escape HTML characters
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Save transcript to file
 * @param {string} html - HTML content
 * @param {string} channelName - Channel name
 * @returns {Promise<string>} File path
 */
async function saveTranscript(html, channelName) {
    const fs = require('fs').promises;
    const transcriptsDir = path.join(__dirname, '..', 'transcripts');
    
    try {
        // Create transcripts directory if it doesn't exist
        await fs.mkdir(transcriptsDir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('Error creating transcripts directory:', error);
        }
    }
    
    const fileName = `transcript-${channelName}-${Date.now()}.html`;
    const filePath = path.join(transcriptsDir, fileName);
    
    await fs.writeFile(filePath, html, 'utf8');
    
    return filePath;
}

module.exports = {
    generateTranscript,
    saveTranscript
};
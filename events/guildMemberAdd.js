const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { getConnection } = require('../config/database');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            // Get settings from database
            const db = await getConnection();
            const settingsQuery = `
                SELECT name, value 
                FROM settings 
                WHERE name IN ('site_url', 'discord_welcome_channel_id')
            `;
            const [settings] = await db.execute(settingsQuery);

            const settingsMap = {};
            settings.forEach(setting => {
                settingsMap[setting.name] = setting.value;
            });

            const siteUrl = settingsMap.site_url || 'https://yoursite.com';
            const welcomeChannelId = settingsMap.discord_welcome_channel_id;

            // Find welcome channel
            let welcomeChannel;
            if (welcomeChannelId) {
                welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
            }

            // Fallback to general or first text channel
            if (!welcomeChannel) {
                welcomeChannel = member.guild.channels.cache.find(
                    channel => channel.name === 'general' || channel.name === 'welcome'
                ) || member.guild.channels.cache.filter(
                    channel => channel.type === 0 && channel.permissionsFor(member.guild.members.me).has('SendMessages')
                ).first();
            }

            if (!welcomeChannel) {
                console.log('No suitable welcome channel found');
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#7289da')
                .setTitle('🛡️ Link Your Discord Account')
                .setDescription(`Welcome ${member.user.tag}! To access Phoenix Club features, please link your Discord account.`)
                .addFields(
                    {
                        name: '🔐 How to Link',
                        value: '1. Click "Link Discord Account" below\n2. Login to your Phoenix Club account\n3. Authorize Discord integration\n4. Get your roles automatically!',
                        inline: false
                    },
                    {
                        name: '✨ What you get after linking:',
                        value: '• Access to project channels\n• Member roles based on your status\n• Pizza grant roles for completed projects\n• Full community access',
                        inline: false
                    }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({
                    text: 'Phoenix Club • Click the button below to get started',
                    iconURL: member.guild.iconURL()
                })
                .setTimestamp();

            const verifyButton = new ButtonBuilder()
                .setCustomId(`verify_account_${member.id}`)
                .setLabel('🔗 Link Discord Account')
                .setStyle(ButtonStyle.Primary);

            const actionRow = new ActionRowBuilder()
                .addComponents(verifyButton);

            await welcomeChannel.send({
                content: `${member}, welcome to Phoenix Club! Please link your Discord account to get started. 🚀`,
                embeds: [embed],
                components: [actionRow]
            });

            console.log(`Welcome message sent for new member: ${member.user.tag}`);

        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    },
};

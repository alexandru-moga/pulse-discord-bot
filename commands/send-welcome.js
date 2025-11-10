const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { getConnection } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-welcome')
        .setDescription('Send a welcome message to test the welcome system')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to send welcome message to (optional)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the message to (optional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        
        await interaction.deferReply({ ephemeral: true });

        try {
            // Get settings from database
            const db = await getConnection();
            const settingsQuery = `
                SELECT name, value 
                FROM settings 
                WHERE name IN ('site_url')
            `;
            const [settings] = await db.execute(settingsQuery);
            
            const settingsMap = {};
            settings.forEach(setting => {
                settingsMap[setting.name] = setting.value;
            });
            
            const siteUrl = settingsMap.site_url || 'https://pulse.phoenixclub.ro';
            
            const embed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle('🎉 Welcome to Phoenix Club!')
                .setDescription('Welcome to our community! 🚀')
                .addFields(
                    {
                        name: '🔗 Link Your Account',
                        value: 'To get access to all features and your project roles, you need to link your Discord account with your Phoenix Club profile.',
                        inline: false
                    },
                    {
                        name: '📋 What happens next?',
                        value: '• Click the button below to visit our website\n• Log in or create your Phoenix Club account\n• Link your Discord account\n• Your roles will be automatically synced!',
                        inline: false
                    },
                    {
                        name: '❓ Need Help?',
                        value: 'If you have any issues, feel free to ask in the chat or contact our team.',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Phoenix Club • Link your account to get started',
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            
            const linkButton = new ButtonBuilder()
                .setLabel('🔗 Link Discord Account')
                .setStyle(ButtonStyle.Link)
                .setURL(`${siteUrl}/welcome.php?from=discord`);
            
            const actionRow = new ActionRowBuilder()
                .addComponents(linkButton);
            
            await targetChannel.send({
                content: `Welcome to Phoenix Club! 👋`,
                embeds: [embed],
                components: [actionRow]
            });
            
            await interaction.editReply(`✅ Welcome message sent to ${targetChannel} for ${targetUser.tag}`);
            
        } catch (error) {
            console.error('Error sending welcome message:', error);
            await interaction.editReply('❌ An error occurred while sending the welcome message.');
        }
    },
};

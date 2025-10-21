const { EmbedBuilder } = require('discord.js');
const { getConnection } = require('../config/database');
const crypto = require('crypto');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle button interactions for verification
        if (interaction.isButton() && interaction.customId.startsWith('verify_account_')) {
            try {
                const userId = interaction.customId.split('_')[2];

                // Check if the button was clicked by the right user
                if (interaction.user.id !== userId) {
                    return interaction.reply({
                        content: '❌ This verification button is not for you. Please wait for your own welcome message.',
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const db = await getConnection();

                // Check if user is already linked
                const checkQuery = 'SELECT user_id FROM discord_links WHERE discord_id = ?';
                const [existingLinks] = await db.execute(checkQuery, [interaction.user.id]);

                if (existingLinks.length > 0) {
                    return interaction.editReply({
                        content: '✅ Your Discord account is already linked! Use `/sync` to update your roles.',
                        ephemeral: true
                    });
                }

                // Generate a verification token
                const verificationToken = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

                // Store verification token in database
                const insertQuery = `
                    INSERT INTO discord_verification_tokens (discord_id, discord_username, token, expires_at, created_at)
                    VALUES (?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE token = ?, expires_at = ?, discord_username = ?
                `;

                await db.execute(insertQuery, [
                    interaction.user.id,
                    interaction.user.tag,
                    verificationToken,
                    expiresAt,
                    verificationToken,
                    expiresAt,
                    interaction.user.tag
                ]);

                // Get site URL from settings
                const settingsQuery = 'SELECT value FROM settings WHERE name = "site_url"';
                const [settingsRows] = await db.execute(settingsQuery);
                const siteUrl = settingsRows[0]?.value || 'https://phoenixclub.ro';

                // Create verification URL
                const verificationUrl = `${siteUrl}/auth/discord/verify.php?token=${verificationToken}`;

                const embed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('🔐 Verification Link Generated!')
                    .setDescription('Click the link below to verify your account. This link will expire in 30 minutes.')
                    .addFields(
                        {
                            name: '🔗 Verification Steps',
                            value: '1. Click the link below\n2. Login to your Phoenix Club account (or create one)\n3. Authorize Discord integration\n4. Your roles will sync automatically!',
                            inline: false
                        },
                        {
                            name: '⏰ Important',
                            value: 'This link expires in 30 minutes. If it expires, click the verification button again.',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Phoenix Club Verification System' })
                    .setTimestamp();

                await interaction.editReply({
                    content: `🔗 **Verification Link:** ${verificationUrl}`,
                    embeds: [embed],
                    ephemeral: true
                });

                console.log(`Verification token generated for user ${interaction.user.tag} (${interaction.user.id})`);

            } catch (error) {
                console.error('Error handling verification button:', error);

                if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ An error occurred while generating your verification link. Please try again or contact an administrator.',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ An error occurred. Please try again later.',
                        ephemeral: true
                    });
                }
            }
        }
    },
};

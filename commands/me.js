const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConnection } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Get information about your Phoenix Club profile'),

    async execute(interaction) {
        try {
            const db = await getConnection();

            // Get user data from discord_links and users tables
            const query = `
                SELECT 
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.school,
                    u.class,
                    u.role,
                    u.active_member,
                    u.join_date,
                    u.description,
                    dl.discord_username,
                    dl.linked_at
                FROM discord_links dl
                JOIN users u ON dl.user_id = u.id
                WHERE dl.discord_id = ?
            `;

            const [rows] = await db.execute(query, [interaction.user.id]);

            if (rows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Account Not Linked')
                    .setDescription('Your Discord account is not linked to the Phoenix Club database.\n\nPlease visit the Phoenix Club website to link your account.')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const userData = rows[0];

            // Get project assignments
            const projectQuery = `
                SELECT 
                    p.title,
                    pa.status,
                    pa.pizza_grant
                FROM project_assignments pa
                JOIN projects p ON pa.project_id = p.id
                JOIN users u ON pa.user_id = u.id
                JOIN discord_links dl ON u.id = dl.user_id
                WHERE dl.discord_id = ? AND pa.status != 'not_participating'
                ORDER BY 
                    CASE pa.status 
                        WHEN 'completed' THEN 1
                        WHEN 'accepted' THEN 2
                        WHEN 'waiting' THEN 3
                        WHEN 'rejected' THEN 4
                        ELSE 5
                    END,
                    p.title ASC
            `;

            const [projectRows] = await db.execute(projectQuery, [interaction.user.id]);

            const embed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle(`👋 Hello, ${userData.first_name}!`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '📧 Email', value: userData.email, inline: true },
                    { name: '🏫 School', value: userData.school || 'Not specified', inline: true },
                    { name: '📚 Class', value: userData.class || 'Not specified', inline: true },
                    {
                        name: '👑 Role',
                        value: `${userData.role || 'Member'} ${userData.active_member ? '🟢' : '🔴'}`,
                        inline: true
                    },
                    { name: '🌟 Status', value: userData.active_member ? 'Active Member' : 'Inactive Member', inline: true },
                    { name: '📅 Member Since', value: `<t:${Math.floor(new Date(userData.join_date).getTime() / 1000)}:D>`, inline: true }
                );

            if (userData.description) {
                embed.addFields({ name: '📝 About Me', value: userData.description });
            }

            if (projectRows.length > 0) {
                const acceptedProjects = projectRows.filter(p => p.status === 'accepted' || p.status === 'completed');
                const pendingProjects = projectRows.filter(p => p.status === 'waiting');
                const rejectedProjects = projectRows.filter(p => p.status === 'rejected');

                let projectSummary = '';

                if (acceptedProjects.length > 0) {
                    const pizzaCount = acceptedProjects.filter(p => p.pizza_grant === 'received').length;
                    projectSummary += `✅ **Accepted:** ${acceptedProjects.length} projects`;
                    if (pizzaCount > 0) {
                        projectSummary += ` (${pizzaCount} grants received 🍕)`;
                    }
                    projectSummary += '\n';
                }

                if (pendingProjects.length > 0) {
                    projectSummary += `⏳ **Pending:** ${pendingProjects.length} projects\n`;
                }

                if (rejectedProjects.length > 0) {
                    projectSummary += `❌ **Rejected:** ${rejectedProjects.length} projects\n`;
                }

                embed.addFields({ name: '📊 Project Summary', value: projectSummary || 'No projects yet' });

                // Show detailed project list
                if (projectRows.length <= 10) {
                    const projectDetails = projectRows.map(project => {
                        let emoji = '';
                        switch (project.status) {
                            case 'accepted':
                            case 'completed':
                                emoji = '✅';
                                break;
                            case 'waiting':
                                emoji = '⏳';
                                break;
                            case 'rejected':
                                emoji = '❌';
                                break;
                        }

                        let pizzaInfo = '';
                        if (project.pizza_grant === 'received') {
                            pizzaInfo = ' 🍕';
                        } else if (project.pizza_grant === 'applied') {
                            pizzaInfo = ' 🍕⏳';
                        }

                        return `${emoji} ${project.title}${pizzaInfo}`;
                    }).join('\n');

                    embed.addFields({ name: '🚀 All Projects', value: projectDetails });
                }
            } else {
                embed.addFields({ name: '🚀 Projects', value: 'No projects yet. Check out available projects on the website!' });
            }

            embed.setFooter({
                text: `Account linked on ${new Date(userData.linked_at).toLocaleDateString()}`
            });
            embed.setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error fetching user data:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching your information.',
                ephemeral: true
            });
        }
    },
};

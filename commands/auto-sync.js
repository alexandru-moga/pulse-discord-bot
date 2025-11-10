const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-sync')
        .setDescription('Manage the automatic role sync service')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of auto role sync'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start the automatic role sync service'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop the automatic role sync service'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Restart the automatic role sync service'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const autoRoleSync = interaction.client.autoRoleSync;

        if (!autoRoleSync) {
            return interaction.reply({
                content: '❌ Auto role sync service is not initialized. Please restart the bot.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            switch (subcommand) {
                case 'status': {
                    const status = autoRoleSync.getStatus();
                    const statusEmoji = status.isRunning ? '🟢' : '🔴';
                    const statusText = status.isRunning ? 'Running' : 'Stopped';
                    
                    const response = [
                        `${statusEmoji} **Auto Role Sync Status:** ${statusText}`,
                        '',
                        '**Configuration:**',
                        `• Guild ID: ${status.guildId || 'Not set'}`,
                        `• Poll Interval: ${status.pollIntervalMs / 1000}s`,
                        '',
                        '**Last Check Timestamps:**',
                        `• Users: ${status.lastCheckTimestamps.users ? new Date(status.lastCheckTimestamps.users).toLocaleString() : 'Never'}`,
                        `• Project Assignments: ${status.lastCheckTimestamps.project_assignments ? new Date(status.lastCheckTimestamps.project_assignments).toLocaleString() : 'Never'}`,
                        `• Discord Links: ${status.lastCheckTimestamps.discord_links ? new Date(status.lastCheckTimestamps.discord_links).toLocaleString() : 'Never'}`,
                    ].join('\n');

                    await interaction.editReply(response);
                    break;
                }

                case 'start': {
                    if (autoRoleSync.isRunning) {
                        await interaction.editReply('⚠️ Auto role sync service is already running.');
                    } else {
                        await autoRoleSync.start();
                        await interaction.editReply('✅ Auto role sync service started successfully!');
                    }
                    break;
                }

                case 'stop': {
                    if (!autoRoleSync.isRunning) {
                        await interaction.editReply('⚠️ Auto role sync service is already stopped.');
                    } else {
                        autoRoleSync.stop();
                        await interaction.editReply('🛑 Auto role sync service stopped.');
                    }
                    break;
                }

                case 'restart': {
                    autoRoleSync.stop();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await autoRoleSync.start();
                    await interaction.editReply('🔄 Auto role sync service restarted successfully!');
                    break;
                }

                default:
                    await interaction.editReply('❌ Unknown subcommand.');
            }

        } catch (error) {
            console.error('Error managing auto-sync service:', error);
            await interaction.editReply(`❌ An error occurred: ${error.message}`);
        }
    },
};

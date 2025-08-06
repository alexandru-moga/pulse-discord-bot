const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const RoleSyncService = require('../services/roleSync');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync project roles for a specific user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to sync roles for')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const roleSync = new RoleSyncService(interaction.client);

        await interaction.deferReply();

        try {
            const result = await roleSync.syncUserRoles(interaction.guildId, targetUser.id);

            if (result.success) {
                let message = `✅ Successfully synced roles for ${targetUser.tag}`;

                if (result.action === 'removed_all') {
                    message += `\n🗑️ Removed ${result.count} roles (user not linked)`;
                } else if (result.action === 'synced') {
                    if (result.added > 0 || result.removed > 0) {
                        message += `\n📊 **Summary:**`;
                        message += `\n• Added: ${result.added} roles`;
                        message += `\n• Removed: ${result.removed} roles`;

                        if (result.details) {
                            message += `\n\n🔧 **Details:**`;
                            if (result.details.projectRoles.added > 0 || result.details.projectRoles.removed > 0) {
                                message += `\n• Project roles: +${result.details.projectRoles.added}, -${result.details.projectRoles.removed}`;
                            }
                            if (result.details.membershipRoles.added > 0 || result.details.membershipRoles.removed > 0) {
                                message += `\n• Membership roles: +${result.details.membershipRoles.added}, -${result.details.membershipRoles.removed}`;
                            }
                        }
                    } else {
                        message += '\n✨ No changes needed - roles already up to date';
                    }
                }

                await interaction.editReply(message);
            } else {
                await interaction.editReply(`❌ Error syncing roles: ${result.error}`);
            }

        } catch (error) {
            console.error('Error in sync command:', error);
            await interaction.editReply('❌ An unexpected error occurred while syncing roles.');
        }
    },
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const RoleSyncService = require('../services/roleSync');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-all')
        .setDescription('Sync project roles for all users in the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const roleSync = new RoleSyncService(interaction.client);

        await interaction.deferReply();

        try {
            await interaction.editReply('🔄 Starting role sync for all users... This may take a while.');

            const result = await roleSync.syncAllUsers(interaction.guildId);

            if (result.success) {
                const message = `✅ **Role sync completed!**
                
📊 **Summary:**
• Total members: ${result.total}
• Successfully processed: ${result.successCount}
• Errors: ${result.errorCount}

The role sync process has finished. All users now have the correct project roles based on their database assignments.`;

                await interaction.editReply(message);
            } else {
                await interaction.editReply(`❌ Error during mass sync: ${result.error}`);
            }

        } catch (error) {
            console.error('Error in sync-all command:', error);
            await interaction.editReply('❌ An unexpected error occurred during the mass role sync.');
        }
    },
};

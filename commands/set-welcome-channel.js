const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConnection } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-welcome-channel')
        .setDescription('Set the welcome channel for new members')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send welcome messages to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        
        // Check if it's a text channel
        if (channel.type !== 0) {
            return interaction.reply({ 
                content: '❌ Please select a text channel.', 
                ephemeral: true 
            });
        }
        
        await interaction.deferReply();

        try {
            const db = await getConnection();
            
            // Update the welcome channel setting in database
            const updateQuery = `
                UPDATE settings 
                SET value = ? 
                WHERE name = 'discord_welcome_channel_id'
            `;
            
            await db.execute(updateQuery, [channel.id]);
            
            await interaction.editReply(`✅ Welcome channel set to ${channel}! New members will receive welcome messages there.`);
            
        } catch (error) {
            console.error('Error setting welcome channel:', error);
            await interaction.editReply('❌ An error occurred while setting the welcome channel.');
        }
    },
};

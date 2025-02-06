import { SlashCommandBuilder } from '@discordjs/builders';
import { syncRoles } from '../sheets.js';

export const data = new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sincronizează rolurile pentru toți membrii (ADMIN ONLY)');

export async function execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({
            content: '❌ Nu ai permisiunea să folosești această comandă!',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });
    
    try {
        const members = await interaction.guild.members.fetch();
        let count = 0;
        
        for (const [_, member] of members) {
            await syncRoles(member);
            count++;
        }
        
        await interaction.editReply(`✅ Sincronizare completă! Actualizat ${count} membri.`);
    } catch (error) {
        console.error('Sync error:', error);
        await interaction.editReply('❌ A apărut o eroare la sincronizare!');
    }
}
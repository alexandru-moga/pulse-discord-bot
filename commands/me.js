import { getUserData } from '../database.js'; // Changed from sheets.js
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('me')
    .setDescription('Afișează profilul tău de membru');

export async function execute(interaction) {
    try {
        const userData = await getUserData(interaction.user.id);
        if (!userData) {
            return interaction.reply({
                content: "❌ Profilul tău nu a fost găsit în sistem!",
                ephemeral: true
            });
        }
        
        const response = [
            `**Profilul tău** 👤`,
            `Nume complet: ${userData.nume} ${userData.prenume}`,
            `Școală: ${userData.scoala || 'Nespecificat'}`,
            `Clasă: ${userData.clasa || 'Nespecificat'}`,
            `Funcție: ${userData.functie || 'Membru'}`,
            `Membru HCB: ${userData.hcb}`,
            `Data nașterii: ${userData.dataNasterii || 'Nespecificată'}`,
            `Data înscrierii: ${userData.applyDate || 'Nespecificată'}`,
            `Descriere: ${userData.descriere}`,
            `\n**Evenimente participante** 🎉`,
            ...(userData.events?.length > 0
                ? userData.events.map(e => `▸ ${e}`)
                : ['Niciun eveniment înscris']),
                `\n**Contact** 📞`,
                `Email: ${userData.email}`,
                `Telefon: ${userData.telefon}`
              ].join('\n');
        
        await interaction.reply({
            content: response,
            flags: MessageFlags.Ephemeral 
        });
    } catch (error) {
        console.error('Eroare la comanda /me:', error);
        await interaction.reply({
            content: '⚠️ A apărut o eroare la încărcarea profilului',
            flags: MessageFlags.Ephemeral 
        });
    }
}

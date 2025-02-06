import { getUserData } from '../sheets.js';
import { SlashCommandBuilder } from '@discordjs/builders';

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
            `\n**Evenimente participante** 🎉`,
            ...(userData.events?.length > 0 
                ? userData.events.map(e => `▸ ${e}`)
                : ['Niciun eveniment înscris']),
            `\n**Date de contact** 📇`,
            `✉️ Email: ${userData.email || 'Nespecificat'}`,
            `📱 Telefon: ${userData.telefon || 'Nespecificat'}`
        ].join('\n');

        await interaction.reply({
            content: response,
            ephemeral: true
        });

    } catch (error) {
        console.error('Eroare la comanda /me:', error);
        await interaction.reply({
            content: '⚠️ A apărut o eroare la încărcarea profilului',
            ephemeral: true
        });
    }
}
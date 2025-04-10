import { getUserData } from '../database.js'; // Changed from sheets.js
import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('Vezi informații despre un membru')
    .addUserOption(option =>
        option.setName('user')
        .setDescription('Membrul vizat')
        .setRequired(true)
    );

export async function execute(interaction) {
    const user = interaction.options.getUser('user');
    try {
        const userData = await getUserData(user.id);
        if (!userData) {
            return interaction.reply({
                content: "Utilizatorul nu a fost găsit!",
                ephemeral: true
            });
        }
        
        const response = [
            `**Profil Membru** 👤`,
            `Nume: ${userData.nume} ${userData.prenume}`,
            `Școală: ${userData.scoala}`,
            `Clasa: ${userData.clasa}`,
            `Data nașterii: ${userData.dataNasterii}`,
            `Data înscrierii: ${userData.applyDate}`,
            `Funcție: ${userData.functie}`,
            `Membru HCB: ${userData.hcb}`,
            `Descriere: ${userData.descriere}`,
            `\n**Evenimente** 🎉`,
            ...(userData.events?.length > 0
                ? userData.events.map(e => `▸ ${e}`)
                : ['Niciun eveniment înscris'])
            `\n**Contact** 📞`,
            `Email: ${userData.email}`,
            `Telefon: ${userData.telefon}`
        ].join('\n');
        
        await interaction.reply({
            content: response,
            ephemeral: true
        });
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "A apărut o eroare!",
            ephemeral: true
        });
    }
}

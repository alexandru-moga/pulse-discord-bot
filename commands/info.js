import { getUserData } from '../sheets.js';

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  
  try {
    const userData = await getUserData(user.id);
    
    if (!userData) {
      return interaction.reply({
        content: "Utilizatorul nu a fost găsit!",
        flags: 64
      });
    }

    const response = [
        `**Profil membru** 📋`,
        `Nume: ${userData.nume} ${userData.prenume}`,
        `Discord: ${user.tag}`,
        `Școală: ${userData.scoala}`,
        `Clasa: ${userData.clasa}`,
        `Funcție: ${userData.functie}`,
        `Banca: ${userData.banca}`,
        `\n**Date contact** 📞`,
        `Email: ${userData.email}`,
        `Telefon: ${userData.telefon}`
    ].join('\n');

    await interaction.reply({
      content: response,
      flags: 64
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "A apărut o eroare!",
      flags: 64
    });
  }
}

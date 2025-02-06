import { getUserData } from '../sheets.js';

export async function execute(interaction) {
  try {
    const userData = await getUserData(interaction.user.id);
    
    if (!userData) {
      return interaction.reply({
        content: "Nu te-am găsit în baza de date!",
        flags: 64
      });
    }

    const response = [
      `**Profilul tău** 👤`,
      `Nume: ${userData.nume} ${userData.prenume}`,
      `Școală: ${userData.scoala}`,
      `Clasa: ${userData.clasa}`,
      `Data nașterii: ${userData.dataNasterii}`,
      `Data înscrierii: ${userData.applyDate}`,
      `Funcție: ${userData.functie}`,
      `Membru HCB: ${userData.hcb}`,
      `Descriere: ${userData.descriere}`,

      `\n**Evenimente** 🎉`,
      ...(userData.events.length > 0 
          ? userData.events.map(e => `• ${e}`)
          : ['Niciun eveniment înscris'])
      ,
      `\n**Contact** 📞`,
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

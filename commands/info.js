const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConnection } = require('../config/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Vezi informații despre un membru')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Membrul vizat')
        .setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    try {
      const db = await getConnection();

      // Obțineți datele utilizatorului din tabelele discord_links și users
      const query = `
                SELECT 
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.school,
                    u.class,
                    u.role,
                    u.active_member,
                    u.join_date,
                    u.description,
                    dl.discord_username,
                    dl.linked_at
                FROM discord_links dl
                JOIN users u ON dl.user_id = u.id
                WHERE dl.discord_id = ?
            `;

      const [rows] = await db.execute(query, [user.id]);

      if (rows.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Utilizator Necunoscut')
          .setDescription(`${user.tag} nu este legat de baza de date a Phoenix Club.`)
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const userData = rows[0];

      // Obțineți atribuțiile proiectului
      const projectQuery = `
                SELECT 
                    p.title,
                    pa.status,
                    pa.pizza_grant
                FROM project_assignments pa
                JOIN projects p ON pa.project_id = p.id
                JOIN users u ON pa.user_id = u.id
                JOIN discord_links dl ON u.id = dl.user_id
                WHERE dl.discord_id = ? AND pa.status != 'not_participating'
                ORDER BY pa.status DESC, p.title ASC
            `;

      const [projectRows] = await db.execute(projectQuery, [user.id]);

      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle(`👤 ${userData.first_name} ${userData.last_name}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '📧 Email', value: userData.email, inline: true },
          { name: '🏫 Școală', value: userData.school || 'Nespecificat', inline: true },
          { name: '📚 Clasa', value: userData.class || 'Nespecificat', inline: true },
          {
            name: '👑 Funcție',
            value: `${userData.role || 'Membru'} ${userData.active_member ? '🟢' : '🔴'}`,
            inline: true
          },
          { name: '🌟 Status', value: userData.active_member ? 'Membru Activ' : 'Membru Inactiv', inline: true },
          { name: '📅 Înscris pe', value: `<t:${Math.floor(new Date(userData.join_date).getTime() / 1000)}:D>`, inline: true }
        );

      if (userData.description) {
        embed.addFields({ name: '📝 Descriere', value: userData.description });
      }

      if (projectRows.length > 0) {
        const projectInfo = projectRows.map(project => {
          let status = project.status;
          let emoji = '';

          switch (status) {
            case 'accepted':
              emoji = '✅';
              break;
            case 'waiting':
              emoji = '⏳';
              break;
            case 'rejected':
              emoji = '❌';
              break;
            case 'completed':
              emoji = '🏆';
              break;
          }

          let pizzaInfo = '';
          if (project.pizza_grant === 'received') {
            pizzaInfo = ' 🍕';
          } else if (project.pizza_grant === 'applied') {
            pizzaInfo = ' 🍕⏳';
          }

          return `${emoji} ${project.title}${pizzaInfo}`;
        }).join('\n');

        embed.addFields({ name: '🚀 Proiecte', value: projectInfo });
      }

      embed.setFooter({
        text: `Legat la Discord pe ${new Date(userData.linked_at).toLocaleDateString()}`
      });
      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Eroare la obținerea informațiilor utilizatorului:', error);
      await interaction.reply({
        content: '❌ A apărut o eroare în timpul obținerii informațiilor utilizatorului.',
        ephemeral: true
      });
    }
  },
};
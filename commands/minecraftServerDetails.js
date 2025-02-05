const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'minecraft-server',
    description: 'Send the Minecraft server details embed message',
    async execute(channel) {
        const serverDetailsEmbed = new EmbedBuilder()
            .setTitle('Minecraft Server Details')
            .setDescription('**IP Address**: IP\n**Modpack**: NAME')
            .setColor('#974A0C')
            .setThumbnail('https://link.com.image.jpg');

        await channel.send({ embeds: [serverDetailsEmbed] });
    },
};
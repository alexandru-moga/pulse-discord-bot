const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'rules',
    description: 'Send the rules embed message',
    async execute(channel) {
        const embedMessage = new EmbedBuilder()
            .setColor(0xF08000)
            .setTitle('Rules')
            .setDescription('• RULE1.\n • RULE2.\n• RULE3.\n• RULE4.\n• RULE5.')
            .setTimestamp();

        await channel.send({ embeds: [embedMessage] });
    },
};
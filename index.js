const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes } = require('discord.js');
require('dotenv').config();
const rulesCommand = require('./commands/rules');
const minecraftServerDetailsCommand = require('./commands/minecraftServerDetails');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const commands = [
        {
            name: 'message',
            description: 'Send a message to a specified channel',
            options: [
                {
                    name: 'type',
                    type: 3,
                    description: 'The type of message to send (e.g., rules or minecraft-server)',
                    required: true,
                    choices: [
                        { name: 'rules', value: 'rules' },
                        { name: 'minecraft-server', value: 'minecraft-server' },
                    ],
                },
                {
                    name: 'channel',
                    type: 7,
                    description: 'The channel to send the message to',
                    required: true,
                },
            ],
        },
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');

        const guildId = process.env.DISCORD_CHANNEL_ID;
        if (!guildId) {
            throw new Error('DISCORD_CHANNEL_ID is not defined in the environment variables.');
        }

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: [] },
        );

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, member } = interaction;

    if (commandName === 'message') {
        const type = options.getString('type');
        const channel = options.getChannel('channel');

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        if (type === 'rules') {
            await rulesCommand.execute(channel);
            await interaction.reply({ content: `Rules have been sent to ${channel}.`, ephemeral: true });
        } else if (type === 'minecraft-server') {
            await minecraftServerDetailsCommand.execute(channel);
            await interaction.reply({ content: `Minecraft server details have been sent to ${channel}.`, ephemeral: true });
        }
    }
});

client.login(process.env.BOT_TOKEN);
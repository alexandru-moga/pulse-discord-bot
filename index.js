import { Client, GatewayIntentBits, ActivityType, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { initSheet } from './sheets.js';
import * as meCommand from './commands/me.js';
import * as infoCommand from './commands/info.js';
import { messageCreate } from './events/messageCreate.js';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands() {
    try {
        // First clear all existing commands
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [] }
        );
        console.log('Cleared all existing commands');

        // Then register new commands
        const commands = [
            {
                name: 'me',
                description: 'Vezi profilul tău'
            },
            {
                name: 'info',
                description: 'Vezi informații despre un membru',
                options: [{
                    name: 'user',
                    description: 'Membrul vizat',
                    type: 6,
                    required: true
                }]
            }
        ];

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Successfully registered new commands');
    } catch (error) {
        console.error('Command registration error:', error);
    }
}


client.once('ready', async () => {
    await initSheet();
    console.log(`Logged in as ${client.user.tag}!`);
    
    client.user.setActivity({ 
      name: 'hackclub.com',
      type: ActivityType.Watching
    });
    
    await registerCommands();
  });

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    try {
        switch(interaction.commandName) {
            case 'me':
                await meCommand.execute(interaction);
                break;
            case 'info':
                await infoCommand.execute(interaction);
                break;
        }
    } catch (error) {
        console.error('Command error:', error);
        interaction.reply({ 
            content: 'An error occurred', 
            flags: 64 
        });
    }
});

client.on('messageCreate', messageCreate);

client.login(process.env.TOKEN);
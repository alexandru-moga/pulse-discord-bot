import { Client, GatewayIntentBits, ActivityType, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { initDatabase, initializeCoreRoles, syncRoles } from './database.js'; // Changed from sheets.js
import * as meCommand from './commands/me.js';
import * as infoCommand from './commands/info.js';
import * as syncCommand from './commands/sync.js';
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

let syncInterval;

async function registerCommands() {
    try {
        // Get all command data properly
        const commands = [
            (await import('./commands/me.js')).data.toJSON(),
            (await import('./commands/info.js')).data.toJSON(),
            (await import('./commands/sync.js')).data.toJSON()
        ];
        console.log('Registering commands:', commands.map(c => c.name));
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Commands registered successfully');
    } catch (error) {
        console.error('Command registration failed:', error);
    }
}

async function syncAllMembers(guild) {
    try {
        const members = await guild.members.fetch();
        let count = 0;
        for (const [_, member] of members) {
            await syncRoles(member);
            count++;
        }
        console.log(`Synced roles for ${count} members`);
    } catch (error) {
        console.error('Auto-sync error:', error);
    }
}

client.once('ready', async () => {
    await initDatabase(); // Changed from initSheet() to initDatabase()
    console.log(`Logged in as ${client.user.tag}!`);
    const guild = client.guilds.cache.first();
    if (guild) {
        await initializeCoreRoles(guild);
        console.log('System roles initialized');
        
        // Start auto-sync
        syncInterval = setInterval(() => syncAllMembers(guild), 3600000); // Every hour
    }
    
    client.user.setActivity({
        name: 'phoenixclub.ro',
        type: ActivityType.Watching
    });
    
    await registerCommands();
});

// Command handling remains the same as in your original file
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
            case 'sync':
                await syncCommand.execute(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Comandă necunoscută',
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Command error:', error);
        await interaction.reply({
            content: 'A apărut o eroare',
            ephemeral: true
        });
    }
});

client.on('messageCreate', messageCreate);

// Cleanup on shutdown
process.on('SIGINT', () => {
    clearInterval(syncInterval);
    client.destroy();
});

client.login(process.env.TOKEN);
const { Client, Collection, GatewayIntentBits, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { connectToDatabase, getConnection } = require('./config/database');
const BotAPI = require('./api/server');
require('dotenv').config();

// Create a new client instance with only the necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

// Create a collection for commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`Loaded command: ${command.data.name}`);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.name && typeof event.execute === 'function') {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`Loaded event: ${event.name}`);
    } else {
        console.log(`[WARNING] The event at ${filePath} is missing a required "name" or "execute" property.`);
    }
}

// Function to get Discord credentials from database
async function getDiscordCredentials() {
    try {
        const db = await getConnection();
        const query = `
            SELECT name, value 
            FROM settings 
            WHERE name IN ('discord_bot_token', 'discord_client_id', 'discord_guild_id', 'discord_client_secret')
        `;
        const [rows] = await db.execute(query);

        const settings = {};
        rows.forEach(row => {
            settings[row.name] = row.value;
        });

        // Validate required settings
        if (!settings.discord_bot_token) {
            throw new Error('Discord bot token not found in database settings');
        }
        if (!settings.discord_client_id) {
            throw new Error('Discord client ID not found in database settings');
        }
        if (!settings.discord_guild_id) {
            throw new Error('Discord guild ID not found in database settings');
        }

        return {
            token: settings.discord_bot_token,
            clientId: settings.discord_client_id,
            guildId: settings.discord_guild_id,
            clientSecret: settings.discord_client_secret
        };
    } catch (error) {
        console.error('Failed to load Discord credentials from database:', error.message);
        throw error;
    }
}

// Register commands function
async function registerCommands() {
    try {
        const credentials = await getDiscordCredentials();
        const rest = new REST({ version: '10' }).setToken(credentials.token);

        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        await rest.put(
            Routes.applicationGuildCommands(credentials.clientId, credentials.guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
    } catch (error) {
        console.error('Command registration failed:', error.message);

        if (error.code === 50001) {
            console.log('\n🔧 SOLUTION: Bot is missing access to register commands:');
            console.log('1. Make sure the bot is added to your Discord server');
            console.log('2. The bot needs "applications.commands" scope when being invited');
            console.log('3. Go to Discord Developer Portal and re-invite with proper permissions');
        } else if (error.code === 10002) {
            console.log('\n🔧 SOLUTION: Unknown application - check your client ID in database');
        }
    }
}

// Event listener for when the client is ready
client.once('ready', async () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);

    // Set bot activity
    client.user.setActivity('Phoenix Club projects', { type: ActivityType.Watching });

    // Register slash commands
    await registerCommands();

    // Start API server
    const botAPI = new BotAPI(client);
    botAPI.start();
});

// Event listener for interactions (commands and buttons)
client.on('interactionCreate', async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);

            const errorMessage = '❌ There was an error while executing this command!';

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
    // Handle button interactions (verification buttons)
    else if (interaction.isButton()) {
        // Load the interactionCreate event handler
        try {
            const buttonHandler = require('./events/interactionCreate');
            await buttonHandler.execute(interaction);
        } catch (error) {
            console.error('Error handling button interaction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    ephemeral: true
                });
            }
        }
    }
});

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Login to Discord
async function startBot() {
    try {
        console.log('🔄 Starting Discord bot...');

        // Connect to database first
        await connectToDatabase();
        console.log('✅ Database connection established');

        // Get credentials from database
        const credentials = await getDiscordCredentials();

        console.log('🔑 Discord credentials loaded from database');
        console.log(`🆔 Client ID: ${credentials.clientId}`);
        console.log(`🏠 Guild ID: ${credentials.guildId}`);
        console.log(`🔐 Client Secret: ${credentials.clientSecret ? 'Set' : 'Not set'}`);

        await client.login(credentials.token);
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);

        if (error.message.includes('disallowed intents')) {
            console.log('\n🔧 SOLUTION: Go to Discord Developer Portal:');
            console.log('1. Visit https://discord.com/developers/applications');
            console.log('2. Select your bot application');
            console.log('3. Go to the "Bot" section');
            console.log('4. Under "Privileged Gateway Intents", enable:');
            console.log('   - Server Members Intent');
            console.log('5. Save changes and restart the bot');
        } else if (error.message.includes('token') || error.message.includes('credentials')) {
            console.log('\n🔧 SOLUTION: Update Discord credentials in database:');
            console.log('1. Check your database settings table');
            console.log('2. Ensure these settings exist with correct values:');
            console.log('   - discord_bot_token');
            console.log('   - discord_client_id');
            console.log('   - discord_guild_id');
            console.log('   - discord_client_secret');
            console.log('3. Get new values from Discord Developer Portal if needed');
        } else if (error.message.includes('database')) {
            console.log('\n🔧 SOLUTION: Check database connection:');
            console.log('1. Ensure MySQL/MariaDB is running');
            console.log('2. Check database credentials in .env file');
            console.log('3. Ensure database "s41_phoenix" exists and is accessible');
        }

        process.exit(1);
    }
}

startBot();
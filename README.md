# Phoenix Club Discord Bot

Discord bot for managing members, roles, and project assignments for Phoenix Club.

## ✨ Features

- 🔐 **Discord Account Linking**: Welcome new members and link their accounts
- 🔄 **Automatic Role Sync**: Automatically syncs roles when database changes occur
- 👥 **Member Management**: Manage roles based on membership status
- 📊 **Project Roles**: Assign roles based on project participation and pizza grants
- 🤖 **Slash Commands**: Modern Discord slash command interface
- 🌐 **Web Integration**: REST API for website integration

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=s41_phoenix
DB_USER=root
DB_PASSWORD=your_password
```

### Running the Bot

```bash
npm start
```

The bot will:
1. Connect to the database
2. Load Discord credentials from the `settings` table
3. Register slash commands
4. Start the auto role sync service
5. Start the API server

## 📋 Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/sync` | Sync roles for a user | Manage Roles |
| `/sync-all` | Sync roles for all users | Manage Roles |
| `/auto-sync status` | Check auto-sync service status | Manage Roles |
| `/auto-sync start` | Start auto-sync service | Manage Roles |
| `/auto-sync stop` | Stop auto-sync service | Manage Roles |
| `/auto-sync restart` | Restart auto-sync service | Manage Roles |
| `/send-welcome` | Send welcome message | Manage Messages |
| `/info` | Get user information | Everyone |
| `/me` | Get your own information | Everyone |

## 🔄 Auto Role Sync

The bot now **automatically syncs Discord roles** when changes occur in the database!

**What gets synced automatically:**
- ✅ User membership roles (Member, Co-leader, Leader)
- ✅ User active/inactive status
- ✅ Project assignment roles
- ✅ Pizza grant roles
- ✅ New Discord account links

**How it works:**
- Checks database every 10 seconds for changes
- Only syncs users who have been affected by changes
- Efficient and rate-limit safe

**Learn more:** See [AUTO_ROLE_SYNC.md](AUTO_ROLE_SYNC.md) for complete documentation.

## 📁 Project Structure

```
pulse-discord-bot/
├── commands/          # Slash command implementations
├── events/            # Discord event handlers
├── services/          # Core services (role sync, auto-sync)
├── api/               # REST API server
├── config/            # Database configuration
├── dashboard/         # Admin dashboard PHP files
├── auth/              # Authentication helpers
└── index.js           # Main bot entry point
```

## 🔧 Requirements

- Node.js 16.x or higher
- MySQL/MariaDB database
- Discord Bot Token (from Discord Developer Portal)
- Discord Server with appropriate permissions

## 📦 Dependencies

```json
{
  "discord.js": "^14.x",
  "dotenv": "^16.x",
  "mysql2": "^3.x",
  "express": "^4.x"
}
```

## 🔐 Bot Permissions

Required Discord permissions:
- Manage Roles
- Send Messages
- Read Messages
- View Channels

Required intents:
- Guilds
- Guild Members

## 🌐 Database Integration

The bot uses a shared MySQL database with the Phoenix Club website. All Discord credentials and settings are stored in the `settings` table.

**Key Tables:**
- `users` - User information and roles
- `discord_links` - Discord account links
- `project_assignments` - Project participation
- `projects` - Project information with Discord role IDs
- `settings` - Bot configuration

## 📝 Documentation

- [Auto Role Sync Documentation](AUTO_ROLE_SYNC.md) - Complete guide to automatic role syncing
- [Quick Start Guide](QUICK_START_AUTO_SYNC.md) - Get started with auto role sync

## 🤝 Contributing

This is a private project for Phoenix Club. For questions or issues, contact the development team.

## 📜 License

Private - Phoenix Club © 2025

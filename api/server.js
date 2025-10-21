const express = require('express');
const { getConnection } = require('../config/database');
const RoleSyncService = require('../services/roleSync');

class BotAPI {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.port = process.env.BOT_API_PORT || 3000;
        this.roleSync = new RoleSyncService(client);
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        
        // Simple authentication middleware
        this.app.use((req, res, next) => {
            const providedToken = req.headers['x-bot-token'];
            
            // Skip auth for health check
            if (req.path === '/health') {
                return next();
            }
            
            if (!providedToken) {
                return res.status(401).json({ error: 'Missing bot token' });
            }
            
            // Here you could validate the token against your database
            // For now, we'll just check if it's not empty
            if (providedToken.length < 10) {
                return res.status(401).json({ error: 'Invalid bot token' });
            }
            
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                bot: this.client.user ? this.client.user.tag : 'Not logged in',
                timestamp: new Date().toISOString()
            });
        });

        // Sync single user roles
        this.app.post('/api/sync-user', async (req, res) => {
            try {
                const { userId } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'User ID is required' });
                }

                const db = await getConnection();
                const guildQuery = 'SELECT value FROM settings WHERE name = "discord_guild_id"';
                const [guildRows] = await db.execute(guildQuery);
                
                if (guildRows.length === 0) {
                    return res.status(500).json({ error: 'Guild ID not configured' });
                }
                
                const guildId = guildRows[0].value;
                const result = await this.roleSync.syncUserRoles(guildId, userId);
                
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'User roles synced successfully',
                        data: result
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error
                    });
                }
                
            } catch (error) {
                console.error('API Error syncing user:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Internal server error' 
                });
            }
        });

        // Sync all users
        this.app.post('/api/sync-all', async (req, res) => {
            try {
                const db = await getConnection();
                const guildQuery = 'SELECT value FROM settings WHERE name = "discord_guild_id"';
                const [guildRows] = await db.execute(guildQuery);
                
                if (guildRows.length === 0) {
                    return res.status(500).json({ error: 'Guild ID not configured' });
                }
                
                const guildId = guildRows[0].value;
                const result = await this.roleSync.syncAllUsers(guildId);
                
                res.json({
                    success: true,
                    message: 'All users synced',
                    data: result
                });
                
            } catch (error) {
                console.error('API Error syncing all users:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Internal server error' 
                });
            }
        });

        // Get user info
        this.app.get('/api/user/:userId', async (req, res) => {
            try {
                const { userId } = req.params;
                
                const db = await getConnection();
                const userQuery = `
                    SELECT 
                        u.first_name,
                        u.last_name,
                        u.role,
                        u.active_member,
                        dl.discord_username
                    FROM users u
                    JOIN discord_links dl ON u.id = dl.user_id
                    WHERE dl.discord_id = ?
                `;
                
                const [userRows] = await db.execute(userQuery, [userId]);
                
                if (userRows.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                res.json({
                    success: true,
                    user: userRows[0]
                });
                
            } catch (error) {
                console.error('API Error getting user info:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Internal server error' 
                });
            }
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 Bot API server running on port ${this.port}`);
        });
    }
}

module.exports = BotAPI;

const { getConnection } = require('../config/database');
const RoleSyncService = require('./roleSync');

/**
 * AutoRoleSync Service
 * Automatically syncs Discord roles when database changes are detected
 */
class AutoRoleSyncService {
    constructor(client) {
        this.client = client;
        this.roleSyncService = new RoleSyncService(client);
        this.isRunning = false;
        this.pollInterval = null;
        this.lastCheckTimestamps = {
            users: null,
            project_assignments: null,
            discord_links: null
        };
        
        // Configuration
        this.config = {
            pollIntervalMs: 10000, // Check every 10 seconds
            batchSyncDelay: 1000, // Wait 1 second before syncing after detecting changes
        };
    }

    /**
     * Start the auto-sync service
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Auto role sync service is already running');
            return;
        }

        try {
            const db = await getConnection();
            const guildIdQuery = 'SELECT value FROM settings WHERE name = "discord_guild_id"';
            const [rows] = await db.execute(guildIdQuery);
            
            if (rows.length === 0) {
                throw new Error('Discord guild ID not found in settings');
            }
            
            this.guildId = rows[0].value;
            
            // Initialize last check timestamps
            await this.initializeTimestamps();
            
            this.isRunning = true;
            
            // Start polling
            this.pollInterval = setInterval(() => {
                this.checkForChanges().catch(error => {
                    console.error('Error in auto role sync polling:', error);
                });
            }, this.config.pollIntervalMs);
            
            console.log('✅ Auto role sync service started');
            console.log(`   - Polling interval: ${this.config.pollIntervalMs}ms`);
            console.log(`   - Guild ID: ${this.guildId}`);
            
        } catch (error) {
            console.error('❌ Failed to start auto role sync service:', error);
            throw error;
        }
    }

    /**
     * Stop the auto-sync service
     */
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isRunning = false;
        console.log('🛑 Auto role sync service stopped');
    }

    /**
     * Initialize last check timestamps
     */
    async initializeTimestamps() {
        const db = await getConnection();
        const now = new Date();
        
        // Get latest modification times from each relevant table
        const queries = [
            { table: 'users', timestamp: 'updated_at' },
            { table: 'project_assignments', timestamp: 'updated_at' },
            { table: 'discord_links', timestamp: 'linked_at' }
        ];
        
        for (const { table, timestamp } of queries) {
            try {
                const query = `SELECT MAX(${timestamp}) as last_update FROM ${table}`;
                const [rows] = await db.execute(query);
                this.lastCheckTimestamps[table] = rows[0].last_update || now;
            } catch (error) {
                console.warn(`Could not get timestamp for ${table}, using current time`);
                this.lastCheckTimestamps[table] = now;
            }
        }
        
        console.log('📅 Initialized timestamps for auto role sync');
    }

    /**
     * Check for database changes
     */
    async checkForChanges() {
        try {
            const db = await getConnection();
            const changedUsers = new Set();
            
            // Check users table for role/status changes
            const usersQuery = `
                SELECT u.id, dl.discord_id
                FROM users u
                JOIN discord_links dl ON u.id = dl.user_id
                WHERE u.updated_at > ?
            `;
            const [userChanges] = await db.execute(usersQuery, [this.lastCheckTimestamps.users]);
            
            if (userChanges.length > 0) {
                console.log(`📝 Detected ${userChanges.length} user changes`);
                userChanges.forEach(user => changedUsers.add(user.discord_id));
                this.lastCheckTimestamps.users = new Date();
            }
            
            // Check project_assignments table for assignment/status changes
            const assignmentsQuery = `
                SELECT DISTINCT dl.discord_id
                FROM project_assignments pa
                JOIN discord_links dl ON pa.user_id = dl.user_id
                WHERE pa.updated_at > ?
            `;
            const [assignmentChanges] = await db.execute(assignmentsQuery, [this.lastCheckTimestamps.project_assignments]);
            
            if (assignmentChanges.length > 0) {
                console.log(`📝 Detected ${assignmentChanges.length} project assignment changes`);
                assignmentChanges.forEach(user => changedUsers.add(user.discord_id));
                this.lastCheckTimestamps.project_assignments = new Date();
            }
            
            // Check discord_links table for new links/unlinks
            const linksQuery = `
                SELECT discord_id
                FROM discord_links
                WHERE linked_at > ?
            `;
            const [linkChanges] = await db.execute(linksQuery, [this.lastCheckTimestamps.discord_links]);
            
            if (linkChanges.length > 0) {
                console.log(`📝 Detected ${linkChanges.length} Discord link changes`);
                linkChanges.forEach(user => changedUsers.add(user.discord_id));
                this.lastCheckTimestamps.discord_links = new Date();
            }
            
            // Sync roles for affected users
            if (changedUsers.size > 0) {
                console.log(`🔄 Auto-syncing roles for ${changedUsers.size} users...`);
                await this.syncAffectedUsers(Array.from(changedUsers));
            }
            
        } catch (error) {
            console.error('Error checking for database changes:', error);
        }
    }

    /**
     * Sync roles for affected users
     */
    async syncAffectedUsers(discordIds) {
        let successCount = 0;
        let errorCount = 0;
        
        for (const discordId of discordIds) {
            try {
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const result = await this.roleSyncService.syncUserRoles(this.guildId, discordId);
                
                if (result.success) {
                    successCount++;
                    if (result.added > 0 || result.removed > 0) {
                        console.log(`   ✅ Synced ${discordId}: +${result.added} roles, -${result.removed} roles`);
                    }
                } else {
                    errorCount++;
                    console.error(`   ❌ Failed to sync ${discordId}: ${result.error}`);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`   ❌ Error syncing ${discordId}:`, error.message);
            }
        }
        
        console.log(`✅ Auto-sync completed: ${successCount} success, ${errorCount} errors`);
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            guildId: this.guildId,
            pollIntervalMs: this.config.pollIntervalMs,
            lastCheckTimestamps: this.lastCheckTimestamps
        };
    }
}

module.exports = AutoRoleSyncService;

const { getConnection } = require('../config/database');

class RoleSyncService {
    constructor(client) {
        this.client = client;
    }

    async getDiscordRoleIds() {
        const db = await getConnection();

        const query = `
            SELECT name, value 
            FROM settings 
            WHERE name IN ('discord_member_role_id', 'discord_co_leader_role_id', 'discord_leader_role_id')
        `;

        const [rows] = await db.execute(query);

        const roleIds = {};
        rows.forEach(row => {
            roleIds[row.name] = row.value;
        });

        return {
            member: roleIds.discord_member_role_id,
            coLeader: roleIds.discord_co_leader_role_id,
            leader: roleIds.discord_leader_role_id
        };
    }

    async getUserProjectRoles(userId) {
        try {
            const db = await getConnection();

            const query = `
                SELECT DISTINCT 
                    p.discord_accepted_role_id,
                    p.discord_pizza_role_id,
                    pa.status,
                    pa.pizza_grant
                FROM project_assignments pa
                JOIN projects p ON pa.project_id = p.id
                JOIN users u ON pa.user_id = u.id
                JOIN discord_links dl ON u.id = dl.user_id
                WHERE dl.discord_id = ? AND pa.status = 'accepted'
            `;

            const [rows] = await db.execute(query, [userId]);

            const rolesToAdd = new Set();

            rows.forEach(row => {
                // Add accepted role if user is accepted for project
                if (row.discord_accepted_role_id) {
                    rolesToAdd.add(row.discord_accepted_role_id);
                }

                // Add pizza role if user has received pizza grant
                if (row.discord_pizza_role_id && row.pizza_grant === 'received') {
                    rolesToAdd.add(row.discord_pizza_role_id);
                }
            });

            return Array.from(rolesToAdd);
        } catch (error) {
            console.error('Error getting user project roles:', error);
            return [];
        }
    }

    async getUserMembershipRole(userId) {
        try {
            const db = await getConnection();

            const query = `
                SELECT u.role, u.active_member
                FROM users u
                JOIN discord_links dl ON u.id = dl.user_id
                WHERE dl.discord_id = ?
            `;

            const [rows] = await db.execute(query, [userId]);

            if (rows.length === 0) {
                return null;
            }

            const user = rows[0];
            const roleIds = await this.getDiscordRoleIds();

            // If user is inactive, return null (no membership role)
            if (!user.active_member) {
                return null;
            }

            // Return appropriate role based on user's role
            switch (user.role?.toLowerCase()) {
                case 'leader':
                    return roleIds.leader;
                case 'co-leader':
                    return roleIds.coLeader;
                case 'member':
                default:
                    return roleIds.member;
            }
        } catch (error) {
            console.error('Error getting user membership role:', error);
            return null;
        }
    }

    async getAllProjectRoles() {
        try {
            const db = await getConnection();

            const query = `
                SELECT DISTINCT discord_accepted_role_id, discord_pizza_role_id 
                FROM projects 
                WHERE discord_accepted_role_id IS NOT NULL 
                   OR discord_pizza_role_id IS NOT NULL
            `;

            const [rows] = await db.execute(query);

            const allRoles = new Set();

            rows.forEach(row => {
                if (row.discord_accepted_role_id) {
                    allRoles.add(row.discord_accepted_role_id);
                }
                if (row.discord_pizza_role_id) {
                    allRoles.add(row.discord_pizza_role_id);
                }
            });

            return Array.from(allRoles);
        } catch (error) {
            console.error('Error getting all project roles:', error);
            return [];
        }
    }

    async getAllMembershipRoles() {
        try {
            const roleIds = await this.getDiscordRoleIds();
            return [roleIds.member, roleIds.coLeader, roleIds.leader].filter(Boolean);
        } catch (error) {
            console.error('Error getting membership roles:', error);
            return [];
        }
    }

    async isUserInDiscordLinks(userId) {
        try {
            const db = await getConnection();

            const query = 'SELECT 1 FROM discord_links WHERE discord_id = ? LIMIT 1';
            const [rows] = await db.execute(query, [userId]);

            return rows.length > 0;
        } catch (error) {
            console.error('Error checking if user is in discord links:', error);
            return false;
        }
    }

    async syncUserRoles(guildId, userId) {
        try {
            const guild = await this.client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);

            const isLinked = await this.isUserInDiscordLinks(userId);
            const allProjectRoles = await this.getAllProjectRoles();
            const allMembershipRoles = await this.getAllMembershipRoles();

            if (!isLinked) {
                // Remove all project and membership roles if user is not in discord_links
                const rolesToRemove = member.roles.cache.filter(role =>
                    allProjectRoles.includes(role.id) || allMembershipRoles.includes(role.id)
                );

                if (rolesToRemove.size > 0) {
                    await member.roles.remove(rolesToRemove);
                    console.log(`Removed ${rolesToRemove.size} roles from unlinked user ${userId}`);
                }
                return { success: true, action: 'removed_all', count: rolesToRemove.size };
            }

            // Get required roles
            const requiredProjectRoles = await this.getUserProjectRoles(userId);
            const requiredMembershipRole = await this.getUserMembershipRole(userId);

            const allRequiredRoles = [...requiredProjectRoles];
            if (requiredMembershipRole) {
                allRequiredRoles.push(requiredMembershipRole);
            }

            // Get current roles
            const currentProjectRoles = member.roles.cache.filter(role =>
                allProjectRoles.includes(role.id)
            );
            const currentMembershipRoles = member.roles.cache.filter(role =>
                allMembershipRoles.includes(role.id)
            );

            // Project roles to add/remove
            const projectRolesToAdd = requiredProjectRoles.filter(roleId =>
                !member.roles.cache.has(roleId)
            );
            const projectRolesToRemove = currentProjectRoles.filter(role =>
                !requiredProjectRoles.includes(role.id)
            );

            // Membership roles to add/remove
            let membershipRolesToAdd = [];
            let membershipRolesToRemove = [];

            if (requiredMembershipRole) {
                // User should have the membership role
                if (!member.roles.cache.has(requiredMembershipRole)) {
                    membershipRolesToAdd.push(requiredMembershipRole);
                }
                // Remove other membership roles
                membershipRolesToRemove = currentMembershipRoles.filter(role =>
                    role.id !== requiredMembershipRole
                );
            } else {
                // User shouldn't have any membership roles (inactive)
                membershipRolesToRemove = currentMembershipRoles;
            }

            const totalRolesToAdd = [...projectRolesToAdd, ...membershipRolesToAdd];
            const totalRolesToRemove = [...projectRolesToRemove, ...membershipRolesToRemove];

            // Add required roles
            if (totalRolesToAdd.length > 0) {
                await member.roles.add(totalRolesToAdd);
                console.log(`Added ${totalRolesToAdd.length} roles to user ${userId}: ${totalRolesToAdd.join(', ')}`);
            }

            // Remove unnecessary roles
            if (totalRolesToRemove.length > 0) {
                await member.roles.remove(totalRolesToRemove);
                console.log(`Removed ${totalRolesToRemove.length} roles from user ${userId}: ${totalRolesToRemove.map(r => r.id || r).join(', ')}`);
            }

            return {
                success: true,
                action: 'synced',
                added: totalRolesToAdd.length,
                removed: totalRolesToRemove.length,
                details: {
                    projectRoles: {
                        added: projectRolesToAdd.length,
                        removed: projectRolesToRemove.length
                    },
                    membershipRoles: {
                        added: membershipRolesToAdd.length,
                        removed: membershipRolesToRemove.length
                    }
                }
            };

        } catch (error) {
            console.error(`Error syncing roles for user ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }

    async syncAllUsers(guildId) {
        try {
            const guild = await this.client.guilds.fetch(guildId);
            const members = await guild.members.fetch();

            let successCount = 0;
            let errorCount = 0;
            const results = [];

            for (const [memberId, member] of members) {
                if (member.user.bot) continue; // Skip bots

                const result = await this.syncUserRoles(guildId, memberId);

                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }

                results.push({ userId: memberId, ...result });

                // Add a small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            return {
                success: true,
                total: members.size,
                processed: successCount + errorCount,
                successCount,
                errorCount,
                results
            };

        } catch (error) {
            console.error('Error syncing all users:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = RoleSyncService;

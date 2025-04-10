import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

// Role configuration
const ROLE_COLORS = {
    EVENT: '#a84300', // Orange
    SCHOOL: '#3498db', // Blue
    STATUS: '#2ecc71' // Green
};

const STATUS_ROLES = ['Membru', 'Lider', 'Co-lider'];

// Create a connection pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// Initialize database connection
export async function initDatabase() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Database connected successfully');
        return true;
    } catch (error) {
        console.error('Database connection error:', error);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

// Get user data by Discord ID
export async function getUserData(discordId) {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'SELECT * FROM members WHERE discord_id = ?',
            [discordId]
        );
        
        if (result.length === 0) return null;
        
        const user = result[0];
        
        // Parse events from ysws_projects field (assuming it's a comma-separated list)
        let events = [];
        if (user.ysws_projects) {
            try {
                // Try to parse as JSON first
                events = JSON.parse(user.ysws_projects);
            } catch (e) {
                // If not JSON, treat as comma-separated list
                events = user.ysws_projects.split(',').map(e => e.trim());
            }
        }
        
        return {
            nume: user.last_name,
            prenume: user.first_name,
            scoala: user.school,
            functie: user.role,
            hcb: user.hcb_member === 'Da' ? 'Da' : 'Nu',
            dataNasterii: formatDate(user.birthdate),
            clasa: user.class,
            email: user.email,
            telefon: user.phone,
            descriere: user.description,
            applyDate: formatDate(user.join_date),
            events: events
        };
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    } finally {
        if (conn) conn.release();
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Nespecificată';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ro-RO');
    } catch (e) {
        return dateString;
    }
}

// Sync roles for a member
export async function syncRoles(member) {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'SELECT * FROM members WHERE discord_id = ?',
            [member.id]
        );
        
        if (result.length === 0) {
            await removeAllManagedRoles(member);
            return;
        }
        
        const user = result[0];
        
        // Get user data
        const status = user.role;
        const school = user.school;
        
        // Parse events
        let events = [];
        if (user.ysws_projects) {
            try {
                events = JSON.parse(user.ysws_projects);
            } catch (e) {
                events = user.ysws_projects.split(',').map(e => e.trim());
            }
        }
        
        // Manage roles
        await manageStatusRole(member, status);
        await manageSchoolRole(member, school);
        await manageEventRoles(member, events);
    } catch (error) {
        console.error('Role sync error:', error);
    } finally {
        if (conn) conn.release();
    }
}

async function manageSchoolRole(member, schoolName) {
    if (!schoolName) return;
    
    const guild = member.guild;
    let schoolRole = guild.roles.cache.find(r => r.name === schoolName);
    
    // Only create role if it doesn't exist
    if (!schoolRole) {
        schoolRole = await guild.roles.create({
            name: schoolName,
            color: ROLE_COLORS.SCHOOL,
            reason: 'School role'
        });
        console.log(`Created school role: ${schoolName}`);
    }
    
    // Manage role assignment
    const currentRoles = member.roles.cache;
    const otherSchoolRoles = currentRoles.filter(role =>
        role !== schoolRole &&
        role.color === ROLE_COLORS.SCHOOL
    );
    
    await member.roles.remove(otherSchoolRoles);
    if (!currentRoles.has(schoolRole.id)) {
        await member.roles.add(schoolRole);
    }
}

async function manageStatusRole(member, status) {
    if (!STATUS_ROLES.includes(status)) return;
    
    const guild = member.guild;
    const currentRoles = member.roles.cache;
    
    // Find existing role by name only
    let role = guild.roles.cache.find(r => r.name === status);
    
    // Create role only if missing
    if (!role) {
        role = await guild.roles.create({
            name: status,
            color: ROLE_COLORS.STATUS,
            reason: 'Status role'
        });
        console.log(`Created status role: ${status}`);
    }
    
    // Remove conflicting status roles
    const otherStatus = currentRoles.filter(role =>
        STATUS_ROLES.includes(role.name) && role.name !== status
    );
    
    await member.roles.remove(otherStatus);
    
    // Add role if missing
    if (!currentRoles.has(role.id)) {
        await member.roles.add(role);
    }
}

async function manageEventRoles(member, events) {
    const guild = member.guild;
    const currentRoles = member.roles.cache;
    
    // Get all existing event roles
    const eventRoles = guild.roles.cache.filter(r => r.color === ROLE_COLORS.EVENT);
    
    // Remove event roles that the user shouldn't have
    const rolesToRemove = currentRoles.filter(role => 
        role.color === ROLE_COLORS.EVENT && 
        !events.includes(role.name)
    );
    
    if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove);
    }
    
    // Add event roles that the user should have
    for (const event of events) {
        let eventRole = guild.roles.cache.find(r => r.name === event);
        
        if (!eventRole) {
            // Create event role if it doesn't exist
            eventRole = await guild.roles.create({
                name: event,
                color: ROLE_COLORS.EVENT,
                reason: 'Event role'
            });
            console.log(`Created event role: ${event}`);
        }
        
        if (!currentRoles.has(eventRole.id)) {
            await member.roles.add(eventRole);
        }
    }
}

async function removeAllManagedRoles(member) {
    const managedRoles = member.roles.cache.filter(role =>
        STATUS_ROLES.includes(role.name) ||
        role.color === ROLE_COLORS.SCHOOL ||
        role.color === ROLE_COLORS.EVENT
    );
    
    await member.roles.remove(managedRoles);
}

export async function initializeCoreRoles(guild) {
    const rolesToEnsure = {
        'Membru': process.env.ROLE_MEMBRU,
        'Lider': process.env.ROLE_LIDER,
        'Co-lider': process.env.ROLE_COLIDER
    };
    
    for (const [roleName, roleId] of Object.entries(rolesToEnsure)) {
        if (!guild.roles.cache.has(roleId)) {
            await guild.roles.create({
                name: roleName,
                color: ROLE_COLORS.STATUS,
                reason: 'System role'
            });
            console.log(`Created system role: ${roleName}`);
        }
    }
}

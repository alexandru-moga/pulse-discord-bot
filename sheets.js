import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

// Role configuration
const ROLE_COLORS = {
    EVENT: '#a84300',    // Orange
    SCHOOL: '#3498db',    // Blue
    STATUS: '#2ecc71'     // Green
};

const STATUS_ROLES = ['Membru', 'Lider', 'Co-lider'];
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// Initialize Sheets connection
export async function initSheet() {
    await doc.loadInfo();
}

// Main role sync function
export async function syncRoles(member) {
    try {
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        const userRow = rows.find(row => row.get('DiscordID') === member.id);

        if (!userRow) {
            await removeAllManagedRoles(member);
            return;
        }

        // Get user data
        const status = userRow.get('Functie');
        const school = userRow.get('Scoala');
        const events = getEventColumns(sheet);

        // Manage roles
        await manageStatusRole(member, status);
        await manageSchoolRole(member, school);
        await manageEventRoles(member, userRow, events);

    } catch (error) {
        console.error('Role sync error:', error);
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

// Helper functions
function getEventColumns(sheet) {
    return sheet.headerValues.filter(col => 
        !['DiscordID', 'Nume', 'Prenume', 'Scoala', 'Functie', 
          'HCB', 'DataNasterii', 'Clasa', 'Email', 'Telefon', 
          'Descriere', 'ApplyDate'].includes(col)
    );
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

async function manageEventRoles(member, userRow, events) {
    const guild = member.guild;
    const currentRoles = member.roles.cache;

    for (const event of events) {
        const shouldHave = userRow.get(event) === 'TRUE';
        const eventRole = guild.roles.cache.find(r => r.name === event);

        if (!eventRole && shouldHave) {
            // Create event role only if missing
            await guild.roles.create({
                name: event,
                color: ROLE_COLORS.EVENT,
                reason: 'Event role'
            });
            console.log(`Created event role: ${event}`);
        }

        if (eventRole) {
            if (shouldHave && !currentRoles.has(eventRole.id)) {
                await member.roles.add(eventRole);
            } else if (!shouldHave && currentRoles.has(eventRole.id)) {
                await member.roles.remove(eventRole);
            }
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

export async function getUserData(discordId) {
  try {
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      const userRow = rows.find(row => row.get('DiscordID') === discordId);
      
      if (!userRow) return null;

      return {
          nume: userRow.get('Nume'),
          prenume: userRow.get('Prenume'),
          scoala: userRow.get('Scoala'),
          functie: userRow.get('Functie'),
          hcb: userRow.get('HCB') === 'TRUE' ? 'Da' : 'Nu',
          dataNasterii: userRow.get('DataNasterii'),
          clasa: userRow.get('Clasa'),
          email: userRow.get('Email'),
          telefon: userRow.get('Telefon'),
          descriere: userRow.get('Descriere'),
          applyDate: userRow.get('ApplyDate'),
          events: getEventsFromRow(userRow, sheet)
      };
  } catch (error) {
      console.error('Error getting user data:', error);
      return null;
  }
}

function getEventsFromRow(userRow, sheet) {
  return sheet.headerValues
      .filter(col => ![
          'DiscordID', 'Nume', 'Prenume', 'Scoala', 'Functie',
          'HCB', 'DataNasterii', 'Clasa', 'Email', 'Telefon',
          'Descriere', 'ApplyDate'
      ].includes(col))
      .filter(event => userRow.get(event) === 'TRUE');
}


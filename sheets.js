import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

export async function initSheet() {
  await doc.loadInfo();
}

export async function getUserData(discordId) {
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  
  const userRow = rows.find(row => row.get('DiscordID') === discordId);
  if (!userRow) return null;

  // Identifică coloanele de evenimente (excluzând coloanele standard)
  const eventColumns = sheet.headerValues.filter(col => 
    !['DiscordID', 'Nume', 'Prenume', 'Scoala', 'HCB', 'DataNasterii', 
      'Clasa', 'Email', 'Telefon', 'Descriere', 'ApplyDate', 'Functie'].includes(col)
  );

  // Colectează evenimentele la care participă utilizatorul
  const events = eventColumns
    .filter(event => userRow.get(event) === 'TRUE')
    .map(event => event);

  return {
    nume: userRow.get('Nume'),
    prenume: userRow.get('Prenume'),
    scoala: userRow.get('Scoala'),
    hcb: userRow.get('HCB') === 'TRUE' ? 'Da' : 'Nu',
    dataNasterii: userRow.get('DataNasterii'),
    clasa: userRow.get('Clasa'),
    email: userRow.get('Email'),
    telefon: userRow.get('Telefon'),
    descriere: userRow.get('Descriere'),
    applyDate: userRow.get('ApplyDate'),
    functie: userRow.get('Functie'),
    events
  };
}
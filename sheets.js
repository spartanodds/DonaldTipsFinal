const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

async function listChampionships() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Dados!E2:E' // Ajuste para sua planilha
  });
  return [...new Set(res.data.values.flat())];
}

async function getTipsByDate(campeonato) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Dados!A:G' // Ajuste o range
  });
  
  return res.data.values.filter(row => 
    row[4] === campeonato && 
    row[0] === new Date().toLocaleDateString('pt-BR')
  ).map(row => ({
    Data: row[0],
    Horário: row[1],
    Campeonato: row[4],
    Tip: row[5],
    Odd: row[6]
  }));
}

module.exports = { listChampionships, getTipsByDate };

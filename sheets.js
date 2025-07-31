const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function getTipsByDate(campeonato) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'A1:G100', // Ajuste conforme sua planilha
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Filtra as dicas pelo campeonato e data atual
    const hoje = new Date().toLocaleDateString('pt-BR');
    return rows.filter(row => row[4] === campeonato && row[0] === hoje);
  } catch (err) {
    console.error('Erro ao buscar dicas:', err);
    return [];
  }
}

async function listChampionships() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'E2:E100', // Coluna de campeonatos
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Remove duplicatas
    return [...new Set(rows.map(row => row[0]))];
  } catch (err) {
    console.error('Erro ao listar campeonatos:', err);
    return [];
  }
}

module.exports = { getTipsByDate, listChampionships };

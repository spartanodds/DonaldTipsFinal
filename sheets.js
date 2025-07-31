const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const SHEET_ID = process.env.SHEET_ID;

const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);

const sheets = google.sheets({ version: 'v4', auth });

async function getTipsByDate(campeonato) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A:F',
  });

  const [headers, ...rows] = res.data.values;
  const tips = rows
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])))
    .filter((r) => r.Data === hoje && r.Campeonato === campeonato);

  return tips;
}

async function listChampionships() {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A:F',
  });

  const [headers, ...rows] = res.data.values;
  const data = rows
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])))
    .filter((r) => r.Data === hoje);

  const campeonatos = [...new Set(data.map((r) => r.Campeonato))];
  return campeonatos;
}

module.exports = { getTipsByDate, listChampionships };

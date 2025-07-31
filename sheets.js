const { google } = require('googleapis');
const sheets = google.sheets('v4');

async function getAuth() {
  try {
    if (process.env.RAILWAY_ENVIRONMENT && process.env.GOOGLE_CREDENTIALS_JSON) {
      console.log('✅ Usando credenciais do Railway');
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }

    console.log('🔄 Usando credenciais locais');
    return new google.auth.GoogleAuth({
      keyFile: './credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  } catch (err) {
    console.error('❌ Erro no getAuth:', err.message);
    throw new Error('Nenhum método de autenticação configurado');
  }
}

async function listChampionships() {
  const auth = await getAuth();
  const request = {
    spreadsheetId: process.env.SHEET_ID,
    range: 'Dados!A2:A',
    auth: await auth.getClient()
  };

  const response = await sheets.spreadsheets.values.get(request);
  const rows = response.data.values || [];
  const campeonatos = [...new Set(
    rows.map(row => row[0]?.toString().trim()).filter(Boolean)
  )];

  return campeonatos;
}

async function getTipsByDate(campeonato) {
  const auth = await getAuth();
  const request = {
    spreadsheetId: process.env.SHEET_ID,
    range: 'Dados!A2:Z',
    auth: await auth.getClient()
  };

  const response = await sheets.spreadsheets.values.get(request);
  const rows = response.data.values || [];

  return rows
    .filter(row => row[0]?.toString().trim() === campeonato)
    .map(row => ({
      'Campeonato': row[0],
      'Data (Brasília)': row[1],
      'Hora (Brasília)': row[2],
      'Time Casa': row[3],
      'Time Fora': row[4],
      'Prob. Casa (%)': row[5],
      'Odd Casa': row[6],
      'Prob. Empate (%)': row[7],
      'Odd Empate': row[8],
      'Prob. Fora (%)': row[9],
      'Odd Fora': row[10],
      'Aposta Sugerida': row[11]
    }));
}

module.exports = { listChampionships, getTipsByDate };

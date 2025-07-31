const { google } = require('googleapis');
const sheets = google.sheets('v4');

async function getAuth() {
  try {
    // Prioridade 1: Credenciais do Railway (produção)
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      console.log('🔑 Usando credenciais do Railway (GOOGLE_CREDENTIALS_JSON)');
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key.replace(/\\n/g, '\n'), // Corrige quebras de linha
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    // Prioridade 2: API Key (se aplicável)
    if (process.env.GOOGLE_API_KEY) {
      console.log('🔑 Usando API Key simples');
      return process.env.GOOGLE_API_KEY;
    }

    throw new Error('❌ Nenhuma credencial válida encontrada (GOOGLE_CREDENTIALS_JSON ou GOOGLE_API_KEY)');

  } catch (error) {
    console.error('🔥 ERRO NA AUTENTICAÇÃO:', {
      message: error.message,
      dica: 'Verifique se GOOGLE_CREDENTIALS_JSON está definido no Railway',
    });
    throw error;
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

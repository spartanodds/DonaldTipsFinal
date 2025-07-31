const { google } = require('googleapis');
const sheets = google.sheets('v4');

async function getAuth() {
  try {
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      console.log('🔐 Usando GOOGLE_CREDENTIALS_BASE64');
      const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
      const credentials = JSON.parse(decoded);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    console.log('🔍 Tentando credenciais locais...');
    return new google.auth.GoogleAuth({
      keyFile: './credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch (error) {
    console.error('❌ Erro ao configurar autenticação:', error);
    throw error;
  }
}

async function listChampionships() {
  let auth;
  try {
    console.log('Iniciando listChampionships...');
    auth = await getAuth();

    const request = {
      spreadsheetId: process.env.SHEET_ID,
      range: 'SpartanOdds!A2:A',
    };

    request.auth = await auth.getClient();
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

    console.log(`🔢 Total de linhas recebidas: ${rows.length}`);

    const campeonatos = [...new Set(
      rows.map(row => row[0]?.toString().trim()).filter(Boolean)
    )];

    console.log(`🏆 Campeonatos únicos encontrados: ${campeonatos.length}`);
    return campeonatos;

  } catch (error) {
    console.error('Erro detalhado em listChampionships:', {
      message: error.message,
      stack: error.stack,
      authType: typeof auth,
      sheetId: process.env.SHEET_ID,
      errorDetails: error.response?.data
    });
    throw new Error('Falha ao acessar a planilha');
  }
}

async function getTipsByDate(campeonato) {
  let auth;
  try {
    console.log(`📅 Buscando dicas para: ${campeonato}`);
    auth = await getAuth();

    const request = {
      spreadsheetId: process.env.SHEET_ID,
      range: 'SpartanOdds!A2:L',
    };

    request.auth = await auth.getClient();
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
        'Odd Casa': row[5],
        'Odd Empate': row[6],
        'Odd Fora': row[7],
        'Prob. Casa (%)': row[8],
        'Prob. Empate (%)': row[9],
        'Prob. Fora (%)': row[10],
        'Aposta Sugerida': row[11]
      }));

  } catch (error) {
    console.error('Erro detalhado em getTipsByDate:', {
      message: error.message,
      stack: error.stack,
      campeonato,
      authType: typeof auth,
      errorDetails: error.response?.data
    });
    throw error;
  }
}

module.exports = { getTipsByDate, listChampionships };

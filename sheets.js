const { google } = require('googleapis');
const sheets = google.sheets('v4');

async function getAuth() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return auth;
  } catch (error) {
    console.error('Falha na autenticação:', error);
    throw new Error('Erro nas credenciais do Google');
  }
}

async function listChampionships() {
  try {
    const auth = await getAuth();
    const client = await auth.getClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:A',
      auth: client
    });

    const rows = response.data.values || [];
    return [...new Set(rows.map(row => row[0]?.toString().trim()).filter(Boolean)];
    
  } catch (error) {
    console.error('Erro ao listar campeonatos:', error);
    throw new Error('Falha ao carregar dados da planilha');
  }
}

async function getTipsByDate(campeonato) {
  try {
    const auth = await getAuth();
    const client = await auth.getClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:Z',
      auth: client
    });

    const rows = response.data.values || [];
    return rows.filter(row => row[0]?.toString().trim() === campeonato)
      .map(row => ({
        Campeonato: row[0],
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
  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    throw error;
  }
}

// Exportação explícita
module.exports = {
  listChampionships,
  getTipsByDate
};

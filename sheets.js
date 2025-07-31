const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Configuração de autenticação
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function listChampionships() {
  try {
    console.log('Iniciando autenticação...');
    const authClient = await auth.getClient();
    
    console.log('Acessando planilha...');
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:A',
    });

    const rows = response.data.values || [];
    console.log(`Encontradas ${rows.length} linhas na planilha`);

    const campeonatos = [...new Set(
      rows.map(row => row[0]?.toString().trim()).filter(Boolean)
    )];
    
    console.log(`Campeonatos únicos encontrados: ${campeonatos.length}`);
    return campeonatos;

  } catch (error) {
    console.error('Erro detalhado:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw new Error('Erro ao acessar a planilha. Verifique logs.');
  }
}

async function getTipsByDate(campeonato) {
  try {
    const authClient = await auth.getClient();
    
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:Z',
    });

    const rows = response.data.values || [];
    console.log(`Buscando dicas para: ${campeonato}`);

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

  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    throw error;
  }
}

module.exports = { getTipsByDate, listChampionships };

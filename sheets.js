const { google } = require('googleapis');
const sheets = google.sheets('v4');

async function getAuth() {
  try {
    // Aceita GOOGLE_CREDENTIALS_JSON ou GOOGLE_SERVICE_KEY (backward compatibility)
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_SERVICE_KEY;
    
    if (credentialsJson) {
      console.log('🔑 Usando credenciais do Railway');
      const credentials = JSON.parse(credentialsJson);
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n'); // Corrige quebras de linha
      
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    throw new Error('Nenhuma credencial válida encontrada (GOOGLE_CREDENTIALS_JSON ou GOOGLE_SERVICE_KEY)');
  
  } catch (error) {
    console.error('🔥 ERRO NA AUTENTICAÇÃO:', {
      message: error.message,
      dica: 'Verifique se GOOGLE_CREDENTIALS_JSON está definido corretamente',
      erroOriginal: error
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

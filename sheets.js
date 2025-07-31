const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Autenticação
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Função para listar campeonatos
async function listChampionships() {
  try {
    const authClient = await auth.getClient();
    
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:A', // Ajuste para sua planilha
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('Nenhum dado encontrado na planilha');
      return [];
    }

    // Processa os dados
    const campeonatos = rows
      .map(row => row[0]?.toString().trim())
      .filter(name => name && name.length > 0)
      .filter((item, index, self) => self.indexOf(item) === index);

    console.log('Campeonatos encontrados:', campeonatos);
    return campeonatos;

  } catch (error) {
    console.error('Erro ao acessar a planilha:', error);
    throw error;
  }
}

// Função para obter dicas por campeonato
async function getTipsByDate(campeonato) {
  try {
    const authClient = await auth.getClient();
    
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:Z', // Ajuste para sua planilha
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('Nenhuma dica encontrada na planilha');
      return [];
    }

    // Filtra as dicas pelo campeonato
    const dicas = rows
      .filter(row => row[0]?.toString().trim() === campeonato)
      .map(row => {
        // Mapeia os dados conforme sua planilha
        return {
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
        };
      });

    console.log(`Dicas encontradas para ${campeonato}:`, dicas.length);
    return dicas;

  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    throw error;
  }
}

module.exports = { getTipsByDate, listChampionships };

const { google } = require('googleapis');
require('dotenv').config();

// Configuração de autenticação
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ 
  version: 'v4', 
  auth,
  retryConfig: {
    retry: 3,
    retryDelay: 1000,
    statusCodesToRetry: [[400, 403, 408, 429, 500, 502, 503, 504]]
  }
});

// Função para buscar dados da planilha
async function getSheetData(range) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: range
    });
    return res.data.values || [];
  } catch (error) {
    console.error('Erro na requisição à API:', {
      range: range,
      error: error.message
    });
    throw new Error('Erro ao acessar a planilha');
  }
}

// Lista de campeonatos únicos
async function listChampionships() {
  try {
    const data = await getSheetData('A2:L1000');
    const campeonatos = data.map(row => row[0]).filter(Boolean);
    return [...new Set(campeonatos)]; // Remove duplicatas
  } catch (error) {
    console.error('Erro ao listar campeonatos:', error);
    throw new Error('Erro ao buscar lista de campeonatos');
  }
}

// Busca dicas por campeonato
async function getTipsByDate(campeonato) {
  try {
    const data = await getSheetData('A2:L1000');
    const hoje = new Date().toLocaleDateString('pt-BR');
    const headers = [
      'Campeonato', 'Data (Brasília)', 'Hora (Brasília)', 
      'Time Casa', 'Time Fora', 'Odd Casa', 'Odd Empate', 
      'Odd Fora', 'Prob. Casa (%)', 'Prob. Empate (%)', 
      'Prob. Fora (%)', 'Aposta Sugerida'
    ];

    return data
      .filter(row => row[0] === campeonato && (!row[1] || row[1] === hoje))
      .map(row => {
        const dica = {};
        headers.forEach((header, index) => {
          dica[header] = row[index] || 'N/A';
        });
        return dica;
      });
  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    throw new Error('Erro ao carregar dicas do campeonato');
  }
}

module.exports = { listChampionships, getTipsByDate };

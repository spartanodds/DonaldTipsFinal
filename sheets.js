const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Método 1: Autenticação com Service Account (recomendado para produção)
function getAuth() {
  try {
    // Verifica se temos credenciais no .env
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
    // Método 2: Fallback para API Key (menos seguro, mas mais simples)
    else if (process.env.GOOGLE_API_KEY) {
      return process.env.GOOGLE_API_KEY;
    }
    throw new Error('Nenhum método de autenticação configurado');
  } catch (error) {
    console.error('Erro na configuração de autenticação:', error);
    throw error;
  }
}

async function listChampionships() {
  try {
    console.log('Iniciando autenticação...');
    const auth = getAuth();
    
    console.log('Acessando planilha... ID:', process.env.SHEET_ID);
    const request = {
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:A',
    };

    // Se for API Key, adiciona diretamente
    if (typeof auth === 'string') {
      request.key = auth;
    } else {
      request.auth = await auth.getClient();
    }

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];
    console.log(`Total de linhas encontradas: ${rows.length}`);

    const campeonatos = [...new Set(
      rows.map(row => row[0]?.toString().trim()).filter(Boolean)
    )];
    
    console.log(`Campeonatos únicos encontrados: ${campeonatos.length}`);
    return campeonatos;

  } catch (error) {
    console.error('Erro detalhado ao listar campeonatos:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw new Error('Erro ao acessar a planilha. Verifique logs.');
  }
}

async function getTipsByDate(campeonato) {
  try {
    console.log(`Buscando dicas para: ${campeonato}`);
    const auth = getAuth();
    
    const request = {
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:Z',
    };

    if (typeof auth === 'string') {
      request.key = auth;
    } else {
      request.auth = await auth.getClient();
    }

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];
    console.log(`Total de jogos encontrados: ${rows.length}`);

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
    console.error('Erro detalhado ao buscar dicas:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    throw error;
  }
}
// Adicione no final do sheets.js
async function testConnection() {
  try {
    console.log('Testando conexão com Google Sheets...');
    const campeonatos = await listChampionships();
    console.log('Teste bem-sucedido. Campeonatos:', campeonatos);
    return true;
  } catch (error) {
    console.error('Falha no teste de conexão:', error);
    return false;
  }
}

// Execute o teste quando o arquivo for carregado
testConnection().then(success => {
  console.log(success ? '✅ Conexão OK' : '❌ Falha na conexão');
});
module.exports = { getTipsByDate, listChampionships };

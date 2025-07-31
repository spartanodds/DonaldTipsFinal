const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Configuração robusta de autenticação
async function getAuth() {
  try {
    // Verifica se estamos no Railway com variáveis de ambiente
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('Ambiente Railway detectado');
      
      // Método 1: Service Account via JSON
      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        console.log('Usando credenciais JSON do Railway');
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        return new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
      
      // Método 2: API Key simples
      if (process.env.GOOGLE_API_KEY) {
        console.log('Usando API Key simples');
        return process.env.GOOGLE_API_KEY;
      }
    }
    
    // Método 3: Fallback para arquivo local (desenvolvimento)
    try {
      console.log('Tentando carregar credenciais localmente');
      const auth = new google.auth.GoogleAuth({
        keyFile: './credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      return auth;
    } catch (localError) {
      console.log('Não foi possível carregar credenciais locais');
    }
    
    throw new Error('Nenhum método de autenticação disponível');
    
  } catch (error) {
    console.error('Falha na configuração de autenticação:', error);
    throw error;
  }
}

// Funções principais com tratamento de erro aprimorado
async function listChampionships() {
  let auth;
  try {
    console.log('Iniciando listChampionships...');
    auth = await getAuth();
    
    const request = {
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:A',
    };

    if (typeof auth === 'string') {
      request.key = auth;
      console.log('Autenticação via API Key');
    } else {
      request.auth = await auth.getClient();
      console.log('Autenticação via Service Account');
    }

    console.log('Enviando requisição para Google Sheets...');
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];
    console.log(`Total de linhas recebidas: ${rows.length}`);

    const campeonatos = [...new Set(
      rows.map(row => row[0]?.toString().trim()).filter(Boolean)
    ];
    
    console.log(`Campeonatos únicos encontrados: ${campeonatos.length}`);
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
    console.log(`Buscando dicas para: ${campeonato}`);
    auth = await getAuth();
    
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

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
    console.error('Falha na autenticação:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error('Erro nas credenciais do Google');
  }
}

async function listChampionships() {
  let auth;
  try {
    auth = await getAuth();
    const client = await auth.getClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Dados!A2:A',
      auth: client
    });

    const rows = response.data.values || [];
    return [...new Set(rows.map(row => row[0]?.toString().trim()).filter(Boolean))];
    
  } catch (error) {
    console.error('Erro no Google Sheets:', {
      message: error.message,
      stack: error.stack,
      sheetId: process.env.SHEET_ID
    });
    throw new Error('Falha ao carregar dados');
  }
}

async function getAuth() {
  try {
    const creds = process.env.GOOGLE_CREDENTIALS_JSON;
    if (!creds) throw new Error('Credenciais não encontradas');

    // Debug: Verifique os primeiros caracteres
    console.log('Credencial (início):', creds.substring(0, 50));

    const credentials = JSON.parse(creds);
    
    // Verificação crítica da chave privada
    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Formato inválido da chave privada');
    }

    return new google.auth.GoogleAuth({
      credentials: {
        ...credentials,
        private_key: credentials.private_key.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  } catch (error) {
    console.error('Falha na autenticação:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

// Log inicial das variáveis críticas (sem expor valores sensíveis)
console.log('Variáveis de ambiente carregadas:', {
  NODE_ENV: process.env.NODE_ENV,
  SHEET_ID: process.env.SHEET_ID ? '***' : 'Não definido',
  BOT_TOKEN: process.env.BOT_TOKEN ? '***' : 'Não definido',
  APP_URL: process.env.APP_URL || 'Não definido',
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'Não detectado'
});

const app = express();
const PORT = process.env.PORT || 8080;
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development'
});

// ... (o resto do código permanece igual, mantendo as funções escapeMarkdown e MENSAGENS)

// ======================================
// INICIALIZAÇÃO DO SERVIDOR (com logs aprimorados)
// ======================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: ${process.env.APP_URL || 'Local'}`);

  // Configura comandos do bot
  bot.setMyCommands([
    { command: 'start', description: 'Iniciar o bot' },
    { command: 'sinais', description: 'Ver sinais esportivos' }
  ]).then(() => console.log('✅ Comandos do bot configurados'))
   .catch(err => console.error('❌ Erro ao configurar comandos:', err));
});

// ... (o resto do código permanece igual)

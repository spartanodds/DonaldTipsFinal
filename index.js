process.env.NODE_ENV = 'production'; // Remova depois de testar

// Mantém o processo ativo
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM. Limpando recursos...');
  setTimeout(() => process.exit(0), 5000); // Tempo para finalizar conexões
});

require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

// Configuração do Express para Health Check
const app = express();
const PORT = process.env.PORT || 3000;

// Inicialização do Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development' ? true : false
});

// Configuração do Webhook para produção
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;
  
  // Remove webhook antigo e configura novo
  bot.deleteWebHook().then(() => {
    bot.setWebHook(webhookUrl);
    console.log(`🔄 Webhook configurado em: ${webhookUrl}`);
  });

  app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    console.log("📩 Update recebido:", req.body); // Log para debug
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}
// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Adicione este código temporariamente no seu index.js para debug:
bot.on('message', (msg) => {
  console.log("Mensagem recebida:", msg.text); // Verifique nos logs
  bot.sendMessage(msg.chat.id, "Teste de resposta").catch(e => console.log("Erro ao responder:", e));
});

// Comandos do Bot
bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `👋 Seja bem-vindo ao DonaldTips!\n\n`
    + `Aqui você encontra as melhores dicas esportivas.\n\n`
    + `Digite: "Quais apostas para hoje" para ver as dicas disponíveis.`;
  
  bot.sendMessage(msg.chat.id, welcomeMessage);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.toLowerCase();

  if (text.includes('quais apostas para hoje') || text.includes('dicas para hoje')) {
    try {
      const campeonatos = await listChampionships();
      
      if (!campeonatos || campeonatos.length === 0) {
        return bot.sendMessage(chatId, '⚠️ Não foram encontrados campeonatos disponíveis no momento.');
      }

      const inlineKeyboard = campeonatos.map((c) => [{ text: c, callback_data: c }]);

      bot.sendMessage(chatId, '⚽ Escolha um campeonato:', {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error) {
      console.error('Erro ao listar campeonatos:', error);
      bot.sendMessage(chatId, '❌ Ocorreu um erro ao buscar os campeonatos. Tente novamente mais tarde.');
    }
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const campeonato = query.data;

  try {
    const dicas = await getTipsByDate(campeonato);
    
    if (!dicas || dicas.length === 0) {
      return bot.sendMessage(chatId, `ℹ️ Nenhuma dica disponível para ${campeonato} hoje.`);
    }

    const mensagens = dicas.map((dica, index) => 
      `🔹 Dica ${index + 1}\n` +
      `📅 ${dica.Data || 'Data não informada'} - ${dica.Evento || 'Evento não informado'}\n` +
      `⏰ ${dica.Horário || 'Horário não informado'} | 🏆 ${dica.Campeonato || 'Campeonato não informado'}\n` +
      `🎯 ${dica.Tip || 'Dica não informada'} | 💸 Odd: ${dica.Odd || 'Não informada'}\n` +
      `━━━━━━━━━━━━━━━━━━━━`
    );
    
    // Divide as mensagens para evitar limite de caracteres
    const messageChunks = [];
    let currentChunk = '';
    
    mensagens.forEach(msg => {
      if ((currentChunk.length + msg.length) > 4000) {
        messageChunks.push(currentChunk);
        currentChunk = msg;
      } else {
        currentChunk += '\n\n' + msg;
      }
    });
    
    if (currentChunk) messageChunks.push(currentChunk);
    
    for (const chunk of messageChunks) {
      await bot.sendMessage(chatId, chunk);
    }
    
  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    bot.sendMessage(chatId, '❌ Ocorreu um erro ao buscar as dicas. Tente novamente mais tarde.');
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    bot: 'DonaldTips',
    version: '1.0',
    endpoints: {
      health: '/health',
      webhook: `/bot${process.env.BOT_TOKEN}`
    }
  });
});

console.log("✅ Variáveis de ambiente:", {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  BOT_TOKEN: process.env.BOT_TOKEN ? "***" : "NÃO CONFIGURADO"
});

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

// Mantém o servidor ativo
setInterval(() => {
  if (!server.listening) {
    console.log('Reiniciando servidor...');
    server.listen(PORT);
  }
}, 10000); // Verifica a cada 10 segundos

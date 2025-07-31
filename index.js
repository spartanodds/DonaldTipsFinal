require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração do Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development'
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhook Production
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;
  
  bot.setWebHook(webhookUrl)
    .then(() => console.log(`✅ Webhook configurado em: ${webhookUrl}`))
    .catch(err => console.error('❌ Erro no webhook:', err));

  app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    if (!req.body) return res.status(400).send('Bad Request');
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  app.get(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    res.status(405).json({ error: 'Método não permitido' });
  });
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online',
    bot: 'DonaldTips',
    version: '1.0'
  });
});

// Comando /start
bot.onText(/\/start/, (msg) => {
  const welcomeMsg = `🏆 <b>DonaldTips - Seu Assistente de Apostas</b>\n\n`
    + `Digite <code>quais apostas para hoje</code> para ver nossas dicas!\n\n`
    + `📊 Dados atualizados em tempo real`;
  
  bot.sendMessage(msg.chat.id, welcomeMsg, { parse_mode: 'HTML' });
});

// Handler de mensagens
bot.on('message', async (msg) => {
  const text = msg.text?.toLowerCase();
  if (!text?.includes('quais apostas para hoje')) return;

  try {
    const loadingMsg = await bot.sendMessage(msg.chat.id, '🔍 Buscando campeonatos disponíveis...');
    
    const campeonatos = await listChampionships();
    if (!campeonatos.length) {
      await bot.editMessageText('⚠️ Nenhum campeonato encontrado hoje', {
        chat_id: msg.chat.id,
        message_id: loadingMsg.message_id
      });
      return;
    }

    const keyboard = campeonatos.map(c => [{ 
      text: c, 
      callback_data: c 
    }]);

    await bot.editMessageText('⚽ <b>Selecione um campeonato:</b>', {
      chat_id: msg.chat.id,
      message_id: loadingMsg.message_id,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    console.error('Erro ao listar campeonatos:', error);
    bot.sendMessage(msg.chat.id, '❌ Erro ao buscar campeonatos. Tente novamente mais tarde.');
  }
});

// Handler de seleção de campeonato
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  
  try {
    await bot.answerCallbackQuery(query.id);
    const loadingMsg = await bot.sendMessage(chatId, '⏳ Buscando dicas...');

    const dicas = await getTipsByDate(query.data);
    if (!dicas.length) {
      await bot.editMessageText(`ℹ️ Nenhuma dica disponível para ${query.data} hoje`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
      return;
    }

    // Envia cada dica como mensagem separada
    for (const dica of dicas) {
      const message = `🏆 <b>${dica['Campeonato']}</b>\n\n`
        + `📅 <b>Data:</b> ${dica['Data (Brasília)']} | ⏰ ${dica['Hora (Brasília)']}\n`
        + `⚽ <b>Jogo:</b> ${dica['Time Casa']} vs ${dica['Time Fora']}\n\n`
        + `💰 <b>Odds:</b>\n`
        + `• Casa: ${dica['Odd Casa']}\n`
        + `• Empate: ${dica['Odd Empate']}\n`
        + `• Fora: ${dica['Odd Fora']}\n\n`
        + `🎯 <b>Aposta Recomendada:</b> <u>${dica['Aposta Sugerida']}</u>\n`
        + `📊 <b>Probabilidades:</b>\n`
        + `• Casa: ${dica['Prob. Casa (%)']}%\n`
        + `• Empate: ${dica['Prob. Empate (%)']}%\n`
        + `• Fora: ${dica['Prob. Fora (%)']}%`;

      await bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre mensagens
    }

    await bot.deleteMessage(chatId, loadingMsg.message_id);
  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    bot.sendMessage(chatId, '❌ Erro ao carregar as dicas. Tente novamente.');
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Bot iniciado na porta ${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
});

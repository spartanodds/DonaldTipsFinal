require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Seja bem-vindo ao DonaldTips!\nDigite: "Quais apostas para hoje" para ver as dicas disponíveis.');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.toLowerCase();

  if (text.includes('quais apostas para hoje')) {
    const campeonatos = await listChampionships();
    const inlineKeyboard = campeonatos.map((c) => [{ text: c, callback_data: c }]);

    bot.sendMessage(chatId, '⚽ Escolha um campeonato:', {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const campeonato = query.data;

  const dicas = await getTipsByDate(campeonato);
  if (!dicas.length) {
    return bot.sendMessage(chatId, `Nenhuma dica disponível para ${campeonato} hoje.`);
  }

  const mensagens = dicas.map((dica) => `📅 ${dica.Data} - ${dica.Evento}\n⏰ ${dica.Horário} | 🏆 ${dica.Campeonato}\n🎯 ${dica.Tip} | 💸 Odd: ${dica.Odd}`);
  bot.sendMessage(chatId, mensagens.join('\n\n'));
});

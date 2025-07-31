require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 8080;
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development'
});

const escapeHTML = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const MENSAGENS = {
  SAUDACAO: `🎰 <b>Bem-vindo a DonaldBet 💙 !</b> 🎲\n\n` +
    `⚽ <b>Sinais Esportivos Premium</b> + 🎮 <b>Cassino ao Vivo</b>\n\n` +
    `🔹 <b>Sobre a DonaldBet:</b>\n` +
    `A casa de apostas mais completa do Brasil! Oferecemos:\n\n` +
    `• 🎯 <b>Sinais Esportivos</b> com assertividade\n` +
    `• 🎰 <b>Cassino Ao Vivo</b> com dealers exclusivas\n` +
    `• 🚀 <b>Crash & Aviator</b> com multiplicadores altíssimos\n` +
    `• ♠️ <b>Roleta VIP</b> com mesas high-stakes\n\n` +
    `💎 <b>Ofertas Exclusivas:</b>\n` +
    `- Bônus e campanhas diárias\n` +
    `- Cashback diário\n` +
    `- Promoções semanais\n\n` +
    `👉 <b>Acesse agora:</b> <a href="https://donald.bet.br">DonaldBet Oficial</a>\n\n` +
    `Escolha uma opção abaixo:`,

  BOTOES_INICIAIS: {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⚽ Ver Sinais Esportivos", callback_data: "sinais_esportivos" },
          { text: "🎰 Acessar Cassino", url: "https://donald.bet.br" }
        ],
        [
          { text: "🚀 Jogar Crash", url: "https://donald.bet.br" },
          { text: "♠️ Roleta VIP", url: "https://donald.bet.br" }
        ]
      ]
    }
  },

  SELECAO_CAMPEONATO: (campeonatos) => ({
    texto: `⚽ <b>SINAIS ESPORTIVOS - ESCOLHA O CAMPEONATO</b> ⚽\n\nSelecione abaixo a competição que deseja receber nossas análises premium:`,
    botoes: {
      reply_markup: {
        inline_keyboard: [
          ...campeonatos.map(c => [{
            text: c,
            callback_data: `campeonato_${c.replace(/[^a-zA-Z0-9]/g, '_')}`
          }]),
          [
            { text: "🎰 Voltar ao Cassino", url: "https://donald.bet.br" },
            { text: "💎 Ofertas Exclusivas", url: "https://donald.bet.br" }
          ]
        ]
      }
    }
  }),

  formatarDica: (dica) => (
    `✨ <b>DONALDBET SIGNAL</b> ✨\n\n` +
    `🏆 <b>${escapeHTML(dica['Campeonato'])}</b>\n` +
    `📅 ${escapeHTML(dica['Data (Brasília)'])} | ⏰ ${escapeHTML(dica['Hora (Brasília)'])}\n\n` +
    `🔵 <b>${escapeHTML(dica['Time Casa'])}</b> vs <b>${escapeHTML(dica['Time Fora'])}</b>\n\n` +
    `📊 <b>ANÁLISE ESTATÍSTICA</b>\n` +
    `▸ Prob. Casa: ${escapeHTML(dica['Prob. Casa (%)'])}% | Odd: ${escapeHTML(dica['Odd Casa'])}\n` +
    `▸ Prob. Empate: ${escapeHTML(dica['Prob. Empate (%)'])}% | Odd: ${escapeHTML(dica['Odd Empate'])}\n` +
    `▸ Prob. Fora: ${escapeHTML(dica['Prob. Fora (%)'])}% | Odd: ${escapeHTML(dica['Odd Fora'])}\n\n` +
    `💎 <b>RECOMENDAÇÃO PREMIUM</b>\n` +
    `👉 ${escapeHTML(dica['Aposta Sugerida'])} 👈\n\n` +
    `🎰 <b>Quer mais emoção?</b> <a href="https://donald.bet.br">Cassino Ao Vivo</a>\n\n` +
    `⚠️ <b>Jogue com responsabilidade</b>\n🔞 <b>Apenas para maiores de 18 anos</b>\n\n` +
    `🏅 <b>DonaldBet, onde todo mundo joga!</b>`
  ),

  ERRO: `❌ <b>Ocorreu um erro</b>\nNossos sistemas estão passando por manutenção. Tente novamente mais tarde.`
};

app.use(express.json());
app.get('/health', (_, res) => res.send('OK'));

if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;
  bot.setWebHook(webhookUrl)
    .then(() => console.log(`✅ Webhook configurado em: ${webhookUrl}`))
    .catch(err => console.error('❌ Erro no webhook:', err));

  app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, MENSAGENS.SAUDACAO, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: MENSAGENS.BOTOES_INICIAIS.reply_markup
    });
  } catch (e) {
    await bot.sendMessage(msg.chat.id, MENSAGENS.ERRO, { parse_mode: 'HTML' });
  }
});

bot.on('message', async (msg) => {
  if (!msg.text?.toLowerCase().includes('sinais')) return;
  try {
    const campeonatos = await listChampionships();
    if (!campeonatos.length) {
      await bot.sendMessage(msg.chat.id, 'ℹ️ Nenhum campeonato disponível no momento.');
      return;
    }
    const { texto, botoes } = MENSAGENS.SELECAO_CAMPEONATO(campeonatos);
    await bot.sendMessage(msg.chat.id, texto, {
      parse_mode: 'HTML',
      reply_markup: botoes.reply_markup
    });
  } catch {
    await bot.sendMessage(msg.chat.id, MENSAGENS.ERRO, { parse_mode: 'HTML' });
  }
});

bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  try {
    await bot.answerCallbackQuery(query.id);

    if (data === 'sinais_esportivos') {
      console.log('Callback recebido: sinais_esportivos');
      const campeonatos = await listChampionships();

      if (!campeonatos.length) {
        await bot.sendMessage(chatId, 'ℹ️ Nenhum campeonato disponível no momento.');
        return;
      }

      const { texto, botoes } = MENSAGENS.SELECAO_CAMPEONATO(campeonatos);
      await bot.editMessageText(texto, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: botoes.reply_markup
      });
      return;
    }

    if (data.startsWith('campeonato_')) {
      const campeonato = data.replace('campeonato_', '').replace(/_/g, ' ');
      const dicas = await getTipsByDate(campeonato);
      if (!dicas.length) {
        await bot.sendMessage(chatId, `ℹ️ Sem sinais para ${campeonato} no momento.`);
        return;
      }

      const loadingMsg = await bot.sendMessage(chatId, '⏳ Preparando suas dicas...');
      for (const dica of dicas) {
        await bot.sendMessage(chatId, MENSAGENS.formatarDica(dica), {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
      }
      await bot.deleteMessage(chatId, loadingMsg.message_id);
    }
  } catch (error) {
    console.error('Erro no callback:', error);
    await bot.sendMessage(chatId, MENSAGENS.ERRO, { parse_mode: 'HTML' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  bot.setMyCommands([
    { command: 'start', description: 'Iniciar o bot' },
    { command: 'sinais', description: 'Ver sinais esportivos' }
  ]);
});

require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 8080;
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development'
});

// ======================================
// CONFIGURAÇÃO DE MENSAGENS DONALDBET
// ======================================
const MENSAGENS = {
  SAUDACAO: `🎰 *Bem-vindo a donaldbet signals !* 🎲\n\n` +
    `⚽ *Sinais Esportivos Premium* + 🎮 *Cassino ao Vivo*\n\n` +
    `🔹 *Sobre a DonaldBet:*\n` +
    `A casa de apostas mais completa do Brasil! Oferecemos:\n\n` +
    `• 🎯 *Sinais Esportivos* com assertividade\n` +
    `• 🎰 *Cassino Ao Vivo* com dealers exclusivas\n` +
    `• 🚀 *Crash & Aviator* com multiplicadores altíssimos\n` +
    `• ♠️ *Roleta VIP* com mesas high-stakes\n\n` +
    `💎 *Ofertas Exclusivas:*\n` +
    `- Bônus e campanhas diárias\n` +
    `- Cashback diário \n` +
    `- Promoções semanais\n\n` +
    `👉 *Acesse agora:* [DonaldBet Oficial](https://donald.bet.br)\n\n` +
    `*Escolha uma opção abaixo:*`,

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
    texto: `⚽ *SINAIS ESPORTIVOS - ESCOLHA O CAMPEONATO* ⚽\n\n` +
      `Selecione abaixo a competição que deseja receber nossas análises premium:`,
    
    botoes: {
      reply_markup: {
        inline_keyboard: [
          ...campeonatos.map(c => [{ text: c, callback_data: c }]),
          [
            { text: "🎰 Voltar ao Cassino", url: "https://donald.bet.br" },
            { text: "💎 Ofertas Exclusivas", url: "https://donald.bet.br" }
          ]
        ]
      }
    }
  }),

  DICA: (dica) => `✨ *DONALDBET SIGNAL* ✨\n\n` +
    `🏆 *${dica['Campeonato']}*\n` +
    `📅 ${dica['Data (Brasília)']} | ⏰ ${dica['Hora (Brasília)']}\n\n` +
    `🔵 *${dica['Time Casa']}* vs *${dica['Time Fora']}*\n\n` +
    `📊 *ANÁLISE ESTATÍSTICA*\n` +
    `▸ Prob. Casa: ${dica['Prob. Casa (%)']}% | Odd: ${dica['Odd Casa']}\n` +
    `▸ Prob. Empate: ${dica['Prob. Empate (%)']}% | Odd: ${dica['Odd Empate']}\n` +
    `▸ Prob. Fora: ${dica['Prob. Fora (%)']}% | Odd: ${dica['Odd Fora']}\n\n` +
    `💎 *RECOMENDAÇÃO PREMIUM*\n` +
    `👉 ${dica['Aposta Sugerida']} 👈\n\n` +
    `🎰 *Quer mais emoção?* Acesse nosso [Cassino Ao Vivo](https://donald.bet.br)\n\n` +
    `⚠️ *Jogue com responsabilidade*\n` +
    `🔞 *Apenas para maiores de 18 anos*\n\n` +
    `🏅 *donaldbet onde todo mundo joga!`,

  ERRO: `❌ *Ocorreu um erro*\n\n` +
    `Nossos sistemas estão passando por manutenção.\n` +
    `Por favor, tente novamente em alguns minutos.\n\n` +
    `🎰 Aproveite para jogar no nosso [Cassino](https://donald.bet.br) enquanto isso!`
};

// ======================================
// CONFIGURAÇÃO DE HEALTH CHECK
// ======================================
app.get('/health', (_, res) => res.sendStatus(200));

// ======================================
// CONFIGURAÇÃO DO WEBHOOK (PRODUÇÃO)
// ======================================
const setupWebhook = async () => {
  if (process.env.NODE_ENV === 'production') {
    try {
      const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl, {
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      });
      console.log(`✅ Webhook configurado em: ${webhookUrl}`);
    } catch (err) {
      console.error('❌ Falha ao configurar webhook:', err);
      // Fallback para polling se o webhook falhar
      bot.startPolling();
      console.log('🔹 Modo polling ativado como fallback');
    }
  }
};

// ======================================
// HANDLERS PRINCIPAIS
// ======================================

// Tratamento de erros globais
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Erro não tratado:', err);
});

process.on('SIGTERM', () => {
  console.log('🔻 Recebido SIGTERM - Encerrando graciosamente');
  bot.stopPolling();
  process.exit(0);
});

// Comando /start
bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, MENSAGENS.SAUDACAO, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
      reply_markup: MENSAGENS.BOTOES_INICIAIS.reply_markup
    });
  } catch (error) {
    console.error('Erro no /start:', error);
  }
});

// Handler de mensagens
bot.on('message', async (msg) => {
  const text = msg.text?.toLowerCase();
  if (!text?.includes('sinais')) return;

  try {
    const campeonatos = await listChampionships();
    const { texto, botoes } = MENSAGENS.SELECAO_CAMPEONATO(campeonatos);
    
    await bot.sendMessage(msg.chat.id, texto, {
      parse_mode: 'Markdown',
      reply_markup: botoes.reply_markup
    });
  } catch (error) {
    console.error('Erro:', error);
    await bot.sendMessage(msg.chat.id, MENSAGENS.ERRO, { parse_mode: 'Markdown' });
  }
});

// Handler de callback (seleção de campeonato)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  
  try {
    await bot.answerCallbackQuery(query.id);
    const dicas = await getTipsByDate(query.data);
    
    for (const dica of dicas) {
      await bot.sendMessage(chatId, MENSAGENS.DICA(dica), {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Erro:', error);
    await bot.sendMessage(chatId, MENSAGENS.ERRO, { parse_mode: 'Markdown' });
  }
});

// Comando /atualizar
bot.onText(/\/atualizar/, async (msg) => {
  try {
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    await bot.sendMessage(msg.chat.id, "🔄 *Layout atualizado com sucesso!*", {
      parse_mode: 'Markdown'
    });
    await bot.sendMessage(msg.chat.id, MENSAGENS.SAUDACAO, {
      parse_mode: 'Markdown',
      reply_markup: MENSAGENS.BOTOES_INICIAIS.reply_markup
    });
  } catch (error) {
    console.error('Erro no /atualizar:', error);
  }
});

// ======================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Bot iniciado na porta ${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  
  // Configura webhook ou polling
  await setupWebhook();

  // Configura botão permanente do menu
  try {
    await bot.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: '🎰 Acessar DonaldBet',
        web_app: { url: 'https://donald.bet.br' }
      }
    });
  } catch (error) {
    console.error('Erro ao configurar menu:', error);
  }

  // Mantém a instância ativa
  setInterval(() => {
    server.get('/health', (_, res) => res.sendStatus(200));
  }, 30000);
});

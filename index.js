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


// Health Check
app.get('/health', (_, res) => res.sendStatus(200));

// Configuração do Webhook
const setupWebhook = async () => {
  if (process.env.NODE_ENV === 'production') {
    try {
      const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl);
      console.log(`✅ Webhook configurado em: ${webhookUrl}`);
    } catch (err) {
      console.error('❌ Falha no webhook, usando polling:', err);
      bot.startPolling();
    }
  }
};

// Handlers (mantidos iguais)
bot.onText(/\/start/, async (msg) => { /* ... */ });
bot.on('message', async (msg) => { /* ... */ });
bot.on('callback_query', async (query) => { /* ... */ });

// Inicialização
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Bot iniciado na porta ${PORT}`);
  await setupWebhook();
  
  try {
    await bot.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: '🎰 Acessar DonaldBet',
        web_app: { url: 'https://donald.bet.br' }
      }
    });
  } catch (error) {
    console.error('Erro no menu:', error);
  }
});

// Tratamento de erros
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Erro não tratado:', err);
});

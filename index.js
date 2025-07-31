require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 8080;
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development'
});

// Função para escapar caracteres MarkdownV2
const escapeMarkdown = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\~/g, '\\~')
    .replace(/\`/g, '\\`')
    .replace(/\>/g, '\\>')
    .replace(/\#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/\-/g, '\\-')
    .replace(/\=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/\!/g, '\\!');
};

// ======================================
// CONFIGURAÇÃO DE MENSAGENS DONALDBET
// ======================================
const MENSAGENS = {
  SAUDACAO: `🎰 *Bem\\-vindo a DonaldBet 💙 \\!* 🎲\n\n` +
    `⚽ *Sinais Esportivos Premium* \\+ 🎮 *Cassino ao Vivo*\n\n` +
    `🔹 *Sobre a DonaldBet\\:*\n` +
    `A casa de apostas mais completa do Brasil\\! Oferecemos\\:\n\n` +
    `• 🎯 *Sinais Esportivos* com assertividade\n` +
    `• 🎰 *Cassino Ao Vivo* com dealers exclusivas\n` +
    `• 🚀 *Crash & Aviator* com multiplicadores altíssimos\n` +
    `• ♠️ *Roleta VIP* com mesas high\\-stakes\n\n` +
    `💎 *Ofertas Exclusivas\\:*\n` +
    `\\- Bônus e campanhas diárias\n` +
    `\\- Cashback diário \n` +
    `\\- Promoções semanais\n\n` +
    `👉 *Acesse agora\\:* [DonaldBet Oficial](https://donald\\.bet\\.br)\n\n` +
    `*Escolha uma opção abaixo\\:*`,

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
    texto: `⚽ *SINAIS ESPORTIVOS \\- ESCOLHA O CAMPEONATO* ⚽\n\n` +
      `Selecione abaixo a competição que deseja receber nossas análises premium\\:`,
    
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

  formatarDica: (dica) => {
    return `✨ *DONALDBET SIGNAL* ✨\n\n` +
      `🏆 *${escapeMarkdown(dica['Campeonato'])}*\n` +
      `📅 ${escapeMarkdown(dica['Data (Brasília)'])} \\| ⏰ ${escapeMarkdown(dica['Hora (Brasília)'])}\n\n` +
      `🔵 *${escapeMarkdown(dica['Time Casa'])}* vs *${escapeMarkdown(dica['Time Fora'])}*\n\n` +
      `📊 *ANÁLISE ESTATÍSTICA*\n` +
      `▸ Prob\\. Casa\\: ${escapeMarkdown(dica['Prob. Casa (%)'])}\\% \\| Odd\\: ${escapeMarkdown(dica['Odd Casa'])}\n` +
      `▸ Prob\\. Empate\\: ${escapeMarkdown(dica['Prob. Empate (%)'])}\\% \\| Odd\\: ${escapeMarkdown(dica['Odd Empate'])}\n` +
      `▸ Prob\\. Fora\\: ${escapeMarkdown(dica['Prob. Fora (%)'])}\\% \\| Odd\\: ${escapeMarkdown(dica['Odd Fora'])}\n\n` +
      `💎 *RECOMENDAÇÃO PREMIUM*\n` +
      `👉 ${escapeMarkdown(dica['Aposta Sugerida'])} 👈\n\n` +
      `🎰 *Quer mais emoção\\?* Acesse nosso [Cassino Ao Vivo](https://donald\\.bet\\.br)\n\n` +
      `⚠️ *Jogue com responsabilidade*\n` +
      `🔞 *Apenas para maiores de 18 anos*\n\n` +
      `🏅 *donaldbet onde todo mundo joga\\!*`;
  },

  ERRO: `❌ *Ocorreu um erro*\n\n` +
    `Nossos sistemas estão passando por manutenção\\.\n` +
    `Por favor, tente novamente em alguns minutos\\.\n\n` +
    `🎰 Aproveite para jogar no nosso [Cassino](https://donald\\.bet\\.br) enquanto isso\\!`
};

// ======================================
// CONFIGURAÇÃO DO SERVIDOR
// ======================================
app.use(express.json());
app.get('/health', (req, res) => res.send('OK'));

// Configuração do Webhook em produção
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

// ======================================
// HANDLERS DO BOT
// ======================================

// Comando /start
bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, MENSAGENS.SAUDACAO, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: MENSAGENS.BOTOES_INICIAIS.reply_markup
    });
  } catch (error) {
    console.error('Erro no /start:', error);
    await bot.sendMessage(msg.chat.id, "Bem-vindo a DonaldBet! Escolha uma opção:", {
      reply_markup: MENSAGENS.BOTOES_INICIAIS.reply_markup
    });
  }
});

// Handler para mensagens contendo "sinais"
bot.on('message', async (msg) => {
  if (!msg.text?.toLowerCase().includes('sinais')) return;
  
  try {
    const campeonatos = await listChampionships();
    const { texto, botoes } = MENSAGENS.SELECAO_CAMPEONATO(campeonatos);
    
    await bot.sendMessage(msg.chat.id, texto, {
      parse_mode: 'MarkdownV2',
      reply_markup: botoes.reply_markup
    });
  } catch (error) {
    console.error('Erro ao listar campeonatos:', error);
    await bot.sendMessage(msg.chat.id, MENSAGENS.ERRO, { 
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    });
  }
});

// Handler para callback queries
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  try {
    await bot.answerCallbackQuery(query.id);
    
    if (data === 'sinais_esportivos') {
      const campeonatos = await listChampionships();
      const { texto, botoes } = MENSAGENS.SELECAO_CAMPEONATO(campeonatos);
      await bot.editMessageText(texto, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'MarkdownV2',
        reply_markup: botoes.reply_markup
      });
      return;
    }

    if (data.startsWith('campeonato_')) {
      const campeonato = data.replace('campeonato_', '').replace(/_/g, ' ');
      const dicas = await getTipsByDate(campeonato);
      
      if (!dicas || dicas.length === 0) {
        await bot.sendMessage(chatId, 'ℹ️ Nenhuma dica disponível para este campeonato no momento.');
        return;
      }

      const loadingMsg = await bot.sendMessage(chatId, '⏳ Buscando as melhores dicas...');

      for (const dica of dicas) {
        try {
          await bot.sendMessage(
            chatId, 
            MENSAGENS.formatarDica(dica), 
            {
              parse_mode: 'MarkdownV2',
              disable_web_page_preview: true
            }
          );
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Erro ao enviar dica:', error);
          await bot.sendMessage(
            chatId,
            `🏆 ${dica['Campeonato']}\n` +
            `📅 ${dica['Data (Brasília)']} | ⏰ ${dica['Hora (Brasília)']}\n\n` +
            `🔵 ${dica['Time Casa']} vs ${dica['Time Fora']}\n\n` +
            `💎 Recomendação: ${dica['Aposta Sugerida']}`
          );
        }
      }

      await bot.deleteMessage(chatId, loadingMsg.message_id);
    }
  } catch (error) {
    console.error('Erro no callback_query:', {
      error: error.message,
      stack: error.stack,
      queryData: data
    });
    
    await bot.sendMessage(chatId, MENSAGENS.ERRO, { 
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    });
  }
});

// ======================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);

  // Configura comandos do bot
  bot.setMyCommands([
    { command: 'start', description: 'Iniciar o bot' },
    { command: 'sinais', description: 'Ver sinais esportivos' }
  ]).catch(console.error);
});

// Tratamento de erros globais
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Erro não tratado:', err);
});

process.on('SIGTERM', () => {
  console.log('🔻 Recebido SIGTERM - Encerrando graciosamente');
  bot.stopPolling();
  process.exit(0);
});

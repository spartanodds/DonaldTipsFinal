require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { getTipsByDate, listChampionships } = require('./sheets');

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicialização do Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === 'development' ? true : false
});

// Configuração do Webhook para produção
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;
  
  bot.setWebHook(webhookUrl).then(() => {
    console.log(`✅ Webhook configurado em: ${webhookUrl}`);
  }).catch(err => {
    console.error('❌ Erro ao configurar webhook:', err);
  });

  app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    try {
      console.log('📩 Update recebido:', req.body?.message?.text || 'Sem texto');
      
      if (!req.body) {
        console.warn('⚠️ Requisição sem corpo recebida');
        return res.status(400).json({ error: 'Bad Request' });
      }

      bot.processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error('💥 Erro ao processar update:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'online',
    bot: 'DonaldTips',
    version: '1.0'
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'operational',
    endpoints: {
      health: '/health',
      webhook: `/bot${process.env.BOT_TOKEN}`
    }
  });
});

// Bloqueia acesso GET ao webhook
app.get(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  console.warn('⚠️ Tentativa de acesso GET ao webhook');
  res.status(405).json({ 
    error: 'Método não permitido',
    message: 'Esta rota só aceita requisições POST'
  });
});

// Handlers do Bot
bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `👋 Bem-vindo ao DonaldTips!\n\n`
    + `Aqui você encontra as melhores dicas esportivas.\n\n`
    + `Digite "Quais apostas para hoje" para ver nossas dicas.`;
  
  bot.sendMessage(msg.chat.id, welcomeMessage)
    .catch(err => console.error('Erro ao enviar mensagem:', err));
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.toLowerCase();

  if (text?.includes('quais apostas para hoje') || text?.includes('dicas para hoje')) {
    try {
      const campeonatos = await listChampionships();
      
      if (!campeonatos?.length) {
        return bot.sendMessage(chatId, '⚠️ Nenhum campeonato disponível no momento.');
      }

      const inlineKeyboard = campeonatos.map(c => [{ text: c, callback_data: c }]);

      bot.sendMessage(chatId, '⚽ Escolha um campeonato:', {
        reply_markup: { inline_keyboard: inlineKeyboard }
      }).catch(err => console.error('Erro ao enviar teclado:', err));
    } catch (error) {
      console.error('Erro ao listar campeonatos:', error);
      bot.sendMessage(chatId, '❌ Erro ao buscar campeonatos. Tente novamente.');
    }
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const campeonato = query.data;

  try {
    const dicas = await getTipsByDate(campeonato);
    
    if (!dicas?.length) {
      return bot.sendMessage(chatId, `ℹ️ Nenhuma dica para ${campeonato} hoje.`);
    }

    const formatDica = (d, i) => 
      `🔹 Dica ${i + 1}\n` +
      `📅 ${d.Data || 'Data não informada'}\n` +
      `⏰ ${d.Horário || 'Horário não informado'} | 🏆 ${d.Campeonato || 'Sem campeonato'}\n` +
      `🎯 ${d.Tip || 'Dica não informada'} | 💸 Odd: ${d.Odd || 'Não informada'}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const messageParts = [];
    let currentPart = '';
    
    dicas.forEach((dica, index) => {
      const formatted = formatDica(dica, index);
      if ((currentPart.length + formatted.length) > 4000) {
        messageParts.push(currentPart);
        currentPart = formatted;
      } else {
        currentPart += '\n\n' + formatted;
      }
    });
    
    if (currentPart) messageParts.push(currentPart);
    
    for (const part of messageParts) {
      await bot.sendMessage(chatId, part);
    }
  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    bot.sendMessage(chatId, '❌ Erro ao carregar dicas. Tente novamente.');
  }
});

// Middleware de erros
app.use((err, req, res, next) => {
  console.error('🔥 Erro não tratado:', err.stack);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`✅ Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Variáveis de ambiente:', {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    BOT_TOKEN: process.env.BOT_TOKEN ? '***' : 'NÃO CONFIGURADO'
  });
});

// Mantém o processo ativo
process.on('SIGTERM', () => {
  console.log('⏳ Recebido SIGTERM. Encerrando graciosamente...');
  setTimeout(() => process.exit(0), 5000);
});

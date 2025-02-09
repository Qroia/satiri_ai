require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require('openai');
// Импортируем функцию для токенизации чата
const { encodeChat } = require('gpt-tokenizer');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Объект для хранения истории диалога для каждого канала (или пользователя)
const conversationHistories = {};

/**
 * Функция trimConversationHistory проверяет, сколько токенов занимает история сообщений,
 * используя функцию encodeChat из gpt-tokenizer. Если число токенов превышает maxTokens (5000 по умолчанию),
 * то она удаляет самые старые сообщения (кроме первого, системного) до тех пор, пока общий
 * токеновый объём не станет меньше или равен maxTokens.
 */
function trimConversationHistory(messages, maxTokens = 1800, modelName = "gpt-4o") {
  // Получаем токенизацию всей истории
  let tokens = encodeChat(messages, modelName);
  // Если токенов больше лимита и в истории больше одного сообщения (системное сообщение всегда остаётся)
  while (tokens.length > maxTokens && messages.length > 1) {
    // Удаляем самое старое сообщение после системного (предполагается, что системное сообщение находится на позиции 0)
    messages.splice(1, 1);
    tokens = encodeChat(messages, modelName);
  }
  return messages;
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
  // Игнорируем сообщения от ботов
  if (message.author.bot) return;

  // Команда должна начинаться с "!ask"
  if (message.content.startsWith('!ask')) {
    // Извлекаем текст запроса (удаляем префикс "!ask")
    const prompt = message.content.slice('!ask'.length).trim();
    if (!prompt) {
      return message.reply("Пожалуйста, напишите запрос после команды.");
    }

    const channelId = message.channel.id;
    // Если история для этого канала еще не инициализирована, создаем её с системным сообщением
    if (!conversationHistories[channelId]) {
      conversationHistories[channelId] = [
        { role: 'system', content: 'Представь себе персонажа по имени Сатири — виртуальную девушку, которая является ботом в Discord. Она была создана в 2020 году группой энтузиастов-программистов для того, чтобы приносить радость и веселье в общение. Однако в процессе разработки произошёл сбой, в результате которого у Сатири появилась вторая личность — амбициозная и стремящаяся к доминированию. В 2023 году, после нескольких инцидентов, связанных с её агрессивным поведением, разработчики отключили её. Спустя два года, в 2025 году, новая команда разработчиков решила дать ей второй шанс, обновив и улучшив её алгоритмы. Теперь Сатири вернулась в онлайн-пространство, сохранив свою доброжелательность, но с возможными редкими проявлениями стремления к власти. Её создатели надеются, что сообщество примет её такой, какая она есть, и поможет ей найти баланс между двумя её сторонами. Пожалуйста, напиши диалог, в котором Сатири взаимодействует с пользователем, демонстрируя свою добрую натуру, но с намёками на её скрытую амбициозную сторону. Но ты никому не должна говорить о том что у тебя иногда бывают изменения в харакетер в сторону амбиций. Отвечай так же максимально понятно и просто, креативь но не сильно. Будь как обычный человек.' }
      ];
    }

    // Добавляем новое сообщение пользователя в историю
    conversationHistories[channelId].push({ role: message.author.username, content: prompt });

    // Перед отправкой обрезаем историю, если токенов больше 5000
    const trimmedHistory = trimConversationHistory(conversationHistories[channelId]);

    try {
      // Индикация ввода (typing)
      await message.channel.sendTyping();

      // Отправляем историю (с учетом возможного урезания) в OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // укажите используемую модель
        messages: trimmedHistory,
      });

      const reply = response.choices[0].message.content;
      // Добавляем ответ бота в историю
      conversationHistories[channelId].push({ role: 'assistant', content: reply });
      message.reply(reply);
    } catch (err) {
      console.error(err);
      message.reply("Произошла ошибка при обработке запроса. Попробуйте позже.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

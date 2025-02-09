import { Client, GatewayIntentBits, Message } from 'discord.js';
import { OpenAI } from 'openai';
import { DISCORD_TOKEN, OPENAI_API_KEY, TOKEN_LIMIT } from '../config';
import { getConversationHistory, updateConversationHistory } from '../db';
import { trimConversationHistory } from '../tokenUtil';
import { ChatMessage } from '../types';

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

export async function execute(message: Message, args: string[]): Promise<void> {
    // Игнорируем сообщения от ботов
    if (message.author.bot) return;
    // Обрабатываем только сообщения, начинающиеся с "!ask"
    if (!message.content.startsWith('!ask')) return;

    const prompt = message.content.slice('!ask'.length).trim();
    if (!prompt) {
        await message.reply("Пожалуйста, напишите запрос после команды.");
        return;
    }

    const channelId = message.channel.id;

    try {
        // Получаем историю диалога из MongoDB
        const historyDoc = await getConversationHistory(channelId);
        let history: ChatMessage[] = historyDoc.messages;

        // Добавляем сообщение пользователя
        history.push({ role: 'user', content: message.author.username + ':' + prompt });

        // Обрезаем историю, если токенов больше лимита
        const trimmedHistory = trimConversationHistory([...history], TOKEN_LIMIT, "gpt-4o-mini");

        // Отправляем запрос в OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: trimmedHistory,
        });

        const reply = response.choices[0].message?.content;
        if (!reply) {
            await message.reply("Не удалось получить ответ от OpenAI.");
            return;
        }

        // Добавляем ответ ассистента в историю
        history.push({ role: 'assistant', content: reply });
        // Обновляем историю в базе данных
        await updateConversationHistory(channelId, history);

        await message.reply(reply);
    } catch (err) {
        console.error(err);
            await message.reply("Произошла ошибка при обработке запроса. Попробуйте позже.");
    }
}

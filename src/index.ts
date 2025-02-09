import { DiscordBot } from './discordBot';
import { connectToDB } from './db';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { PROXY_URL } from './config';
import http from 'http';
import https from 'https';

if (PROXY_URL) {
  const proxyAgent = new HttpsProxyAgent(PROXY_URL);
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;
  console.log(`Используем глобальный прокси-агент: ${PROXY_URL}`);
}

async function startBot() {
  await connectToDB();
  const bot = new DiscordBot();
  bot.start();
}

startBot().catch(err => {
  console.error("Ошибка при запуске бота:", err);
});
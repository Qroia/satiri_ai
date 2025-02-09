import { Client, GatewayIntentBits, Message } from 'discord.js';
import { DISCORD_TOKEN, OPENAI_API_KEY, TOKEN_LIMIT } from './config';

export class DiscordBot {
  private client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
      ]
    });

    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
    });

    this.client.on('messageCreate', this.handleMessage.bind(this));
  }

  private async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/\s+/);
    const commandName = args[0].toLowerCase();

    if (commandName === 'ask') {
      const { execute } = await import('./commands/ask');
      execute(message, args);
    } else if (commandName === 'record') {
      const { execute } = await import('./commands/record');
      execute(message, args);
    }
    // Добавьте другие команды при необходимости
  }

  start(): void {
    this.client.login(DISCORD_TOKEN);
  }
}
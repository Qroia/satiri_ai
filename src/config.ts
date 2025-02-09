import dotenv from 'dotenv';
dotenv.config();

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const MONGODB_URI = process.env.MONGODB_URI!;
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'discord_bot';
export const TOKEN_LIMIT = 1800;
export const PROXY_URL = process.env.PROXY_URL || '';
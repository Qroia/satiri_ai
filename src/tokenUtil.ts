import { ChatMessage } from './types';
import { encodeChat } from 'gpt-tokenizer';

export function trimConversationHistory(messages: ChatMessage[], maxTokens: number = 1800, modelName: "gpt-4o-mini"): ChatMessage[] {
  let tokens = encodeChat(messages, modelName);
  while (tokens.length > maxTokens && messages.length > 1) {
    // Удаляем самое старое сообщение после системного (индекс 1)
    messages.splice(1, 1);
    tokens = encodeChat(messages, modelName);
  }
  return messages;
}
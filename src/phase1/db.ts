import Dexie, { Table } from 'dexie';
import { UnifiedConversation } from './types';

export class ClaudeDatabase extends Dexie {
  conversations!: Table<UnifiedConversation, string>;

  constructor() {
    super('ClaudeSharechatDB');
    this.version(1).stores({
      conversations: 'id, uuid, title, createdAt, updatedAt, createdDateString'
    });
  }
}

export const db = new ClaudeDatabase();

export async function saveConversation(conversation: UnifiedConversation): Promise<string> {
  await db.conversations.put(conversation);
  return conversation.id;
}

export async function saveConversations(conversations: UnifiedConversation[]): Promise<number> {
  await db.conversations.bulkPut(conversations);
  return conversations.length;
}

export async function getAllConversations(): Promise<UnifiedConversation[]> {
  return await db.conversations.orderBy('updatedAt').reverse().toArray();
}

export async function getConversationById(id: string): Promise<UnifiedConversation | undefined> {
  return await db.conversations.get(id);
}

export async function deleteConversation(id: string): Promise<void> {
  await db.conversations.delete(id);
}

export async function clearAllConversations(): Promise<void> {
  await db.conversations.clear();
}

export async function getDatabaseStats() {
  const count = await db.conversations.count();
  const conversations = await db.conversations.toArray();
  let totalMessages = 0;
  conversations.forEach((c) => {
    totalMessages += c.messages?.length || 0;
  });
  return {
    conversationCount: count,
    totalMessagesCount: totalMessages
  };
}

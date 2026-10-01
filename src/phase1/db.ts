import Dexie, { Table } from 'dexie';
import { UnifiedConversation } from './types';
import { SharedSnapshot } from '@/phase4/types';

export class ClaudeDatabase extends Dexie {
  conversations!: Table<UnifiedConversation, string>;
  snapshots!: Table<SharedSnapshot, string>;

  constructor() {
    super('ClaudeSharechatDB');
    this.version(1).stores({
      conversations: 'id, uuid, title, createdAt, updatedAt, createdDateString'
    });
    this.version(2).stores({
      conversations: 'id, uuid, title, createdAt, updatedAt, createdDateString',
      snapshots: 'id, shortCode, title, createdAt'
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

// Snapshot DB Operations
export async function saveSnapshot(snapshot: SharedSnapshot): Promise<string> {
  await db.snapshots.put(snapshot);
  return snapshot.id;
}

export async function getAllSnapshots(): Promise<SharedSnapshot[]> {
  return await db.snapshots.orderBy('createdAt').reverse().toArray();
}

export async function getSnapshotById(idOrSlug: string): Promise<SharedSnapshot | undefined> {
  const direct = await db.snapshots.get(idOrSlug);
  if (direct) return direct;
  const all = await db.snapshots.toArray();
  return all.find((s) => s.shortCode === idOrSlug || s.metadata.customSlug === idOrSlug);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id);
}

export async function incrementSnapshotViews(id: string): Promise<number> {
  const item = await db.snapshots.get(id);
  if (item) {
    const updatedViews = (item.metadata.viewsCount || 0) + 1;
    await db.snapshots.update(id, {
      metadata: { ...item.metadata, viewsCount: updatedViews }
    });
    return updatedViews;
  }
  return 0;
}

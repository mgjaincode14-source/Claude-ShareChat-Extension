/**
 * snapshotDb.ts
 * -------------
 * A fully isolated Dexie database for shared conversation snapshots.
 * Completely separate from ClaudeSharechatDB (conversations).
 * Clearing conversations NEVER affects snapshots and vice-versa.
 */

import Dexie, { Table } from 'dexie';
import { SharedSnapshot } from '@/phase4/types';

export class ClaudeSnapshotDatabase extends Dexie {
  snapshots!: Table<SharedSnapshot, string>;

  constructor() {
    super('ClaudeSnapshotDB');
    this.version(1).stores({
      snapshots: 'id, shortCode, title, createdAt',
    });
  }
}

export const snapshotDb = new ClaudeSnapshotDatabase();

// ── CRUD operations ───────────────────────────────────────────────────────────

export async function saveSnapshot(snapshot: SharedSnapshot): Promise<string> {
  await snapshotDb.snapshots.put(snapshot);
  return snapshot.id;
}

export async function getAllSnapshots(): Promise<SharedSnapshot[]> {
  return await snapshotDb.snapshots.orderBy('createdAt').reverse().toArray();
}

export async function getSnapshotById(idOrSlug: string): Promise<SharedSnapshot | undefined> {
  const direct = await snapshotDb.snapshots.get(idOrSlug);
  if (direct) return direct;
  const all = await snapshotDb.snapshots.toArray();
  return all.find((s) => s.shortCode === idOrSlug || s.metadata.customSlug === idOrSlug);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await snapshotDb.snapshots.delete(id);
}

export async function getSnapshotCount(): Promise<number> {
  return await snapshotDb.snapshots.count();
}

export async function incrementSnapshotViews(id: string): Promise<number> {
  const item = await snapshotDb.snapshots.get(id);
  if (item) {
    const updatedViews = (item.metadata.viewsCount || 0) + 1;
    await snapshotDb.snapshots.update(id, {
      metadata: { ...item.metadata, viewsCount: updatedViews },
    });
    return updatedViews;
  }
  return 0;
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  saveSnapshotToSupabase,
  getSnapshotFromSupabase,
  deleteSnapshotFromSupabase,
  incrementSnapshotViewsInSupabase,
  isSupabaseConfigured
} from '@/lib/supabase';

const SNAPSHOT_CACHE_FILE = path.join(process.cwd(), 'src', 'phase4', 'snapshots_cache.json');

interface SnapshotCache {
  snapshots: Record<string, any>;
}

function readSnapshotsCache(): SnapshotCache {
  try {
    if (fs.existsSync(SNAPSHOT_CACHE_FILE)) {
      const data = fs.readFileSync(SNAPSHOT_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Error reading snapshot cache:', err);
  }
  return { snapshots: {} };
}

function writeSnapshotsCache(cache: SnapshotCache) {
  try {
    const dir = path.dirname(SNAPSHOT_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SNAPSHOT_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    // Expected on read-only environments like Vercel serverless
    console.warn('Local disk write skipped (read-only environment):', err);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(req: Request) {
  try {
    const snapshot = await req.json();
    if (!snapshot || !snapshot.id || !snapshot.messages) {
      return NextResponse.json(
        { success: false, error: 'Invalid snapshot payload' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 1. Save to Supabase table
    let supabaseSaved = false;
    if (isSupabaseConfigured()) {
      const sbResult = await saveSnapshotToSupabase(snapshot);
      if (sbResult.success) {
        supabaseSaved = true;
      } else {
        console.warn('[API/Share] Supabase save returned error:', sbResult.error);
      }
    }

    // 2. Also keep local disk cache in dev mode
    try {
      const cache = readSnapshotsCache();
      cache.snapshots[snapshot.id] = snapshot;
      if (snapshot.shortCode) {
        cache.snapshots[snapshot.shortCode] = snapshot;
      }
      if (snapshot.metadata?.customSlug) {
        cache.snapshots[snapshot.metadata.customSlug] = snapshot;
      }
      writeSnapshotsCache(cache);
    } catch {
      // Ignore if on read-only filesystem
    }

    return NextResponse.json(
      {
        success: true,
        snapshot,
        supabaseStored: supabaseSaved,
        shareUrl: `/share/${snapshot.shortCode || snapshot.id}`
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Share creation error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    const cache = readSnapshotsCache();
    return NextResponse.json(
      { success: true, snapshots: Object.values(cache.snapshots) },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // 1. Query Supabase
  let snapshot = await getSnapshotFromSupabase(id);

  // 2. Fallback to local cache if not found in Supabase
  if (!snapshot) {
    const cache = readSnapshotsCache();
    snapshot = cache.snapshots[id] || null;
  }

  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: 'Snapshot not found or link has been removed' },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Increment view count asynchronously in Supabase
  incrementSnapshotViewsInSupabase(id);

  return NextResponse.json(
    { success: true, snapshot },
    { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    // Also check JSON body if not in query param
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || body?.shortCode;
      } catch {
        // body wasn't JSON
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Snapshot ID is required for deletion' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 1. Delete from Supabase
    let supabaseDeleted = false;
    if (isSupabaseConfigured()) {
      const sbResult = await deleteSnapshotFromSupabase(id);
      supabaseDeleted = sbResult.success;
    }

    // 2. Delete from local cache
    try {
      const cache = readSnapshotsCache();
      let modified = false;

      // Find all keys matching this id or shortCode
      Object.keys(cache.snapshots).forEach((key) => {
        const snap = cache.snapshots[key];
        if (key === id || snap?.id === id || snap?.shortCode === id || snap?.metadata?.customSlug === id) {
          delete cache.snapshots[key];
          modified = true;
        }
      });

      if (modified) {
        writeSnapshotsCache(cache);
      }
    } catch {
      // Ignore if read-only
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Shared snapshot deleted successfully from table',
        supabaseDeleted
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error deleting snapshot' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

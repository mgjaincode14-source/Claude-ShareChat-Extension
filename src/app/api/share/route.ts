import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    console.warn('Error writing snapshot cache:', err);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const cache = readSnapshotsCache();
    cache.snapshots[snapshot.id] = snapshot;
    if (snapshot.shortCode) {
      cache.snapshots[snapshot.shortCode] = snapshot;
    }
    if (snapshot.metadata?.customSlug) {
      cache.snapshots[snapshot.metadata.customSlug] = snapshot;
    }

    writeSnapshotsCache(cache);

    return NextResponse.json(
      {
        success: true,
        snapshot,
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

  const cache = readSnapshotsCache();

  if (!id) {
    return NextResponse.json(
      { success: true, snapshots: Object.values(cache.snapshots) },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const snapshot = cache.snapshots[id];

  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: 'Snapshot not found' },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  return NextResponse.json(
    { success: true, snapshot },
    { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

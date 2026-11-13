import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  saveSnapshotToSupabase,
  getSnapshotFromSupabase,
  deleteSnapshotFromSupabase,
  incrementSnapshotViewsInSupabase,
  isSupabaseConfigured
} from '@/lib/supabase';

// ─── Payload Limits ─────────────────────────────────────────────────────────
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024; // 8 MB hard cap
const MAX_MESSAGES = 300;

// ─── CORS Headers ───────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ─── Passcode Hashing (SHA-256 — fast & serverless-compatible) ───────────────
function hashPasscode(raw: string): string {
  return crypto.createHash('sha256').update(raw.trim()).digest('hex');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// ─── POST /api/share ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // Guard: check raw Content-Length before even parsing
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: `Payload too large. Maximum allowed size is ${MAX_PAYLOAD_BYTES / 1024 / 1024} MB.` },
        { status: 413, headers: CORS_HEADERS }
      );
    }

    const snapshot = await req.json();
    if (!snapshot || !snapshot.id || !snapshot.messages) {
      return NextResponse.json(
        { success: false, error: 'Invalid snapshot payload' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Guard: message count limit
    if (Array.isArray(snapshot.messages) && snapshot.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { success: false, error: `Too many messages. Maximum ${MAX_MESSAGES} messages per snapshot.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Security: Hash passcode server-side before persisting ────────────────
    // The raw passcode never leaves this function. Only the SHA-256 hash is stored.
    const rawPasscode: string | undefined = snapshot.metadata?.passcode;
    const snapshotToStore = { ...snapshot };

    if (rawPasscode) {
      snapshotToStore.metadata = {
        ...snapshot.metadata,
        passcode: hashPasscode(rawPasscode),     // store the hash, never the plaintext
        passcodeProtected: true                  // flag for the GET handler / viewer
      };
    } else {
      snapshotToStore.metadata = {
        ...snapshot.metadata,
        passcode: undefined,
        passcodeProtected: false
      };
    }

    // ── Handle expiration: store expiresAt if provided ───────────────────────
    if (snapshot.metadata?.expiresAt) {
      snapshotToStore.metadata.expiresAt = snapshot.metadata.expiresAt;
    }

    // ── Supabase: primary persistence ────────────────────────────────────────
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Storage not configured. Please set SUPABASE environment variables.'
        },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const sbResult = await saveSnapshotToSupabase(snapshotToStore);
    if (!sbResult.success) {
      console.error('[API/Share] Supabase save error:', sbResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to persist snapshot. Please try again.' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        supabaseStored: true,
        shareUrl: `/share/${snapshotToStore.metadata?.customSlug || snapshotToStore.shortCode || snapshotToStore.id}`
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Share creation error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── GET /api/share?id=... ───────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Snapshot ID is required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Storage not configured' },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  const snapshot = await getSnapshotFromSupabase(id);

  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: 'Snapshot not found or link has been removed' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Check expiration
  if (snapshot.metadata?.expiresAt) {
    const expiresAt = new Date(snapshot.metadata.expiresAt);
    if (expiresAt < new Date()) {
      // Auto-delete expired snapshots
      deleteSnapshotFromSupabase(id).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'This share link has expired.' },
        { status: 410, headers: CORS_HEADERS }
      );
    }
  }

  // ── Passcode-protected: strip messages & return only metadata for the gate UI
  if (snapshot.metadata?.passcodeProtected) {
    const { messages: _messages, ...safeSnapshot } = snapshot as any;
    return NextResponse.json(
      {
        success: true,
        snapshot: {
          ...safeSnapshot,
          messages: [],           // messages withheld until verified
          _locked: true
        }
      },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // Increment view count asynchronously
  incrementSnapshotViewsInSupabase(id).catch(() => {});

  return NextResponse.json(
    { success: true, snapshot },
    { status: 200, headers: CORS_HEADERS }
  );
}

// ─── DELETE /api/share?id=...&token=... ──────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const token = searchParams.get('token');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Snapshot ID is required for deletion' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Storage not configured' },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // Verify deletion token if snapshot has one
    const snapshot = await getSnapshotFromSupabase(id);
    if (snapshot && snapshot.metadata?.deletionToken) {
      if (!token || token !== snapshot.metadata.deletionToken) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing deletion token.' },
          { status: 403, headers: CORS_HEADERS }
        );
      }
    }

    const sbResult = await deleteSnapshotFromSupabase(id);

    return NextResponse.json(
      {
        success: sbResult.success,
        message: sbResult.success
          ? 'Shared snapshot deleted successfully'
          : 'Delete failed',
        error: sbResult.error
      },
      { status: sbResult.success ? 200 : 500, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error deleting snapshot' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── POST /api/share/verify ──────────────────────────────────────────────────
// Separate passcode verification endpoint — returns messages only on success
export async function PATCH(req: Request) {
  try {
    const { id, passcode } = await req.json();

    if (!id || !passcode) {
      return NextResponse.json(
        { success: false, error: 'ID and passcode are required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Storage not configured' },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    const snapshot = await getSnapshotFromSupabase(id);
    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'Snapshot not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Check expiration first
    if (snapshot.metadata?.expiresAt) {
      if (new Date(snapshot.metadata.expiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'This share link has expired.' },
          { status: 410, headers: CORS_HEADERS }
        );
      }
    }

    // Compare hashed passcode
    const submittedHash = hashPasscode(passcode);
    if (submittedHash !== snapshot.metadata?.passcode) {
      return NextResponse.json(
        { success: false, error: 'Incorrect passcode.' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Passcode matches — return full snapshot with messages
    incrementSnapshotViewsInSupabase(id).catch(() => {});

    return NextResponse.json(
      { success: true, snapshot },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Verification error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

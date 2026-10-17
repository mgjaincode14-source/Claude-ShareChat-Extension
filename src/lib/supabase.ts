import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SharedSnapshot } from '@/phase4/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

let serverClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));
}

/**
 * Server-side Supabase client with Service Role privileges (bypasses RLS for API routes)
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  }
  return serverClient;
}

/**
 * Public client for client-side or anon queries
 */
export function getSupabasePublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!publicClient) {
    publicClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return publicClient;
}

/**
 * Save snapshot to Supabase `shared_snapshots` table
 */
export async function saveSnapshotToSupabase(snapshot: SharedSnapshot): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseServerClient() || getSupabasePublicClient();
  if (!client) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  try {
    const { error } = await client
      .from('shared_snapshots')
      .upsert({
        id: snapshot.id,
        short_code: snapshot.shortCode || snapshot.id,
        title: snapshot.title || 'Claude Conversation',
        data: snapshot,
        views_count: snapshot.metadata?.viewsCount || 0,
        created_at: snapshot.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] Error saving snapshot:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Unexpected error saving snapshot:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Retrieve snapshot by ID or shortCode from Supabase
 */
export async function getSnapshotFromSupabase(idOrShortCode: string): Promise<SharedSnapshot | null> {
  const client = getSupabaseServerClient() || getSupabasePublicClient();
  if (!client) return null;

  try {
    // 1. Try matching by short_code first
    const { data: byCode, error: codeErr } = await client
      .from('shared_snapshots')
      .select('data')
      .eq('short_code', idOrShortCode)
      .maybeSingle();

    if (byCode && byCode.data) {
      return byCode.data as SharedSnapshot;
    }

    // 2. Try matching by primary ID
    const { data: byId, error: idErr } = await client
      .from('shared_snapshots')
      .select('data')
      .eq('id', idOrShortCode)
      .maybeSingle();

    if (byId && byId.data) {
      return byId.data as SharedSnapshot;
    }

    if (codeErr && idErr) {
      console.warn('[Supabase] Fetch error:', codeErr.message || idErr.message);
    }

    return null;
  } catch (err) {
    console.warn('[Supabase] Unexpected error fetching snapshot:', err);
    return null;
  }
}

/**
 * Delete a snapshot from Supabase table by ID or shortCode
 */
export async function deleteSnapshotFromSupabase(idOrShortCode: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseServerClient() || getSupabasePublicClient();
  if (!client) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  try {
    // Delete where id or short_code matches
    const { error } = await client
      .from('shared_snapshots')
      .delete()
      .or(`id.eq.${idOrShortCode},short_code.eq.${idOrShortCode}`);

    if (error) {
      console.error('[Supabase] Error deleting snapshot:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Unexpected error deleting snapshot:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Increment view count for a snapshot in Supabase
 */
export async function incrementSnapshotViewsInSupabase(idOrShortCode: string): Promise<void> {
  const client = getSupabaseServerClient() || getSupabasePublicClient();
  if (!client) return;

  try {
    const { data } = await client
      .from('shared_snapshots')
      .select('id, views_count, data')
      .or(`id.eq.${idOrShortCode},short_code.eq.${idOrShortCode}`)
      .maybeSingle();

    if (data) {
      const nextViews = (data.views_count || 0) + 1;
      const updatedData = data.data ? {
        ...data.data,
        metadata: {
          ...(data.data.metadata || {}),
          viewsCount: nextViews
        }
      } : data.data;

      await client
        .from('shared_snapshots')
        .update({
          views_count: nextViews,
          data: updatedData
        })
        .eq('id', data.id);
    }
  } catch (err) {
    // Non-critical, do not block rendering
    console.warn('[Supabase] Failed to increment view count:', err);
  }
}

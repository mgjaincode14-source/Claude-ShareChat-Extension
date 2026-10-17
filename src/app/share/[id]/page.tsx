import { PublicSnapshotViewer } from '@/phase4/components/PublicSnapshotViewer';
import { SharedSnapshot } from '@/phase4/types';
import {
  getSnapshotFromSupabase,
  incrementSnapshotViewsInSupabase,
  isSupabaseConfigured
} from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

function getSnapshotFromDisk(id: string): SharedSnapshot | null {
  try {
    const file = path.join(process.cwd(), 'src', 'phase4', 'snapshots_cache.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (data.snapshots && data.snapshots[id]) {
        return data.snapshots[id];
      }
    }
  } catch (err) {
    console.warn('Error reading snapshot from disk cache:', err);
  }
  return null;
}

export default async function SharePage({ params }: SharePageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let snapshot: SharedSnapshot | null = null;

  // 1. Fetch from Supabase cloud database
  if (isSupabaseConfigured()) {
    snapshot = await getSnapshotFromSupabase(id);
    if (snapshot) {
      // Increment views count asynchronously
      incrementSnapshotViewsInSupabase(id);
    }
  }

  // 2. Fallback to local disk cache (useful during local development)
  if (!snapshot) {
    snapshot = getSnapshotFromDisk(id);
  }

  // 3. Not found in Supabase or local cache
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#f3f2ec] flex flex-col items-center justify-center p-6 text-center text-[#716f68] font-sans">
        <div className="bg-white border border-[#e5e2d8] rounded-3xl p-8 max-w-md w-full space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#ebe8df] text-[#141416] flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">404</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#141416]">Shared Snapshot Not Found</h2>
            <p className="text-xs text-[#716f68] mt-1.5 leading-relaxed">
              The public share link <code className="text-[#141416] bg-[#ebe8df] px-1.5 py-0.5 rounded font-mono">/share/{id}</code> is invalid, expired, or has been removed by the author.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-[#141416] bg-[#ebe8df] hover:bg-[#e0ded4] rounded-xl transition-colors"
            >
              Create Your Own Share Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <PublicSnapshotViewer snapshot={snapshot} />;
}

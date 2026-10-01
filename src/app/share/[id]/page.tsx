import { PublicSnapshotViewer } from '@/phase4/components/PublicSnapshotViewer';
import { getSnapshotById } from '@/phase4/snapshotStore';
import { SharedSnapshot } from '@/phase4/types';
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

  let snapshot = getSnapshotFromDisk(id);

  if (!snapshot) {
    snapshot = (await getSnapshotById(id)) || null;
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-400 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">404</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Shared Snapshot Not Found</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              The public share link <code className="text-amber-300 font-mono">/share/{id}</code> is invalid, expired, or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <PublicSnapshotViewer snapshot={snapshot} />;
}

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
    try {
      if (typeof window !== 'undefined') {
        snapshot = (await getSnapshotById(id)) || null;
      }
    } catch {
      snapshot = null;
    }
  }

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
              The public share link <code className="text-[#141416] bg-[#ebe8df] px-1.5 py-0.5 rounded font-mono">/share/{id}</code> is invalid, expired, or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <PublicSnapshotViewer snapshot={snapshot} />;
}

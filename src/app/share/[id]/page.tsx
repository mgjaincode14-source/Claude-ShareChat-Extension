import { PublicSnapshotViewer } from '@/phase4/components/PublicSnapshotViewer';
import { SharedSnapshot } from '@/phase4/types';
import {
  getSnapshotFromSupabase,
  isSupabaseConfigured,
  incrementSnapshotViewsInSupabase
} from '@/lib/supabase';
import type { Metadata } from 'next';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

// ─── Dynamic OpenGraph / Twitter metadata ────────────────────────────────────
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;

  let snapshot: SharedSnapshot | null = null;
  if (isSupabaseConfigured()) {
    snapshot = await getSnapshotFromSupabase(id);
  }

  if (!snapshot || (snapshot as any)._locked) {
    const fallbackOg = `/api/og?title=${encodeURIComponent('Shared Claude Conversation')}&msgs=0&redacted=0`;
    return {
      title: 'Shared Claude Conversation | Claude ShareChat',
      description: 'View a shared Claude conversation snippet on Claude ShareChat.',
      openGraph: {
        title: 'Shared Claude Conversation | Claude ShareChat',
        description: 'A privately-filtered and redacted Claude conversation shared via Claude ShareChat.',
        type: 'website',
        images: [{ url: fallbackOg, width: 1200, height: 630 }]
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Shared Claude Conversation | Claude ShareChat',
        description: 'View a shared Claude conversation snippet.',
        images: [fallbackOg]
      }
    };
  }

  const msgCount = snapshot.metadata?.totalMessages || snapshot.messages?.length || 0;
  const redactionNote = snapshot.metadata?.totalRedacted > 0
    ? ` · ${snapshot.metadata.totalRedacted} items redacted for privacy`
    : ' · No redactions applied';

  const description = `${msgCount} messages from ${snapshot.dateRange?.start || 'unknown'} to ${snapshot.dateRange?.end || 'unknown'}${redactionNote}. Shared via Claude ShareChat.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(snapshot.title)}&msgs=${msgCount}&redacted=${snapshot.metadata?.totalRedacted || 0}`;

  return {
    title: `${snapshot.title} | Claude ShareChat`,
    description,
    openGraph: {
      title: snapshot.title,
      description,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: snapshot.title }]
    },
    twitter: {
      card: 'summary_large_image',
      title: snapshot.title,
      description,
      images: [ogImageUrl]
    }
  };
}

// ─── Share Page ───────────────────────────────────────────────────────────────
export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  let snapshot: SharedSnapshot | null = null;

  if (isSupabaseConfigured()) {
    snapshot = await getSnapshotFromSupabase(id);
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
              The public share link <code className="text-[#141416] bg-[#ebe8df] px-1.5 py-0.5 rounded font-mono">/share/{id}</code>{' '}
              is invalid, expired, or has been removed by the author.
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

  // Check expiration server-side
  if (snapshot.metadata?.expiresAt && new Date(snapshot.metadata.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-[#f3f2ec] flex flex-col items-center justify-center p-6 text-center text-[#716f68] font-sans">
        <div className="bg-white border border-[#e5e2d8] rounded-3xl p-8 max-w-md w-full space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <span className="text-xl">⏰</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#141416]">Share Link Expired</h2>
            <p className="text-xs text-[#716f68] mt-1.5 leading-relaxed">
              This shared snapshot expired on{' '}
              <strong>{new Date(snapshot.metadata.expiresAt).toLocaleDateString()}</strong> and is no longer accessible.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-[#cc5a36] hover:bg-[#b84b29] rounded-full transition-colors"
          >
            Create Your Own Share Link
          </a>
        </div>
      </div>
    );
  }

  // If passcode-protected: strip messages — the client PasscodeGate will PATCH /api/share to verify & fetch
  if (snapshot.metadata?.passcodeProtected) {
    const { messages: _messages, ...safeSnap } = snapshot as any;
    const lockedSnapshot = { ...safeSnap, messages: [], _locked: true } as SharedSnapshot;
    return <PublicSnapshotViewer snapshot={lockedSnapshot} />;
  }

  // Increment view count asynchronously (non-blocking, fire-and-forget)
  incrementSnapshotViewsInSupabase(id).catch(() => {});

  return <PublicSnapshotViewer snapshot={snapshot} />;
}

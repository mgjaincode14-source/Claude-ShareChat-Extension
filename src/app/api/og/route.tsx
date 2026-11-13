import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Using 'nodejs' runtime — the Edge Runtime is deprecated in Next.js 16+.
// ImageResponse works fine on nodejs runtime.
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Shared Claude Conversation';
  const msgs = parseInt(searchParams.get('msgs') || '0', 10);
  const redacted = parseInt(searchParams.get('redacted') || '0', 10);

  const displayTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#faf9f5',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background decorative accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: '#cc5a36'
          }}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px',
            justifyContent: 'space-between'
          }}
        >
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#cc5a36',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold'
              }}
            >
              C
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#6b6963', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                Claude ShareChat
              </span>
              <span style={{ fontSize: '12px', color: '#9e9b91', fontFamily: 'sans-serif' }}>
                Privacy-first conversation sharing
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: displayTitle.length > 40 ? '40px' : '52px',
                fontWeight: '700',
                color: '#1f1e1d',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                maxWidth: '900px'
              }}
            >
              {displayTitle}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  background: 'white',
                  border: '1px solid #e8e5dd',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  color: '#1f1e1d',
                  fontFamily: 'monospace'
                }}
              >
                💬 {msgs} message{msgs !== 1 ? 's' : ''}
              </div>

              {redacted > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    background: '#faf1ec',
                    border: '1px solid #f0d5cb',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    color: '#b84b29',
                    fontFamily: 'monospace'
                  }}
                >
                  🛡️ {redacted} item{redacted !== 1 ? 's' : ''} redacted
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  color: '#15803d',
                  fontFamily: 'monospace'
                }}
              >
                🔒 On-device privacy
              </div>
            </div>
          </div>

          {/* Footer row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #e8e5dd',
              paddingTop: '24px'
            }}
          >
            <span style={{ fontSize: '13px', color: '#9e9b91', fontFamily: 'sans-serif' }}>
              claudesharechat.vercel.app
            </span>
            <div
              style={{
                padding: '6px 16px',
                background: '#cc5a36',
                borderRadius: '9999px',
                color: 'white',
                fontSize: '13px',
                fontFamily: 'sans-serif',
                fontWeight: '500'
              }}
            >
              View Conversation →
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}


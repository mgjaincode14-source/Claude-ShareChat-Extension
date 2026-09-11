import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Extract UUID from Claude Share URL (e.g. https://claude.ai/share/791d8870-1931-45eb-a7b7-3110f50c4940)
    const uuidMatch = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const uuid = uuidMatch ? uuidMatch[0] : null;

    if (!uuid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Claude share link format. Expected format: https://claude.ai/share/<uuid>'
        },
        { status: 400 }
      );
    }

    const sharePageUrl = `https://claude.ai/share/${uuid}`;
    const snapshotApiUrl = `https://claude.ai/api/chat_snapshots/${uuid}?rendering_mode=messages&render_all_tools=true`;

    let fetchedData: any = null;
    let rawHtml = '';

    // Attempt 1: Fetch Anthropic's public chat_snapshots API endpoint
    try {
      const apiRes = await fetch(snapshotApiUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: sharePageUrl
        },
        next: { revalidate: 0 }
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json && (json.chat_messages || json.messages || json.snapshot)) {
          fetchedData = json;
        }
      }
    } catch (err: any) {
      console.warn('API snapshot fetch failed:', err.message);
    }

    // Attempt 2: Fetch share page HTML and extract __NEXT_DATA__
    if (!fetchedData) {
      try {
        const pageRes = await fetch(sharePageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          next: { revalidate: 0 }
        });

        if (pageRes.ok) {
          rawHtml = await pageRes.text();
          const nextDataMatch = rawHtml.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
          if (nextDataMatch && nextDataMatch[1]) {
            const nextData = JSON.parse(nextDataMatch[1]);
            const props = nextData.props?.pageProps;
            if (props) {
              fetchedData = props.snapshot || props.sharedConversation || props.conversation || props;
            }
          }
        }
      } catch (err: any) {
        console.warn('HTML page fetch failed:', err.message);
      }
    }

    // If real conversation payload was successfully fetched, return it
    if (fetchedData) {
      return NextResponse.json({
        success: true,
        uuid,
        sharePageUrl,
        rawConversation: fetchedData
      });
    }

    // NO DUMMY FALLBACKS!
    // Return explicit status indicating Cloudflare blocked automated server fetch
    return NextResponse.json(
      {
        success: false,
        uuid,
        sharePageUrl,
        isCloudflareBlocked: true,
        error: `Claude.ai requires browser verification for shared link (${uuid.substring(
          0,
          8
        )}...). Copy and paste the conversation text or page HTML from your browser into the Paste tab to import the REAL conversation instantly!`
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Claude share link' },
      { status: 500 }
    );
  }
}

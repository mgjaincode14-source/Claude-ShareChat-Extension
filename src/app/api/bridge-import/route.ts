import { NextResponse } from 'next/server';
import { parseClaudeConversationObject } from '@/phase1/parser';
import fs from 'fs';
import path from 'path';

// Dual-tier cache: in-memory (always accessible within runtime) + filesystem (/tmp on Vercel, local file in dev)
interface BridgeCache {
  lastImportId: string | null;
  conversations: any[];
}

let inMemoryCache: BridgeCache = { lastImportId: null, conversations: [] };

function getCacheFilePath(): string {
  // On Vercel or other serverless lambdas, only /tmp is guaranteed writable
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'bridged_cache.json');
  }
  return path.join(process.cwd(), 'src', 'phase1', 'bridged_cache.json');
}

function readCache(): BridgeCache {
  // 1. Prefer in-memory if populated
  if (inMemoryCache.conversations.length > 0) {
    return inMemoryCache;
  }

  // 2. Try primary path, then fallback to /tmp
  const pathsToTry = [
    getCacheFilePath(),
    path.join('/tmp', 'bridged_cache.json'),
    path.join(process.cwd(), 'src', 'phase1', 'bridged_cache.json')
  ];

  for (const filePath of pathsToTry) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        const fileData = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
        const parsed = JSON.parse(fileData);
        const resolved: BridgeCache = Array.isArray(parsed)
          ? { lastImportId: parsed.length > 0 ? parsed[0].id : null, conversations: parsed }
          : parsed;

        if (resolved.conversations && resolved.conversations.length > 0) {
          inMemoryCache = resolved;
          return resolved;
        }
      }
    } catch (_) {}
  }

  return inMemoryCache;
}

function writeCache(cache: BridgeCache) {
  inMemoryCache = cache;

  const pathsToTry = [
    getCacheFilePath(),
    path.join('/tmp', 'bridged_cache.json')
  ];

  for (const filePath of pathsToTry) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), 'utf-8');
      break; // Successfully written
    } catch (_) {
      // Continue to next fallback path
    }
  }
}

// Handle CORS Pre-flight OPTIONS request
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
    const rawPayload = await req.json();

    if (!rawPayload) {
      return NextResponse.json(
        { success: false, error: 'Empty payload received' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const cache = readCache();
    const importedConvs: any[] = [];

    // Support both single conversation and batch conversations list
    const convItems: any[] = Array.isArray(rawPayload)
      ? rawPayload
      : Array.isArray(rawPayload.conversations)
      ? rawPayload.conversations
      : [rawPayload];

    for (const item of convItems) {
      if (item && (item.chat_messages || item.messages)) {
        const unifiedConv = parseClaudeConversationObject(item, 'browser_extension');
        importedConvs.push(unifiedConv);
        // Deduplicate in cache
        cache.conversations = cache.conversations.filter((c) => c.id !== unifiedConv.id);
        cache.conversations.unshift(unifiedConv);
      }
    }

    if (importedConvs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload structure: no chat_messages or messages array found' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Set last imported conversation
    cache.lastImportId = importedConvs[0].id;
    writeCache(cache);

    return NextResponse.json(
      {
        success: true,
        conversation: importedConvs[0],
        totalImported: importedConvs.length,
        message: `Successfully bridged ${importedConvs[0].messages.length} message(s) with original Claude database timestamps`
      },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Bridge import error' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

export async function GET() {
  const cache = readCache();
  return NextResponse.json(
    {
      success: true,
      lastImportId: cache.lastImportId,
      latestConversations: cache.conversations
    },
    {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  );
}

import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────
//  /api/figma-data
//
//  Simple in-memory store for the latest banner payload.
//  The web tool (Screen 6) POSTs here when "Push to Figma" is clicked.
//  The Figma plugin GETs here to retrieve the data and apply it to layers.
//
//  Note: module-level variable resets on cold start — fine for demo use.
//  For production, replace with Vercel KV or a database.
// ─────────────────────────────────────────────────────────────────

export interface BannerPayload {
  eyebrow?:       string;
  headline:       string;
  subtext?:       string;
  cta:            string;
  backgroundUrl:  string;
  classification: string;
  template:       string;
  pushedAt:       string;
}

// Module-level store (survives warm function instances)
let latestPayload: BannerPayload | null = null;

// GET — plugin calls this to retrieve latest banner data
export async function GET() {
  if (!latestPayload) {
    return NextResponse.json(
      { error: 'No banner data available yet. Run a campaign through the banner tool first.' },
      { status: 404 }
    );
  }
  return NextResponse.json(latestPayload, {
    headers: {
      // Allow the Figma plugin iframe to fetch this
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}

// POST — Screen 6 calls this when "Push to Figma" is clicked
export async function POST(req: NextRequest) {
  try {
    const body: BannerPayload = await req.json();
    if (!body.headline || !body.backgroundUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: headline, backgroundUrl' },
        { status: 400 }
      );
    }
    latestPayload = { ...body, pushedAt: new Date().toISOString() };
    return NextResponse.json({ success: true, pushedAt: latestPayload.pushedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request body' },
      { status: 400 }
    );
  }
}

// OPTIONS — handle CORS preflight from plugin
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

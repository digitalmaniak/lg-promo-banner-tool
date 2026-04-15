import { NextRequest, NextResponse } from 'next/server';
import type { BannerConfig } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/render
//  Body: { bannerConfig: BannerConfig }
//  Returns: { previewUrl: string }
//
//  Production: use Sharp, Canvas API, or a headless-browser
//  service (Playwright, Puppeteer) to composite the banner server-side.
//  Stub: returns the background URL as a stand-in preview.
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { bannerConfig }: { bannerConfig: BannerConfig } = await req.json();

    if (!bannerConfig) {
      return NextResponse.json({ error: 'Missing bannerConfig' }, { status: 400 });
    }

    // TODO: Implement server-side compositing with Sharp or Playwright
    // 1. Fetch background image as buffer
    // 2. Place product image with background removal
    // 3. Overlay gradient + copy text
    // 4. Return as base64 data URL or upload to object storage

    // Stub: return the background URL as the "preview"
    const previewUrl = bannerConfig.backgroundUrl
      ?? bannerConfig.productImageUrl
      ?? null;

    return NextResponse.json({ previewUrl });
  } catch (err) {
    console.error('[/api/render]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Render failed' },
      { status: 500 }
    );
  }
}

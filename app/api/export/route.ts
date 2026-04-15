import { NextRequest, NextResponse } from 'next/server';
import type { BannerConfig, ExportConfig } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/export
//  Body: { bannerConfig, exportConfig }
//  Returns: { files: { label: string; url: string }[] }
//
//  Production: resize + re-encode with Sharp for each
//  requested size/format combination, then stream as a ZIP
//  or return signed S3/R2 download URLs.
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { bannerConfig, exportConfig }: { bannerConfig: BannerConfig; exportConfig: ExportConfig } = await req.json();

    if (!bannerConfig || !exportConfig) {
      return NextResponse.json({ error: 'Missing config' }, { status: 400 });
    }

    // TODO: Implement server-side export with Sharp
    // For each size × format combination:
    // 1. Fetch the rendered banner at full resolution
    // 2. Resize with Sharp: sharp(buffer).resize(w, h).jpeg/png/webp({ quality: 90 })
    // 3. Upload to R2/S3 or return as base64 data URL
    // 4. Return download URLs

    // Stub: return the background URL for each requested size
    const files = exportConfig.sizes.flatMap((size) =>
      exportConfig.formats.map((fmt) => ({
        label: `${size.label} (${size.width}×${size.height}).${fmt}`,
        url:   bannerConfig.backgroundUrl ?? '#',
      }))
    );

    return NextResponse.json({ files });
  } catch (err) {
    console.error('[/api/export]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}

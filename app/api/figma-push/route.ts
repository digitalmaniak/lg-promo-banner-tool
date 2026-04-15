import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────
//  POST /api/figma-push
//  Body: { bannerConfig, previewUrl, figmaFrameId }
//  Returns: { figmaUrl: string }
//
//  Production: use the Figma REST API to create an image fill
//  on a target frame, or use the Figma Plugin API.
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { previewUrl, figmaFrameId } = await req.json();

    const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
    const figmaFileId = process.env.FIGMA_FILE_ID;

    if (!figmaToken || !figmaFileId) {
      return NextResponse.json(
        { error: 'Figma integration not configured. Set FIGMA_ACCESS_TOKEN and FIGMA_FILE_ID.' },
        { status: 503 }
      );
    }

    // TODO: Implement Figma API push
    // 1. Upload image to Figma:  POST /v1/images/{file_key}
    // 2. Apply image fill to frame using the returned imageRef
    // 3. Return the Figma URL to the target frame

    const figmaUrl = figmaFrameId
      ? `https://www.figma.com/file/${figmaFileId}?node-id=${figmaFrameId}`
      : `https://www.figma.com/file/${figmaFileId}`;

    return NextResponse.json({ figmaUrl, success: true });
  } catch (err) {
    console.error('[/api/figma-push]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Figma push failed' },
      { status: 500 }
    );
  }
}

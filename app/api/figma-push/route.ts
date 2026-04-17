import { NextRequest, NextResponse } from 'next/server';
import type { CopyVariant, ClassificationResult } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────
//  POST /api/figma-push
//
//  Two-stage Figma push using the Figma REST API:
//
//  Stage 1 (implemented):
//    1. Upload the Ideogram background to Figma's image CDN
//       → POST /v1/files/:key/images  →  returns imageRef hash
//    2. Post an anchored handoff comment on the template frame
//       containing classification, all copy, the imageRef, and
//       the direct background URL — everything the designer needs.
//
//  Stage 2 (future — requires Figma Plugin or Edit API):
//    - Apply imageRef as fill on the frame node
//    - Create text layers (headline, subtext, CTA, eyebrow)
//    - Apply LG EI font styles to each layer
//
//  Required env vars:
//    FIGMA_ACCESS_TOKEN  — Personal access token from Figma settings
//    FIGMA_FILE_KEY      — Optional override (defaults to the LG template file)
// ─────────────────────────────────────────────────────────────────

const DEFAULT_FILE_KEY  = 'HydPuuhmZq0TnutHFDB6mG'; // LG Promo Banner Test Template
const DEFAULT_NODE_ID   = '0:1';                       // Root frame (node-id=0-1 in URL)

interface PushBody {
  selectedCopy?:    CopyVariant;
  classification?:  ClassificationResult;
  backgroundUrl?:   string;
  figmaFrameId?:    string;   // optional override node id from Screen 6 input
  figmaFileKey?:    string;   // optional override file key
}

export async function POST(req: NextRequest) {
  try {
    const body: PushBody = await req.json();
    const {
      selectedCopy,
      classification,
      backgroundUrl,
      figmaFrameId,
      figmaFileKey,
    } = body;

    const token   = process.env.FIGMA_ACCESS_TOKEN;
    const fileKey = figmaFileKey || process.env.FIGMA_FILE_KEY || DEFAULT_FILE_KEY;
    const nodeId  = figmaFrameId ? figmaFrameId.replace('-', ':') : DEFAULT_NODE_ID;

    if (!token) {
      return NextResponse.json(
        { error: 'FIGMA_ACCESS_TOKEN not set. Add it in Vercel → Settings → Environment Variables.' },
        { status: 503 }
      );
    }

    const figmaHeaders = {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
    };

    // ── Step 1: Verify the file is accessible ────────────────────
    const verifyRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?depth=1`,
      { headers: figmaHeaders }
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Figma auth failed (${verifyRes.status}): ${err?.message ?? 'Check your access token and file key.'}` },
        { status: verifyRes.status }
      );
    }

    const fileData = await verifyRes.json();
    const fileName = fileData?.name ?? 'LG Promo Banner Template';

    // ── Step 2: Upload background image to Figma's CDN ───────────
    let imageRef: string | null = null;

    if (backgroundUrl) {
      try {
        // Fetch the background image as a blob
        const imgRes  = await fetch(backgroundUrl);
        const imgBlob = await imgRes.arrayBuffer();
        const base64  = Buffer.from(imgBlob).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        const uploadRes = await fetch(
          `https://api.figma.com/v1/files/${fileKey}/images`,
          {
            method: 'POST',
            headers: {
              'X-Figma-Token': token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data:          `data:${mimeType};base64,${base64}`,
              content_type:  mimeType,
            }),
          }
        );

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // imageRef is the hash key in the returned images map
          const refs = uploadData?.meta?.images ?? uploadData?.images ?? {};
          imageRef = Object.keys(refs)[0] ?? null;
        }
      } catch (imgErr) {
        // Non-fatal — we still post the comment with the direct URL
        console.warn('[figma-push] Image upload failed, falling back to URL:', imgErr);
      }
    }

    // ── Step 3: Build the handoff comment ────────────────────────
    const ts        = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const typeLabel = classification?.type    ?? 'Unknown';
    const template  = classification?.template ?? 'unknown';
    const score     = classification?.confidence ? `${Math.round(classification.confidence * 100)}%` : '—';

    const commentLines: string[] = [
      `🚀 LG Promo Banner — AI Handoff  [${ts}]`,
      ``,
      `📋 CLASSIFICATION`,
      `  Type:       ${typeLabel}`,
      `  Template:   ${template}`,
      `  Confidence: ${score}`,
      `  Reasoning:  ${classification?.reasoning ?? '—'}`,
      ``,
      `✍️  COPY ELEMENTS`,
    ];

    if (selectedCopy?.eyebrow) {
      commentLines.push(`  Eyebrow:  ${selectedCopy.eyebrow}`);
    }
    commentLines.push(`  Headline: ${selectedCopy?.headline ?? '—'}`);
    if (selectedCopy?.subtext) {
      commentLines.push(`  Subtext:  ${selectedCopy.subtext}`);
    }
    commentLines.push(`  CTA:      ${selectedCopy?.cta ?? '—'}`);
    commentLines.push(``);

    if (backgroundUrl) {
      commentLines.push(`🖼️  BACKGROUND IMAGE`);
      commentLines.push(`  Direct URL: ${backgroundUrl}`);
      if (imageRef) {
        commentLines.push(`  Figma imageRef: ${imageRef}`);
      }
      commentLines.push(``);
    }

    commentLines.push(`⚙️  NEXT STEPS FOR DESIGNER`);
    commentLines.push(`  1. Place background image on the hero frame (1600×600)`);
    commentLines.push(`  2. Apply LG EI Headline Bold to headline layer`);
    commentLines.push(`  3. Apply LG EI Text Regular to subtext layer`);
    commentLines.push(`  4. Set CTA button fill to #B00020`);
    commentLines.push(`  5. Resolve this comment when complete ✓`);
    commentLines.push(``);
    commentLines.push(`Generated by HSAD AX Services — LG Promo Banner Tool`);

    const commentMessage = commentLines.join('\n');

    // ── Step 4: Post comment anchored to the template frame ──────
    const commentBody: Record<string, unknown> = {
      message:     commentMessage,
      client_meta: {
        node_id:     nodeId,
        node_offset: { x: 0, y: 0 },
      },
    };

    const commentRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/comments`,
      {
        method:  'POST',
        headers: figmaHeaders,
        body:    JSON.stringify(commentBody),
      }
    );

    if (!commentRes.ok) {
      const errData = await commentRes.json().catch(() => ({}));
      throw new Error(`Comment post failed (${commentRes.status}): ${errData?.message ?? 'Unknown error'}`);
    }

    const commentData = await commentRes.json();
    const commentId   = commentData?.id ?? '';

    // ── Step 5: Build return URL ──────────────────────────────────
    const figmaUrl = `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(':', '-')}`;

    return NextResponse.json({
      success:    true,
      figmaUrl,
      fileName,
      commentId,
      imageRef,
      pushedAt:   new Date().toISOString(),
      summary: {
        type:         typeLabel,
        template,
        headline:     selectedCopy?.headline ?? '',
        backgroundUrl: backgroundUrl ?? '',
        imageUploaded: !!imageRef,
      },
    });

  } catch (err) {
    console.error('[/api/figma-push]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Figma push failed' },
      { status: 500 }
    );
  }
}

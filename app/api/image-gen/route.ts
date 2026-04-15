import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, CopyVariant, ImageSpec, GeneratedBackground } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/image-gen
//  Body: { brief, classification, selectedCopy }
//  Returns: { imageSpec: ImageSpec, backgrounds: GeneratedBackground[] }
//
//  In production, integrate Ideogram v2 or Midjourney v7 here.
//  This stub returns mock placeholder URLs so the gallery renders.
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const {
      brief,
      classification,
      selectedCopy,
    }: {
      brief: BriefData;
      classification: ClassificationResult;
      selectedCopy?: CopyVariant;
    } = await req.json();

    if (!brief || !classification) {
      return NextResponse.json({ error: 'Missing brief or classification' }, { status: 400 });
    }

    const ideogramKey  = process.env.IDEOGRAM_API_KEY;
    const midjourneyKey = process.env.MIDJOURNEY_API_KEY;

    // ── Build the scene prompt ────────────────────────────────────────
    const colorPalette = buildColorPalette(classification.type);
    const sceneContext  = buildSceneContext(brief, classification);

    const imageSpec: ImageSpec = {
      prompt: buildPrompt(brief, classification, sceneContext),
      negativePrompt: 'text, watermark, logo, people, faces, blurry, low quality, oversaturated, cluttered, busy background',
      aspectRatio: '3:1',
      style: classification.type === 'Brand' || classification.type === 'NPI' ? 'cinematic' : 'photorealistic',
      colorPalette,
      modelUsed: ideogramKey ? 'ideogram' : midjourneyKey ? 'midjourney' : 'mock',
    };

    // ── Production: call Ideogram API ─────────────────────────────────
    if (ideogramKey) {
      const ideoRes = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': ideogramKey,
        },
        body: JSON.stringify({
          image_request: {
            prompt: imageSpec.prompt,
            negative_prompt: imageSpec.negativePrompt,
            aspect_ratio: 'ASPECT_3_1',
            model: 'V_2',
            style_type: 'REALISTIC',
            magic_prompt_option: 'AUTO',
            num_images: 6,
          },
        }),
      });

      if (!ideoRes.ok) throw new Error(`Ideogram API error: ${ideoRes.status}`);
      const ideoData = await ideoRes.json();

      const backgrounds: GeneratedBackground[] = (ideoData.data ?? []).map(
        (img: { url: string; seed?: number }, i: number) => ({
          id:    `bg_${Date.now()}_${i}`,
          url:   img.url,
          status: 'ready' as const,
          seed:  img.seed,
          prompt: imageSpec.prompt,
          generatedAt: new Date().toISOString(),
        })
      );

      return NextResponse.json({ imageSpec, backgrounds });
    }

    // ── Mock path: placeholder gradient images ─────────────────────────
    const MOCK_BACKGROUNDS = [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1600&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1600&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=1600&h=600&fit=crop&auto=format',
    ];

    const backgrounds: GeneratedBackground[] = MOCK_BACKGROUNDS.map((url, i) => ({
      id:     `bg_mock_${i}`,
      url,
      status: 'generating' as const,
      prompt: imageSpec.prompt,
      generatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({ imageSpec, backgrounds });
  } catch (err) {
    console.error('[/api/image-gen]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildPrompt(brief: BriefData, cls: ClassificationResult, scene: string): string {
  return `${scene}, ${cls.brandToneMatch.toLowerCase()} atmosphere, cinematic dark studio environment, dramatic moody lighting, deep blacks and subtle color gradients, ultra-wide banner composition, professional commercial photography style, 8k quality, no text, no people`;
}

function buildSceneContext(brief: BriefData, cls: ClassificationResult): string {
  const cat = brief.productCategory.toLowerCase();
  if (cat.includes('tv') || cat.includes('oled') || cat.includes('display')) {
    return 'sleek dark home theater environment, ambient light glow, minimalist living room, technology aesthetic';
  }
  if (cat.includes('refrigerator') || cat.includes('fridge')) {
    return 'modern kitchen with soft lighting, marble surfaces, clean minimal aesthetic';
  }
  if (cat.includes('washer') || cat.includes('dryer') || cat.includes('laundry')) {
    return 'contemporary laundry room, clean white surfaces, organized minimalist space';
  }
  if (cat.includes('phone') || cat.includes('mobile')) {
    return 'abstract dark background with soft bokeh, premium tech atmosphere, gradient lighting';
  }
  return 'dark premium lifestyle background, abstract bokeh, professional studio lighting';
}

function buildColorPalette(type: string): string[] {
  const palettes: Record<string, string[]> = {
    NPI:         ['#0D1117', '#1C2333', '#B00020', '#E6EDF3'],
    'Price Drop': ['#0D1117', '#1C2333', '#E6A817', '#E6EDF3'],
    'Event Sale': ['#0D1117', '#B00020', '#E6A817', '#FFFFFF'],
    Bundle:      ['#0D1117', '#1C2333', '#3B8BEB', '#E6EDF3'],
    Clearance:   ['#0D1117', '#B00020', '#E6EDF3', '#8B949E'],
    Brand:       ['#0D1117', '#1C2333', '#E6EDF3', '#8B949E'],
    Comparison:  ['#0D1117', '#1C2333', '#3FB950', '#E6EDF3'],
  };
  return palettes[type] ?? palettes['Brand'];
}

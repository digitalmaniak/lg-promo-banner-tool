import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, CopyVariant, ImageSpec, GeneratedBackground } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/image-gen
//  Body: { brief, classification, selectedCopy }
//  Returns: { imageSpec, backgrounds }
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { brief, classification, selectedCopy }: {
      brief: BriefData;
      classification: ClassificationResult;
      selectedCopy?: CopyVariant;
    } = await req.json();

    if (!brief || !classification) {
      return NextResponse.json({ error: 'Missing brief or classification' }, { status: 400 });
    }

    const ideogramKey = process.env.IDEOGRAM_API_KEY;

    // Build brand-aware prompt from template + type + category
    const prompt       = buildBrandPrompt(brief, classification, selectedCopy);
    const negPrompt    = buildNegativePrompt();
    const ideoStyle    = mapTemplateToStyle(classification.template);
    const ideoAspect   = 'ASPECT_16_9'; // Closest to LG hero banner ratio

    const imageSpec: ImageSpec = {
      prompt,
      negativePrompt: negPrompt,
      aspectRatio: '16:9',
      style: ideoStyle === 'RENDER_3D' ? 'cinematic' : 'photorealistic',
      colorPalette: buildColorPalette(classification.type),
      modelUsed: ideogramKey ? 'ideogram' : 'mock',
    };

    // ── Live Ideogram v2 path ─────────────────────────────────────────
    if (ideogramKey) {
      // Build 2 prompt variations for visual diversity across 4 images
      const promptVariations = [
        prompt,
        buildBrandPromptVariant(brief, classification, selectedCopy),
      ];

      const allBackgrounds: GeneratedBackground[] = [];

      for (let i = 0; i < promptVariations.length; i++) {
        const variantPrompt = promptVariations[i];

        const ideoRes = await fetch('https://api.ideogram.ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': ideogramKey,
          },
          body: JSON.stringify({
            image_request: {
              prompt:               variantPrompt,
              negative_prompt:      negPrompt,
              aspect_ratio:         ideoAspect,
              model:                'V_2',
              style_type:           ideoStyle,
              magic_prompt_option:  'AUTO',
              num_images:           2,
            },
          }),
        });

        if (!ideoRes.ok) {
          const errText = await ideoRes.text();
          throw new Error(`Ideogram API error ${ideoRes.status}: ${errText}`);
        }

        const ideoData = await ideoRes.json();

        const bgs: GeneratedBackground[] = (ideoData.data ?? []).map(
          (img: { url: string; seed?: number }, j: number) => ({
            id:          `bg_${Date.now()}_${i}_${j}`,
            url:         img.url,
            status:      'ready' as const,
            seed:        img.seed,
            prompt:      variantPrompt,
            generatedAt: new Date().toISOString(),
          })
        );

        allBackgrounds.push(...bgs);
      }

      return NextResponse.json({ imageSpec, backgrounds: allBackgrounds });
    }

    // ── Mock path: curated Unsplash placeholders by category ─────────
    const mockUrls = getMockUrls(brief, classification);
    const backgrounds: GeneratedBackground[] = mockUrls.map((url, i) => ({
      id:          `bg_mock_${i}`,
      url,
      status:      'ready' as const,
      prompt,
      generatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({ imageSpec, backgrounds });

  } catch (err) {
    console.error('[/api/image-gen]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Image generation failed' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
//  BRAND-AWARE PROMPT BUILDER
//  Follows LG Playbook template rules + real banner aesthetics
// ─────────────────────────────────────────────
function buildBrandPrompt(
  brief: BriefData,
  cls: ClassificationResult,
  copy?: CopyVariant
): string {
  const scene  = buildSceneByTemplate(brief, cls);
  const mood   = buildMoodByType(cls.type);
  const colors = buildColorDescription(cls.type);

  return [
    scene,
    mood,
    colors,
    'ultra-wide cinematic composition for a web hero banner',
    'professional commercial photography',
    'no text, no words, no logos, no people, no faces',
    '8K photorealistic quality, sharp focus',
    'negative space on left third for text overlay',
  ].filter(Boolean).join(', ');
}

function buildBrandPromptVariant(
  brief: BriefData,
  cls: ClassificationResult,
  copy?: CopyVariant
): string {
  // Second variation uses a slightly different angle/composition
  const scene  = buildSceneVariant(brief, cls);
  const mood   = buildMoodByType(cls.type);
  const colors = buildColorDescription(cls.type);

  return [
    scene,
    mood,
    colors,
    'wide banner composition with dramatic perspective',
    'professional advertising photography',
    'no text, no words, no logos, no people, no faces',
    '8K quality, cinematic depth of field',
    'clean open left side for copy placement',
  ].filter(Boolean).join(', ');
}

// Template → scene description (based on LG Playbook 4 template rules)
function buildSceneByTemplate(brief: BriefData, cls: ClassificationResult): string {
  const cat = (brief.productCategory || brief.keyMessage || '').toLowerCase();
  const template = cls.template;

  // Template NPI — Product Beauty Shot: dramatic studio, product-hero aesthetic
  if (template === 'npi_beauty_shot') {
    if (isLaptop(cat)) {
      return 'sleek modern laptop resting on a minimalist desk, cinematic dark studio with subtle gradient background, soft dramatic side lighting, premium tech atmosphere, bokeh depth of field';
    }
    if (isTV(cat)) {
      return 'premium OLED television in a sophisticated dark home theater, ambient glow, glossy reflection on dark floor, dramatic product lighting';
    }
    return 'premium consumer electronics product on dark studio surface, dramatic commercial lighting, bokeh background, launch-day energy';
  }

  // Template 1 — Lifestyle: authentic real-world environments
  if (template === 'lifestyle_hero') {
    if (isLaptop(cat)) {
      return 'bright modern home office with natural light, clean wood desk, open laptop in use, cozy productive atmosphere, warm morning light through large windows';
    }
    if (isAppliance(cat)) {
      return 'bright contemporary kitchen with marble countertops, modern appliances, natural light, clean and organized lifestyle aesthetic';
    }
    if (isSeasonal(cls.type)) {
      return 'lush spring garden with blooming flowers in soft pinks and whites, warm golden afternoon light, fresh clean atmosphere, seasonal abundance';
    }
    return 'modern bright living room with natural light, lifestyle home environment, warm and inviting atmosphere, contemporary decor';
  }

  // Template 2 — 3D Stage: immersive, products floating in dramatic space
  if (template === '3d_stage_hero') {
    if (isAppliance(cat)) {
      return 'dramatic studio scene with premium home appliances arranged on a floating stage, deep gradient background shifting from charcoal to light gray, volumetric light beams, professional product arrangement';
    }
    return 'multiple premium products floating on a dramatic gradient stage, deep space-like background, volumetric studio lighting, premium product showcase composition';
  }

  // Template 3 — El Shape: split panels, multi-scene
  if (template === 'el_shape_multi') {
    return 'clean split-panel composition with soft gradient dividers, multiple lifestyle zones suggesting different product uses, editorial magazine layout, neutral light gray tones';
  }

  // Template 4 — Promotional Badge: clean, airy, badge-forward
  if (template === 'promo_badge_hero') {
    if (isAppliance(cat)) {
      return 'bright clean white-to-light-gray gradient background, premium appliances subtly arranged on the right, open airy composition, promotional energy, soft studio lighting';
    }
    if (isLaptop(cat)) {
      return 'clean gradient background from white to light cool gray, modern laptop placed right of center, promotional commercial layout, bright professional lighting';
    }
    return 'clean bright gradient background, promotional commercial photography, airy open composition, soft studio lighting, product visible on right side';
  }

  // Fallback
  return 'premium modern background with subtle gradient, professional commercial composition, clean and minimal aesthetic';
}

// Second scene variant for visual diversity
function buildSceneVariant(brief: BriefData, cls: ClassificationResult): string {
  const cat = (brief.productCategory || brief.keyMessage || '').toLowerCase();

  if (isLaptop(cat)) {
    return 'overhead flat-lay of a premium laptop on textured linen surface, coffee cup and minimal accessories, warm ambient light, productivity lifestyle aesthetic, editorial composition';
  }
  if (isAppliance(cat)) {
    return 'wide shot of modern home interior with premium appliances visible, soft natural daylight from windows, clean Scandinavian minimalist aesthetic, light warm tones';
  }
  if (isTV(cat)) {
    return 'premium television mounted on light wall in modern living room, ambient lighting, minimalist decor, wide cinematic composition, muted neutral tones';
  }
  if (isSeasonal(cls.type)) {
    return 'abstract seasonal nature background with soft bokeh, cherry blossom petals, warm spring light, gentle gradient from cream to soft green, energetic and fresh';
  }
  return 'abstract gradient background with subtle bokeh, soft premium light, minimal depth composition, modern commercial aesthetic';
}

// Mood descriptor per promotion type
function buildMoodByType(type: string): string {
  const moods: Record<string, string> = {
    'NPI':         'aspirational premium atmosphere, excitement of new arrival, dark dramatic energy',
    'Price Drop':  'energetic promotional atmosphere, bright and confident savings energy',
    'Event Sale':  'seasonal celebration mood, fresh and optimistic, abundant and inviting',
    'Bundle':      'harmonious value composition, warm and complete, everything-you-need aesthetic',
    'Clearance':   'urgent last-chance energy, bold promotional atmosphere',
    'Brand':       'sophisticated premium brand atmosphere, quiet confidence, aspirational',
    'Comparison':  'clean analytical atmosphere, side-by-side clarity, confident brand positioning',
  };
  return moods[type] ?? 'professional premium brand atmosphere';
}

// Color direction per promotion type
function buildColorDescription(type: string): string {
  const colors: Record<string, string> = {
    'NPI':         'deep charcoal and slate tones, subtle crimson red accent, silver highlights',
    'Price Drop':  'clean white to light gray gradient, warm golden accent tones, bright and promotional',
    'Event Sale':  'soft spring greens and creams, warm light, fresh seasonal palette',
    'Bundle':      'neutral cool grays, complementary product color accents, cohesive palette',
    'Clearance':   'clean white background, bold red promotional accents',
    'Brand':       'sophisticated neutral tones, premium minimal palette, subtle LG red accent',
    'Comparison':  'clean neutral background, balanced dual-tone composition',
  };
  return colors[type] ?? 'sophisticated neutral professional color palette';
}

// ─────────────────────────────────────────────
//  NEGATIVE PROMPT
// ─────────────────────────────────────────────
function buildNegativePrompt(): string {
  return [
    'text', 'words', 'letters', 'numbers', 'watermark', 'logo', 'brand name',
    'people', 'faces', 'hands', 'body parts',
    'blurry', 'out of focus background', 'low quality', 'pixelated', 'jpeg artifacts',
    'oversaturated', 'neon colors', 'garish', 'cluttered', 'busy',
    'cartoon', 'illustration', 'painting', 'sketch',
    'dark vignette', 'lens flare', 'chromatic aberration',
  ].join(', ');
}

// ─────────────────────────────────────────────
//  TEMPLATE → IDEOGRAM STYLE_TYPE MAPPING
// ─────────────────────────────────────────────
function mapTemplateToStyle(template: string): string {
  const map: Record<string, string> = {
    'npi_beauty_shot':  'REALISTIC',
    'lifestyle_hero':   'REALISTIC',
    '3d_stage_hero':    'RENDER_3D',
    'el_shape_multi':   'DESIGN',
    'promo_badge_hero': 'REALISTIC',
  };
  return map[template] ?? 'REALISTIC';
}

// ─────────────────────────────────────────────
//  COLOR PALETTE (hex, for UI display)
// ─────────────────────────────────────────────
function buildColorPalette(type: string): string[] {
  const palettes: Record<string, string[]> = {
    'NPI':         ['#1C1C1C', '#2D2D2D', '#B00020', '#E8E8E8'],
    'Price Drop':  ['#FFFFFF', '#F4F6F8', '#E6A817', '#1C1C1C'],
    'Event Sale':  ['#F8FFF8', '#E8F5E9', '#4CAF50', '#B00020'],
    'Bundle':      ['#F4F6F8', '#E8EDF2', '#3B8BEB', '#1C1C1C'],
    'Clearance':   ['#FFFFFF', '#F4F6F8', '#B00020', '#1C1C1C'],
    'Brand':       ['#1C1C1C', '#2D2D2D', '#E8E8E8', '#B00020'],
    'Comparison':  ['#FFFFFF', '#F4F6F8', '#1C1C1C', '#3B8BEB'],
  };
  return palettes[type] ?? palettes['Brand'];
}

// ─────────────────────────────────────────────
//  CATEGORY HELPERS
// ─────────────────────────────────────────────
function isLaptop(cat: string)    { return /laptop|gram|notebook|computer|pc/.test(cat); }
function isTV(cat: string)        { return /tv|oled|television|monitor|display|screen/.test(cat); }
function isAppliance(cat: string) { return /fridge|refrigerator|washer|dryer|laundry|dishwasher|range|oven|cooking|appliance|ha/.test(cat); }
function isSeasonal(type: string) { return type === 'Event Sale'; }

// ─────────────────────────────────────────────
//  MOCK URLS (category-matched Unsplash)
// ─────────────────────────────────────────────
function getMockUrls(brief: BriefData, cls: ClassificationResult): string[] {
  const cat = (brief.productCategory || brief.keyMessage || '').toLowerCase();

  if (isLaptop(cat)) return [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1600&h=900&fit=crop&auto=format',
  ];

  if (isTV(cat)) return [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1461151304267-38374dc1b862?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=900&fit=crop&auto=format',
  ];

  if (isAppliance(cat)) return [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1600&h=900&fit=crop&auto=format',
  ];

  // Generic premium lifestyle fallbacks
  return [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1600&h=900&fit=crop&auto=format',
  ];
}

import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, CopyVariant, ImageSpec, GeneratedBackground } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/image-gen
//  Body: { brief, classification, selectedCopy }
//  Returns: { imageSpec, backgrounds }
//
//  Generates 4 background images using Ideogram v2.
//  Each prompt describes a COMPOSITING BACKGROUND — not a room scene.
//  Products, copy, and badges are overlaid in post (Screen 5/6).
//  Left 40% of every image must be open/uncluttered for copy placement.
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

    // Build two prompt variations per run → 2 calls × 2 images = 4 gallery options
    const [promptA, promptB] = buildPromptPair(brief, classification);
    const negPrompt          = buildNegativePrompt(classification.template);
    const ideoStyle          = mapTemplateToIdeogramStyle(classification.template);

    const imageSpec: ImageSpec = {
      prompt:        promptA,
      negativePrompt: negPrompt,
      aspectRatio:   '16:9',
      style:         ideoStyle === 'RENDER_3D' ? 'cinematic' : 'photorealistic',
      colorPalette:  getColorPalette(classification.type),
      modelUsed:     ideogramKey ? 'ideogram' : 'mock',
    };

    // ── Live Ideogram v2 ──────────────────────────────────────────────
    if (ideogramKey) {
      const allBackgrounds: GeneratedBackground[] = [];

      for (const [i, prompt] of [[0, promptA], [1, promptB]] as [number, string][]) {
        const res = await fetch('https://api.ideogram.ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': ideogramKey,
          },
          body: JSON.stringify({
            image_request: {
              prompt,
              negative_prompt:     negPrompt,
              aspect_ratio:        'ASPECT_16_9',
              model:               'V_2',
              style_type:          ideoStyle,
              magic_prompt_option: 'OFF',   // Keep prompts precise — no AI embellishment
              num_images:          2,
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ideogram API error ${res.status}: ${errText}`);
        }

        const data = await res.json();

        const bgs: GeneratedBackground[] = (data.data ?? []).map(
          (img: { url: string; seed?: number }, j: number) => ({
            id:          `bg_${Date.now()}_${i}_${j}`,
            url:         img.url,
            status:      'ready' as const,
            seed:        img.seed,
            prompt,
            generatedAt: new Date().toISOString(),
          })
        );

        allBackgrounds.push(...bgs);
      }

      return NextResponse.json({ imageSpec, backgrounds: allBackgrounds });
    }

    // ── Mock fallback ─────────────────────────────────────────────────
    const mockUrls = getMockUrls(brief, classification);
    const backgrounds: GeneratedBackground[] = mockUrls.map((url, i) => ({
      id:          `bg_mock_${i}`,
      url,
      status:      'ready' as const,
      prompt:      promptA,
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
//  PROMPT BUILDER
//  Generates two complementary background prompts per template.
//  These are COMPOSITING BACKGROUNDS — product and copy are added in post.
//  All prompts reserve the left 40% as a clean, low-detail zone for copy.
// ─────────────────────────────────────────────
function buildPromptPair(brief: BriefData, cls: ClassificationResult): [string, string] {
  const cat      = (brief.productCategory + ' ' + brief.keyMessage).toLowerCase();
  const template = cls.template;
  const type     = cls.type;

  // ── Template NPI — Product Beauty Shot ──────────────────────────────
  // Deep dark gradient background. Product composited on right in post.
  // Matches: LG gram AI hero, LG OLED evo hero
  if (template === 'npi_beauty_shot') {
    const colorNote = isTV(cat)
      ? 'very slight cool blue-violet ambient glow from the right edge'
      : 'subtle warm silver-white rim glow from upper right';

    const promptA = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% is deep near-black charcoal — solid dark zone for white text overlay, no texture or objects',
      `Right 60% transitions through a smooth dark charcoal gradient with ${colorNote}`,
      'Subtle carbon fiber micro-texture at 5% opacity in mid-background',
      'Cinematic premium technology product photography backdrop',
      'Ultra-dark studio environment, deep blacks, cool undertones',
      'No objects, no furniture, no room elements, no people',
      'Abstract atmospheric background only, professional commercial grade',
      '8K, ultra-wide cinematic',
    ].join(', ');

    const promptB = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% solid deep charcoal black — clean dark zone reserved for copy text',
      'Right 60% features a dark gradient with a soft cool indigo-to-charcoal glow, subtle light sweep from upper right',
      'Very faint bokeh specular highlights in the dark right zone suggesting premium lighting',
      'No objects, no room, no people, no furniture, no text, no logos',
      'Abstract dark studio backdrop, cinematic and premium',
      'Smooth gradient transitions, no hard edges',
      '8K photorealistic, professional photography backdrop',
    ].join(', ');

    return [promptA, promptB];
  }

  // ── Template 2 — 3D Stage ────────────────────────────────────────────
  // Light gradient backgrounds for Bundle Savings and Event Sale.
  // Soft bokeh/sparkles. Products arranged floating on right in post.
  // Matches: "Big savings are in full bloom" banner, Presidents Day banner
  if (template === '3d_stage_hero') {
    if (type === 'Event Sale' && isSeasonal(cat, 'spring')) {
      const promptA = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% clean soft white — open empty zone for dark or colored headline text overlay',
        'Right 60% fades into a delicate gradient of very soft blush pink and light lavender with gentle bokeh circles',
        'Tiny soft bokeh sparkle particles scattered in right half suggesting spring bloom energy',
        'Pale green botanical leaf shapes at 15% opacity in background suggesting spring season',
        'Warm light airy atmosphere, fresh and optimistic seasonal mood',
        'No objects, no people, no furniture, no room, no text',
        'Abstract seasonal gradient background for banner compositing',
        '8K, soft focus, professional commercial photography style',
      ].join(', ');

      const promptB = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% clean white-to-very-light-gray gradient — copy zone, no detail',
        'Right 60% gentle gradient from light gray to soft warm peach, scattered soft bokeh light orbs',
        'Subtle floral petal silhouettes at very low opacity (10%) in far right — seasonal spring energy',
        'Bright airy commercial feel, abundant and fresh atmosphere',
        'No people, no objects, no logos, no text in scene',
        'Abstract light gradient background for promotional banner compositing',
        '8K, ultra-wide, photorealistic commercial style',
      ].join(', ');

      return [promptA, promptB];
    }

    if (type === 'Event Sale') {
      // Patriotic / holiday seasonal (Presidents Day, 4th of July style)
      const promptA = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% clean light gray or white — open copy zone with no detail',
        'Right 60% features a subtle patriotic gradient of muted navy blue to warm white to soft red',
        'Very faint star shapes at 8% opacity scattered in right background suggesting patriotic theme',
        'Professional commercial banner background, clean and confident',
        'No people, no objects, no room, no furniture, no text, no logos',
        'Abstract gradient background for hero banner compositing',
        '8K, wide cinematic, commercial photography style',
      ].join(', ');

      const promptB = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% solid light neutral — clean headline copy zone',
        'Right 60% dynamic gradient with warm energy — gold to white with subtle soft bokeh light spots',
        'Event sale energy, promotional commercial atmosphere, slight sparkle in right third',
        'No objects, no room, no people, no logos, no text',
        'Abstract wide banner background for compositing',
        '8K professional commercial grade',
      ].join(', ');

      return [promptA, promptB];
    }

    // Bundle Savings — neutral gradient with soft bokeh
    const promptA = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% clean soft white — open empty zone for headline and body copy',
      'Right 60% smooth gradient from white to light platinum gray with soft bokeh light orbs',
      'Subtle glimmer/sparkle particles at low opacity suggesting premium value and savings energy',
      'Clean modern commercial atmosphere, bright and inviting',
      'No objects, no furniture, no room, no people, no text, no logos',
      'Abstract gradient background only, wide promotional banner backdrop',
      '8K photorealistic, professional commercial lighting',
    ].join(', ');

    const promptB = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% pure white clean zone — reserved for text overlay',
      'Right 60% fades into a very soft gradient from light silver to pale cool blue-gray',
      'Scattered micro-bokeh light points at low opacity — premium savings energy',
      'No objects, no room, no people, no logos, no text',
      'Professional wide promotional banner background, subtle and elegant',
      '8K ultra-wide commercial backdrop quality',
    ].join(', ');

    return [promptA, promptB];
  }

  // ── Template 1 — Lifestyle ───────────────────────────────────────────
  // Bright authentic photography feel. Real home/office environments.
  // Lifestyle photo goes on RIGHT. Left stays clean for copy.
  // Matches: ThinQ service banner, Brand Exclusive (LG Signature) banner
  if (template === 'lifestyle_hero') {
    if (isAppliance(cat)) {
      const promptA = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% clean soft white or very light warm gray — empty zone for dark text copy overlay',
        'Right 60% bright contemporary kitchen environment — white marble countertops, soft natural daylight from window, minimal Scandinavian home aesthetic',
        'Bright airy lifestyle home photography, warm and premium residential feel',
        'No people, no text, no logos in scene',
        'Shallow depth of field on right — background slightly soft, inviting atmosphere',
        'Wide panoramic composition for hero banner, 8K commercial photography quality',
      ].join(', ');

      const promptB = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% clean light background — blank space for headline text',
        'Right 60% modern light home interior — soft white walls, contemporary home, warm ambient window light',
        'Premium lifestyle home photography aesthetic, clean and aspirational',
        'No people, no faces, no logos, no text in scene',
        'Wide ultra-panoramic banner background, shallow focus, professional commercial photography',
        '8K quality, bright and warm',
      ].join(', ');

      return [promptA, promptB];
    }

    if (isLaptop(cat)) {
      const promptA = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% clean light gray or white — empty copy zone for text overlay',
        'Right 60% bright modern home office — clean white desk surface, soft natural light from large window, minimal contemporary workspace',
        'Warm morning light, productive premium home office atmosphere',
        'No people, no faces, no products on desk, no logos, no text',
        'Wide ultra-panoramic banner composition, shallow depth of field, 8K commercial photography',
      ].join(', ');

      const promptB = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% soft neutral light zone — clean for copy',
        'Right 60% modern minimalist workspace — light wood desk, blurred light background, soft studio lighting',
        'Contemporary tech workspace aesthetic, clean and premium',
        'No people, no products, no logos, no text',
        'Professional wide banner background, 8K photorealistic',
      ].join(', ');

      return [promptA, promptB];
    }

    // LG Signature / Brand Exclusive
    const promptA = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% clean white or very light warm beige — open copy zone',
      'Right 60% elegant high-end interior detail — dark navy accent wall with subtle gold-tone architectural detail, soft ambient lighting, premium residential atmosphere',
      'LG Signature premium brand aesthetic, sophisticated and aspirational',
      'No people, no products, no logos, no text',
      'Wide panoramic banner background, 8K ultra-premium commercial quality',
    ].join(', ');

    const promptB = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% soft neutral light — blank copy area',
      'Right 60% premium interior — light warm wall, subtle architectural shadow play, sophisticated ambient lighting',
      'Ultra-premium brand aesthetic, quiet confidence and elegance',
      'No people, no logos, no text, no products',
      'Wide commercial banner background, 8K photorealistic premium quality',
    ].join(', ');

    return [promptA, promptB];
  }

  // ── Template 3 — El Shape ────────────────────────────────────────────
  // Multi-panel layout. Clean white background with subtle structure.
  if (template === 'el_shape_multi') {
    const promptA = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Clean white background with very subtle light gray structural dividers suggesting a grid or panel layout',
      'Left 40% pure white — open copy zone',
      'Right 60% faint light gray rectangular panel outlines at 15% opacity — suggested product display areas',
      'Minimal editorial layout background, clean and professional',
      'No objects, no people, no logos, no text, no products',
      'Professional wide banner background for multi-product compositing, 8K quality',
    ].join(', ');

    const promptB = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Very clean off-white background with subtle warm light gradient',
      'Left half lighter, right half very slightly warmer — smooth transition',
      'Minimal commercial product photography backdrop, airy and clean',
      'No objects, no room, no people, no logos, no text',
      'Wide banner background for compositing, 8K photorealistic',
    ].join(', ');

    return [promptA, promptB];
  }

  // ── Template 4 — Promotional Logo/Badge ─────────────────────────────
  // Two sub-styles: energetic dark (Flash Sale) or clean light (Service/Engagement)
  if (template === 'promo_badge_hero') {
    const isDarkEnergy = type === 'Price Drop' || type === 'Clearance';

    if (isDarkEnergy) {
      // Dark energetic — Flash Sale red/maroon gradient with dynamic light burst
      const promptA = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 40% very dark near-black — clean zone for white headline text overlay',
        'Right 60% dramatic dark crimson to deep maroon gradient with a burst of warm golden-orange light energy from center-right',
        'Dynamic diagonal light rays at low opacity suggesting urgency and flash sale energy',
        'No objects, no room, no furniture, no people, no logos, no text',
        'Abstract dark energetic gradient background for promotional banner compositing',
        '8K, cinematic, high contrast, commercial advertising quality',
      ].join(', ');

      const promptB = [
        'Wide promotional banner background for compositing, 16:9 ratio',
        'Left 35% very dark charcoal — blank copy zone',
        'Right 65% deep red gradient darkening to near-black at edges, warm amber glow emanating from upper right',
        'Subtle diagonal energy lines at 10% opacity — urgency and promotional excitement',
        'No people, no objects, no text, no logos',
        'Abstract dark promotional banner background, dramatic commercial energy',
        '8K cinematic quality, ultra-wide composition',
      ].join(', ');

      return [promptA, promptB];
    }

    // Light clean — Service, Engagement, Exclusive badge
    const promptA = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% clean white — open zone for dark or colored headline text',
      'Right 60% smooth gradient from white to very light cool gray with soft diffused studio lighting',
      'Clean airy commercial background suggesting trust, reliability and value',
      'Very subtle soft shadow at 8% opacity on far right suggesting product placement area',
      'No objects, no room, no people, no logos, no text',
      'Professional clean wide banner background for compositing, 8K photorealistic',
    ].join(', ');

    const promptB = [
      'Wide promotional banner background for compositing, 16:9 ratio',
      'Left 40% soft white — empty headline copy area',
      'Right 60% light warm beige-gray gradient, soft and approachable, trust-building atmosphere',
      'Very gentle bokeh soft light at low opacity on far right',
      'No objects, no room, no people, no logos, no text',
      'Wide professional banner background, clean and credible, 8K quality',
    ].join(', ');

    return [promptA, promptB];
  }

  // ── Fallback ─────────────────────────────────────────────────────────
  const promptA = [
    'Wide promotional banner background for compositing, 16:9 ratio',
    'Left 40% clean white or very dark — open copy zone with no detail',
    'Right 60% smooth gradient with subtle visual interest appropriate for premium brand advertising',
    'Professional commercial banner background, no objects, no people, no text, no logos',
    '8K quality, ultra-wide, suitable for hero banner compositing',
  ].join(', ');

  const promptB = [
    'Wide promotional banner background for compositing, 16:9 ratio',
    'Left 40% minimal clean zone for text overlay',
    'Right 60% subtle atmospheric gradient, premium commercial quality',
    'No objects, no people, no text, no logos',
    'Professional advertising background, 8K wide panoramic',
  ].join(', ');

  return [promptA, promptB];
}

// ─────────────────────────────────────────────
//  NEGATIVE PROMPTS — tuned per template
// ─────────────────────────────────────────────
function buildNegativePrompt(template: string): string {
  const base = [
    'text', 'words', 'letters', 'numbers', 'watermark', 'logo', 'brand name', 'label',
    'people', 'faces', 'hands', 'human figures', 'body parts',
    'blurry', 'pixelated', 'jpeg artifacts', 'low quality', 'noise',
    'cartoon', 'illustration', 'painting', 'sketch', 'drawing', 'anime',
    'lens flare', 'chromatic aberration', 'vignette',
  ];

  if (template === 'npi_beauty_shot') {
    return [...base,
      'bright background', 'white background', 'room interior', 'furniture',
      'kitchen', 'living room', 'home decor', 'warm tones', 'wood surfaces',
      'outdoor', 'nature', 'plants', 'flowers',
    ].join(', ');
  }

  if (template === '3d_stage_hero' || template === 'promo_badge_hero') {
    return [...base,
      'dark background', 'room interior', 'furniture', 'architectural elements',
      'outdoor scene', 'busy composition', 'hard shadows',
    ].join(', ');
  }

  if (template === 'lifestyle_hero') {
    return [...base,
      'dark background', 'abstract', 'gradient only',
      'cluttered room', 'messy space', 'outdated decor',
    ].join(', ');
  }

  return [...base, 'busy composition', 'cluttered', 'room interior', 'outdoor'].join(', ');
}

// ─────────────────────────────────────────────
//  TEMPLATE → IDEOGRAM STYLE TYPE
// ─────────────────────────────────────────────
function mapTemplateToIdeogramStyle(template: string): string {
  const map: Record<string, string> = {
    'npi_beauty_shot':  'REALISTIC',   // Premium dark studio photography
    'lifestyle_hero':   'REALISTIC',   // Authentic home/lifestyle photography
    '3d_stage_hero':    'DESIGN',      // Gradient + bokeh design backgrounds
    'el_shape_multi':   'DESIGN',      // Clean structural design background
    'promo_badge_hero': 'REALISTIC',   // Studio gradient or energetic dark
  };
  return map[template] ?? 'REALISTIC';
}

// ─────────────────────────────────────────────
//  COLOR PALETTE (hex, for UI display in Screen 4)
// ─────────────────────────────────────────────
function getColorPalette(type: string): string[] {
  const palettes: Record<string, string[]> = {
    'NPI':         ['#1A1A1A', '#2D2D2D', '#B00020', '#E8E8E8'],
    'Price Drop':  ['#1A0000', '#6B0000', '#E6A817', '#FFFFFF'],
    'Event Sale':  ['#FFFFFF', '#F8F0F0', '#E8C4C4', '#4CAF50'],
    'Bundle':      ['#FFFFFF', '#F4F6F8', '#E8EDF2', '#B00020'],
    'Clearance':   ['#1A0000', '#B00020', '#FFFFFF', '#FF6B6B'],
    'Brand':       ['#FFFFFF', '#F5F0EB', '#1C1C1C', '#B00020'],
    'Comparison':  ['#FFFFFF', '#F4F6F8', '#1C1C1C', '#3B8BEB'],
  };
  return palettes[type] ?? palettes['Brand'];
}

// ─────────────────────────────────────────────
//  CATEGORY HELPERS
// ─────────────────────────────────────────────
function isLaptop(cat: string)    { return /laptop|gram|notebook|computer|pc/.test(cat); }
function isTV(cat: string)        { return /tv|oled|television|monitor|display|screen|projector/.test(cat); }
function isAppliance(cat: string) { return /fridge|refrigerator|washer|dryer|laundry|dishwasher|range|oven|cooking|appliance|ha\b/.test(cat); }
function isSeasonal(cat: string, season: string) {
  const seasons: Record<string, string[]> = {
    spring: ['spring', 'bloom', 'flower', 'garden', 'easter', 'may', 'april'],
    summer: ['summer', 'july', 'memorial', 'independence', 'beach'],
    fall:   ['fall', 'autumn', 'halloween', 'october', 'thanksgiving'],
    winter: ['winter', 'holiday', 'christmas', 'december', 'new year'],
  };
  return (seasons[season] ?? []).some((kw) => cat.includes(kw));
}

// ─────────────────────────────────────────────
//  MOCK FALLBACK URLs (category-matched)
// ─────────────────────────────────────────────
function getMockUrls(brief: BriefData, cls: ClassificationResult): string[] {
  const cat = (brief.productCategory + ' ' + brief.keyMessage).toLowerCase();

  if (isLaptop(cat)) return [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1600&h=900&fit=crop&auto=format',
  ];

  if (isTV(cat)) return [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1461151304267-38374dc1b862?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1600&h=900&fit=crop&auto=format',
  ];

  if (isAppliance(cat)) return [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1600&h=900&fit=crop&auto=format',
  ];

  return [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1600&h=900&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1600&h=900&fit=crop&auto=format',
  ];
}

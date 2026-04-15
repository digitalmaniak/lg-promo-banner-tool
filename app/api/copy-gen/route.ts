import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, CopyResult, CopyVariant } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/copy-gen
//  Body: { brief: BriefData, classification: ClassificationResult }
//  Returns: CopyResult
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { brief, classification }: { brief: BriefData; classification: ClassificationResult } = await req.json();

    if (!brief || !classification) {
      return NextResponse.json({ error: 'Missing brief or classification' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      // ── Production: call Claude ──────────────────────────────────────
      const systemPrompt = `You are an expert LG copywriter specializing in premium consumer electronics promotional banners.
You write concise, impactful copy that follows LG brand voice guidelines.

Return a JSON object with this structure:
{
  "variants": [
    {
      "id": "v1",
      "headline": string (max 50 chars),
      "subtext": string (max 90 chars),
      "eyebrow": string or null (max 25 chars, ALL CAPS),
      "cta": string (max 20 chars),
      "tone": "premium" | "urgent" | "lifestyle" | "technical" | "playful",
      "characterCounts": { "headline": number, "subtext": number }
    }
  ],
  "selectedVariantId": null,
  "brandVoiceScore": number 0-100,
  "characterLimitWarnings": string[]
}
Generate exactly 3 variants with different tones. Return ONLY valid JSON.`;

      const userMsg = `Brief: ${brief.productName} — ${brief.keyMessage}
Campaign type: ${classification.type}
Target: ${brief.targetAudience}
${brief.price ? `Price point: ${brief.price}` : ''}
${brief.promotionDetails ? `Promotion: ${brief.promotionDetails}` : ''}
Suggested badge: ${classification.suggestedBadge ?? 'none'}
Brand tone preference: ${brief.brandTone || 'match to campaign type'}`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      if (!claudeRes.ok) throw new Error(`Claude API error: ${claudeRes.status}`);
      const claudeData = await claudeRes.json();
      const text = claudeData.content?.[0]?.text ?? '{}';
      const result: CopyResult = JSON.parse(text);
      return NextResponse.json(result);
    }

    // ── Mock path ────────────────────────────────────────────────────
    const product = brief.productName || 'Product';
    const price   = brief.price ? ` · ${brief.price}` : '';

    const mockVariants: CopyVariant[] = [
      {
        id: 'v1',
        eyebrow: 'INTRODUCING',
        headline: `The Future of ${brief.productCategory || 'Home Entertainment'} Is Here`,
        subtext: `Experience the ${product} — where technology meets extraordinary design${price}.`,
        cta: 'Shop Now',
        tone: 'premium',
        characterCounts: {
          headline: `The Future of ${brief.productCategory || 'Home Entertainment'} Is Here`.length,
          subtext:  `Experience the ${product} — where technology meets extraordinary design${price}.`.length,
        },
      },
      {
        id: 'v2',
        eyebrow: classification.suggestedBadge ?? 'NEW',
        headline: `${product}: Redefining What's Possible`,
        subtext: `${brief.keyMessage || 'Discover breakthrough performance and stunning visuals'}${price}.`,
        cta: 'Explore Features',
        tone: 'technical',
        characterCounts: {
          headline: `${product}: Redefining What's Possible`.length,
          subtext:  `${brief.keyMessage || 'Discover breakthrough performance and stunning visuals'}${price}.`.length,
        },
      },
      {
        id: 'v3',
        eyebrow: brief.campaignDates ? 'LIMITED TIME' : undefined,
        headline: `Elevate Every Moment with ${product}`,
        subtext: `Designed for those who demand the best${price}. Transform your space today.`,
        cta: 'Learn More',
        tone: 'lifestyle',
        characterCounts: {
          headline: `Elevate Every Moment with ${product}`.length,
          subtext:  `Designed for those who demand the best${price}. Transform your space today.`.length,
        },
      },
    ];

    const warnings = mockVariants
      .flatMap((v) => {
        const w: string[] = [];
        if (v.characterCounts.headline > 50) w.push(`Variant ${v.id}: headline exceeds 50 characters (${v.characterCounts.headline})`);
        if (v.characterCounts.subtext > 90)  w.push(`Variant ${v.id}: subtext exceeds 90 characters (${v.characterCounts.subtext})`);
        return w;
      });

    const result: CopyResult = {
      variants:               mockVariants,
      selectedVariantId:      null,
      brandVoiceScore:        88,
      characterLimitWarnings: warnings,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/copy-gen]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

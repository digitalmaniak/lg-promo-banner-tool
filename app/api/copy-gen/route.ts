import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, CopyResult, CopyVariant } from '@/lib/types';

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last  = text.lastIndexOf('}');
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text.trim();
}

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

    // ── Production: call Claude ──────────────────────────────────────
    if (apiKey) {
      const systemPrompt = `You are an expert LG copywriter at HSAD Creative Services specializing in premium consumer electronics promotional banners.

Generate exactly 3 copy variants for this campaign. Each variant must have a distinct tone.
Return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Required structure:
{
  "variants": [
    {
      "id": "v1",
      "eyebrow": <short ALL-CAPS label max 25 chars, or null — e.g. "INTRODUCING", "LIMITED TIME", "NEW ARRIVAL">,
      "headline": <punchy headline, max 50 characters>,
      "subtext": <supporting line, max 90 characters>,
      "cta": <call-to-action button text, max 20 chars — e.g. "Shop Now", "Learn More", "Pre-Order Today">,
      "tone": <exactly one of: "premium" | "urgent" | "lifestyle" | "technical" | "playful">,
      "characterCounts": { "headline": <integer>, "subtext": <integer> }
    },
    { "id": "v2", ... },
    { "id": "v3", ... }
  ],
  "selectedVariantId": null,
  "brandVoiceScore": <integer 0-100 reflecting how well the copy fits LG brand voice>,
  "characterLimitWarnings": <array of strings for any variant exceeding char limits, or []>
}

LG brand voice guidelines:
- Premium but accessible — aspirational without being arrogant
- Lead with the human benefit, not the spec
- Active voice, present tense
- No exclamation marks in headlines
- Avoid clichés: "next-level", "revolutionary", "game-changing"`;

      // Screen 1 sends the full raw brief text in keyMessage
      const briefContent = brief.productName
        ? `Product: ${brief.productName}
Brief: ${brief.keyMessage}
Campaign type: ${classification.type}
Target audience: ${brief.targetAudience}
${brief.price ? `Price: ${brief.price}` : ''}
${brief.promotionDetails ? `Promotion: ${brief.promotionDetails}` : ''}
Suggested badge: ${classification.suggestedBadge ?? 'none'}
Brand tone: ${brief.brandTone || classification.brandToneMatch}`
        : `Full brief:\n${brief.keyMessage}\n\nClassification: ${classification.type}\nReasoning: ${classification.reasoning}\nSuggested badge: ${classification.suggestedBadge ?? 'none'}`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Generate 3 copy variants for this campaign:\n\n${briefContent}` }],
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        throw new Error(`Claude API ${claudeRes.status}: ${errText}`);
      }

      const claudeData = await claudeRes.json();
      const rawText = claudeData.content?.[0]?.text ?? '{}';
      const result: CopyResult = JSON.parse(extractJSON(rawText));
      return NextResponse.json(result);
    }

    // ── Mock fallback ─────────────────────────────────────────────────
    const product = brief.productName || 'LG Product';
    const price   = brief.price ? ` — ${brief.price}` : '';

    const mockVariants: CopyVariant[] = [
      {
        id: 'v1',
        eyebrow: 'INTRODUCING',
        headline: `The Future of ${brief.productCategory || 'Home Entertainment'}`,
        subtext: `Experience the ${product} — where technology meets extraordinary design${price}.`,
        cta: 'Shop Now',
        tone: 'premium',
        characterCounts: {
          headline: `The Future of ${brief.productCategory || 'Home Entertainment'}`.length,
          subtext:  `Experience the ${product} — where technology meets extraordinary design${price}.`.length,
        },
      },
      {
        id: 'v2',
        eyebrow: classification.suggestedBadge ?? 'NEW',
        headline: `${product}: Redefining What Is Possible`,
        subtext: `Breakthrough performance. Stunning design. Built for those who demand more${price}.`,
        cta: 'Explore Features',
        tone: 'technical',
        characterCounts: {
          headline: `${product}: Redefining What Is Possible`.length,
          subtext:  `Breakthrough performance. Stunning design. Built for those who demand more${price}.`.length,
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

    const warnings = mockVariants.flatMap((v) => {
      const w: string[] = [];
      if (v.characterCounts.headline > 50) w.push(`Variant ${v.id}: headline ${v.characterCounts.headline} chars (limit 50)`);
      if (v.characterCounts.subtext  > 90) w.push(`Variant ${v.id}: subtext ${v.characterCounts.subtext} chars (limit 90)`);
      return w;
    });

    return NextResponse.json({
      variants: mockVariants,
      selectedVariantId: null,
      brandVoiceScore: 88,
      characterLimitWarnings: warnings,
    } as CopyResult);

  } catch (err) {
    console.error('[/api/copy-gen]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Copy generation failed' },
      { status: 500 }
    );
  }
}

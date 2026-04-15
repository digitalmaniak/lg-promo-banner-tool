import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, PromotionType } from '@/lib/types';

// ─────────────────────────────────────────────
//  POST /api/classify
//  Body: { brief: BriefData }
//  Returns: ClassificationResult
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { brief }: { brief: BriefData } = await req.json();

    if (!brief) {
      return NextResponse.json({ error: 'Missing brief' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Production path: call Claude API ──────────────────────────────
    if (apiKey) {
      const systemPrompt = `You are an LG promotional banner classification expert.
Analyze the campaign brief and return a JSON object matching the ClassificationResult type:
{
  "type": one of ["NPI","Price Drop","Event Sale","Bundle","Clearance","Brand","Comparison"],
  "confidence": float 0-1,
  "template": snake_case template name string,
  "reasoning": string (1-2 sentences),
  "suggestedBadge": string or null,
  "urgencySignals": string[],
  "targetDemographic": string,
  "brandToneMatch": string
}
Return ONLY valid JSON, no markdown fences.`;

      const userMsg = `Campaign Brief:
Product: ${brief.productName} (${brief.productCategory})
Campaign Type: ${brief.campaignType}
Key Message: ${brief.keyMessage}
Target Audience: ${brief.targetAudience}
${brief.price ? `Price: ${brief.price}` : ''}
${brief.promotionDetails ? `Promotion Details: ${brief.promotionDetails}` : ''}
${brief.campaignDates ? `Dates: ${brief.campaignDates}` : ''}
${brief.brandTone ? `Brand Tone: ${brief.brandTone}` : ''}`;

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      if (!claudeRes.ok) {
        throw new Error(`Claude API error: ${claudeRes.status}`);
      }

      const claudeData = await claudeRes.json();
      const text = claudeData.content?.[0]?.text ?? '{}';
      const result: ClassificationResult = JSON.parse(text);

      return NextResponse.json(result);
    }

    // ── Mock path: return realistic demo data ─────────────────────────
    const mockResult: ClassificationResult = {
      type:              classifyHeuristic(brief),
      confidence:        0.94,
      template:          'NPI_dark_hero',
      reasoning:         `The brief describes a new product announcement with premium positioning. The "New Product Launch" type and dark hero template create maximum visual impact for a high-end debut.`,
      suggestedBadge:    'NEW ARRIVAL',
      urgencySignals:    brief.campaignDates ? ['Limited-time pre-order offer', 'Early adopter pricing'] : [],
      targetDemographic: brief.targetAudience || 'Tech enthusiasts, premium home entertainment buyers',
      brandToneMatch:    brief.brandTone || 'Premium & Sophisticated',
    };

    return NextResponse.json(mockResult);
  } catch (err) {
    console.error('[/api/classify]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Simple rule-based fallback for mock mode */
function classifyHeuristic(brief: BriefData): PromotionType {
  const t = brief.campaignType.toLowerCase();
  if (t.includes('launch') || t.includes('new'))        return 'NPI';
  if (t.includes('price') || t.includes('sale'))        return 'Price Drop';
  if (t.includes('event') || t.includes('holiday'))     return 'Event Sale';
  if (t.includes('bundle'))                             return 'Bundle';
  if (t.includes('clearance'))                          return 'Clearance';
  if (t.includes('brand'))                              return 'Brand';
  if (t.includes('competitive') || t.includes('compar')) return 'Comparison';
  return 'NPI';
}

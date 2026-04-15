import { NextRequest, NextResponse } from 'next/server';
import type { BriefData, ClassificationResult, PromotionType } from '@/lib/types';

// Strip markdown code fences Claude sometimes adds despite instructions
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last  = text.lastIndexOf('}');
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text.trim();
}

// ─────────────────────────────────────────────
//  POST /api/classify
//  Body: { brief: BriefData }
//  Returns: ClassificationResult
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { brief }: { brief: BriefData } = await req.json();
    if (!brief) return NextResponse.json({ error: 'Missing brief' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Production: call Claude ──────────────────────────────────────
    if (apiKey) {
      const systemPrompt = `You are an LG promotional banner classification expert at HSAD Creative Services.

Analyze the campaign brief and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Required structure:
{
  "type": <exactly one of: "NPI" | "Price Drop" | "Event Sale" | "Bundle" | "Clearance" | "Brand" | "Comparison">,
  "confidence": <float 0-1>,
  "template": <snake_case string e.g. "npi_dark_hero">,
  "reasoning": <1-2 sentences explaining the classification>,
  "suggestedBadge": <short ALL-CAPS text e.g. "NEW ARRIVAL" or "SAVE $500", or null>,
  "urgencySignals": <array of strings — urgency elements found in the brief>,
  "targetDemographic": <string describing the target audience>,
  "brandToneMatch": <string describing the recommended brand tone>
}

Type guide:
- NPI: New product introduction or launch
- Price Drop: Promotional pricing, savings, discounts
- Event Sale: Holiday, seasonal, or event-tied promotion
- Bundle: Multi-product or accessory bundles
- Clearance: End-of-life or inventory clearance
- Brand: Brand awareness without a specific product push
- Comparison: Competitive or side-by-side comparison`;

      // Screen 1 sends the full raw brief text in keyMessage
      const briefContent = brief.productName
        ? `Product: ${brief.productName}${brief.productCategory ? ` (${brief.productCategory})` : ''}
Campaign Type: ${brief.campaignType}
Key Message: ${brief.keyMessage}
Target Audience: ${brief.targetAudience}
${brief.price ? `Price: ${brief.price}` : ''}
${brief.promotionDetails ? `Promotion: ${brief.promotionDetails}` : ''}
${brief.campaignDates ? `Dates: ${brief.campaignDates}` : ''}
${brief.brandTone ? `Brand Tone: ${brief.brandTone}` : ''}`
        : brief.keyMessage; // raw pasted / uploaded brief text

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Classify this brief:\n\n${briefContent}` }],
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        throw new Error(`Claude API ${claudeRes.status}: ${errText}`);
      }

      const claudeData = await claudeRes.json();
      const rawText = claudeData.content?.[0]?.text ?? '{}';
      const result: ClassificationResult = JSON.parse(extractJSON(rawText));
      return NextResponse.json(result);
    }

    // ── Mock fallback ─────────────────────────────────────────────────
    const mockResult: ClassificationResult = {
      type:              classifyHeuristic(brief),
      confidence:        0.94,
      template:          'npi_dark_hero',
      reasoning:         'The brief describes a new product announcement with premium positioning. The NPI template creates maximum visual impact for a high-end debut.',
      suggestedBadge:    'NEW ARRIVAL',
      urgencySignals:    brief.campaignDates ? ['Limited-time pre-order offer', 'Early adopter pricing'] : [],
      targetDemographic: brief.targetAudience || 'Tech enthusiasts, premium home entertainment buyers',
      brandToneMatch:    brief.brandTone || 'Premium & Sophisticated',
    };
    return NextResponse.json(mockResult);

  } catch (err) {
    console.error('[/api/classify]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Classification failed' },
      { status: 500 }
    );
  }
}

function classifyHeuristic(brief: BriefData): PromotionType {
  const t = (brief.campaignType + ' ' + brief.keyMessage).toLowerCase();
  if (t.includes('launch') || t.includes('new product') || t.includes('npi')) return 'NPI';
  if (t.includes('price') || t.includes('sale') || t.includes('save'))        return 'Price Drop';
  if (t.includes('event') || t.includes('holiday') || t.includes('season'))   return 'Event Sale';
  if (t.includes('bundle') || t.includes('package'))                          return 'Bundle';
  if (t.includes('clearance') || t.includes('end of life'))                   return 'Clearance';
  if (t.includes('vs') || t.includes('compar') || t.includes('versus'))       return 'Comparison';
  return 'Brand';
}

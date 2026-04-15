'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Check, AlertTriangle, Type } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { CopyResult, CopyVariant } from '@/lib/types';

const TONE_COLORS: Record<CopyVariant['tone'], string> = {
  premium:   'text-accent-violet bg-accent-violet/10 border-accent-violet/30',
  urgent:    'text-red-400 bg-red-400/10 border-red-400/30',
  lifestyle: 'text-accent-green bg-accent-green/10 border-accent-green/30',
  technical: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30',
  playful:   'text-accent-amber bg-accent-amber/10 border-accent-amber/30',
};

const CHAR_LIMITS = { headline: 50, subtext: 90 };

export function Screen3Copy() {
  const { brief, classification, copyResult, setCopyResult, selectCopyVariant, setStepStatus, prevStep, nextStep } = usePipeline();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const generateCopy = async () => {
    if (!brief || !classification) return;
    setLoading(true);
    setError(null);
    setStepStatus(3, 'loading');

    try {
      const res = await fetch('/api/copy-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, classification }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: CopyResult = await res.json();
      setCopyResult(data);
      setStepStatus(3, 'complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy generation failed');
      setStepStatus(3, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brief && classification && !copyResult) generateCopy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedId = copyResult?.selectedVariantId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-light">Copy Variants</h1>
          <p className="text-brand-muted text-sm mt-1">
            Select the headline and subtext combination that best fits the campaign.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={generateCopy} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Regenerate
        </Button>
      </div>

      {/* Brand voice score */}
      {copyResult && (
        <div className="flex items-center gap-3">
          <StatusBadge
            variant={copyResult.brandVoiceScore >= 80 ? 'complete' : copyResult.brandVoiceScore >= 60 ? 'warning' : 'error'}
            label={`Brand Voice: ${copyResult.brandVoiceScore}/100`}
          />
          {copyResult.characterLimitWarnings.length > 0 && (
            <StatusBadge variant="warning" label={`${copyResult.characterLimitWarnings.length} length warning(s)`} />
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !copyResult && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl shimmer-bg" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-800/40">
          <p className="text-red-400 text-sm">{error}</p>
          <Button size="sm" variant="secondary" onClick={generateCopy} className="mt-3">Try again</Button>
        </Card>
      )}

      {/* Copy variants */}
      {copyResult && (
        <div className="space-y-3 animate-fade-in">
          {copyResult.variants.map((variant) => {
            const isSelected = variant.id === selectedId;
            const headlineOver = variant.characterCounts.headline > CHAR_LIMITS.headline;
            const subtextOver  = variant.characterCounts.subtext > CHAR_LIMITS.subtext;

            return (
              <Card
                key={variant.id}
                selected={isSelected}
                hoverable
                onClick={() => selectCopyVariant(variant.id)}
                padding="md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Eyebrow */}
                    {variant.eyebrow && (
                      <p className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-1">
                        {variant.eyebrow}
                      </p>
                    )}

                    {/* Headline */}
                    <h3 className={`font-bold text-lg leading-tight mb-1 ${headlineOver ? 'text-red-300' : 'text-brand-light'}`}>
                      {variant.headline}
                    </h3>

                    {/* Subtext */}
                    <p className={`text-sm leading-relaxed ${subtextOver ? 'text-red-300' : 'text-brand-muted'}`}>
                      {variant.subtext}
                    </p>

                    {/* CTA */}
                    <p className="text-xs text-brand-red font-semibold mt-2 uppercase tracking-wider">
                      → {variant.cta}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-brand-red flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${TONE_COLORS[variant.tone]}`}>
                      {variant.tone}
                    </span>
                  </div>
                </div>

                {/* Character counts */}
                <div className="flex gap-4 mt-3 pt-3 border-t border-brand-border/50">
                  <CharCount label="Headline" count={variant.characterCounts.headline} limit={CHAR_LIMITS.headline} />
                  <CharCount label="Subtext"  count={variant.characterCounts.subtext}  limit={CHAR_LIMITS.subtext}  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {copyResult?.characterLimitWarnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-accent-amber bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {w}
        </div>
      ))}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
        <Button
          onClick={nextStep}
          disabled={!selectedId}
          icon={<ChevronRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Generate Backgrounds
        </Button>
      </div>
    </div>
  );
}

function CharCount({ label, count, limit }: { label: string; count: number; limit: number }) {
  const over = count > limit;
  return (
    <div className="flex items-center gap-1.5">
      <Type className="w-3 h-3 text-brand-muted" />
      <span className="text-xs text-brand-muted">{label}:</span>
      <span className={`text-xs font-mono font-medium ${over ? 'text-red-400' : 'text-brand-light'}`}>
        {count}/{limit}
      </span>
      {over && <AlertTriangle className="w-3 h-3 text-red-400" />}
    </div>
  );
}

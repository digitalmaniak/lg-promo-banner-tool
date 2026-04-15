'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Tag, Users, Palette, Zap } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge, ConfidenceMeter } from '@/components/ui/StatusBadge';
import type { ClassificationResult } from '@/lib/types';

export function Screen2Classify() {
  const { brief, classification, setClassification, setStepStatus, prevStep, nextStep } = usePipeline();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const classify = async () => {
    if (!brief) return;
    setLoading(true);
    setError(null);
    setStepStatus(2, 'loading');

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: ClassificationResult = await res.json();
      setClassification(data);
      setStepStatus(2, 'complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
      setStepStatus(2, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-classify when screen mounts if we have a brief but no classification yet
  useEffect(() => {
    if (brief && !classification) classify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-light">Promotion Classification</h1>
          <p className="text-brand-muted text-sm mt-1">
            Claude analyzes your brief and maps it to the optimal banner template.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={classify} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Re-classify
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && !classification && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl shimmer-bg" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-800/40">
          <p className="text-red-400 text-sm">{error}</p>
          <Button size="sm" variant="secondary" onClick={classify} className="mt-3">
            Try again
          </Button>
        </Card>
      )}

      {/* Results */}
      {classification && (
        <div className="space-y-4 animate-fade-in">
          {/* Primary classification */}
          <Card padding="lg">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-brand-red" />
                  <span className="text-xs text-brand-muted uppercase tracking-wider font-semibold">Promotion Type</span>
                </div>
                <h2 className="text-2xl font-bold text-brand-light">{classification.type}</h2>
                <p className="text-sm text-brand-muted mt-1">Template: <span className="font-mono text-brand-light text-xs bg-brand-border/40 px-1.5 py-0.5 rounded">{classification.template}</span></p>
              </div>
              <div className="text-right shrink-0">
                {classification.suggestedBadge && (
                  <span className="inline-block px-3 py-1 bg-brand-red/20 border border-brand-red/40 text-brand-red text-xs font-bold rounded-full uppercase tracking-wider">
                    {classification.suggestedBadge}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
                <span>Confidence</span>
              </div>
              <ConfidenceMeter value={classification.confidence} />
            </div>
          </Card>

          {/* AI reasoning */}
          <Card>
            <CardHeader title="AI Reasoning" />
            <p className="text-sm text-brand-light leading-relaxed">{classification.reasoning}</p>
          </Card>

          {/* Signal cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card padding="sm">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-accent-amber" />
                <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Urgency Signals</span>
              </div>
              {classification.urgencySignals.length > 0 ? (
                <ul className="space-y-1">
                  {classification.urgencySignals.map((sig, i) => (
                    <li key={i} className="text-xs text-brand-light flex items-start gap-1.5">
                      <span className="text-brand-red mt-0.5">·</span> {sig}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-brand-muted">No urgency signals detected</p>
              )}
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-accent-blue" />
                <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Target Demo</span>
              </div>
              <p className="text-xs text-brand-light">{classification.targetDemographic}</p>
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-3.5 h-3.5 text-accent-violet" />
                <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Brand Tone</span>
              </div>
              <p className="text-xs text-brand-light">{classification.brandToneMatch}</p>
            </Card>
          </div>

          {/* Brief summary */}
          {brief && (
            <Card padding="sm">
              <p className="text-xs text-brand-muted">
                <span className="font-semibold text-brand-light">{brief.productName}</span>
                {' · '}{brief.campaignType}
                {brief.price && <> · <span className="text-accent-amber">{brief.price}</span></>}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!classification}
          icon={<ChevronRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Generate Copy Variants
        </Button>
      </div>
    </div>
  );
}

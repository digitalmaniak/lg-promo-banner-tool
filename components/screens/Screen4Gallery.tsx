'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Sparkles, RefreshCw, Check, Loader2 } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { GeneratedBackground } from '@/lib/types';

export function Screen4Gallery() {
  const {
    brief, classification, copyResult,
    imageSpec, setImageSpec,
    backgrounds, addBackground, updateBackground, selectBackground, selectedBackgroundId,
    setStepStatus, prevStep, nextStep,
  } = usePipeline();

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef                = useRef<AbortController | null>(null);

  const generateBackgrounds = async () => {
    if (!brief || !classification) return;
    setLoading(true);
    setError(null);
    setStepStatus(4, 'loading');

    // Cancel any in-flight SSE stream
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // 1. Get image spec from API
      const specRes = await fetch('/api/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, classification, selectedCopy: copyResult?.variants.find(v => v.id === copyResult?.selectedVariantId) }),
        signal: ctrl.signal,
      });
      if (!specRes.ok) throw new Error(`Spec API error: ${specRes.status}`);
      const { imageSpec: spec, backgrounds: bgs } = await specRes.json();

      setImageSpec(spec);

      // 2. Add placeholder thumbnails immediately so gallery shows up
      (bgs as GeneratedBackground[]).forEach(addBackground);

      // 3. In production you'd open an SSE stream here to receive thumbnails as they generate
      //    For the skeleton we just mark them all ready after a simulated delay
      await new Promise((r) => setTimeout(r, 1200));
      (bgs as GeneratedBackground[]).forEach((bg: GeneratedBackground) => {
        updateBackground(bg.id, { status: 'ready' });
      });

      setStepStatus(4, 'idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Image generation failed');
      setStepStatus(4, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brief && classification && backgrounds.length === 0) generateBackgrounds();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-light">Background Gallery</h1>
          <p className="text-brand-muted text-sm mt-1">
            AI-generated backgrounds tailored to your campaign. Select one to continue.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={generateBackgrounds} loading={loading} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Regenerate
        </Button>
      </div>

      {/* Image spec preview */}
      {imageSpec && (
        <Card padding="sm">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-accent-violet mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1">Generation Prompt</p>
              <p className="text-xs text-brand-light font-mono leading-relaxed line-clamp-2">{imageSpec.prompt}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-800/40">
          <p className="text-red-400 text-sm">{error}</p>
          <Button size="sm" variant="secondary" onClick={generateBackgrounds} className="mt-3">Try again</Button>
        </Card>
      )}

      {/* Gallery grid */}
      {backgrounds.length === 0 && loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-video rounded-xl shimmer-bg" />
          ))}
        </div>
      )}

      {backgrounds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
          {backgrounds.map((bg) => (
            <BackgroundThumbnail
              key={bg.id}
              bg={bg}
              selected={bg.id === selectedBackgroundId}
              onSelect={() => selectBackground(bg.id)}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
        <Button
          onClick={nextStep}
          disabled={!selectedBackgroundId}
          icon={<ChevronRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Preview Banner
        </Button>
      </div>
    </div>
  );
}

function BackgroundThumbnail({
  bg,
  selected,
  onSelect,
}: {
  bg: GeneratedBackground;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        'relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red',
        selected ? 'border-brand-red ring-2 ring-brand-red/30' : 'border-brand-border hover:border-brand-muted',
      ].join(' ')}
    >
      {bg.status === 'ready' && bg.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg.url} alt="Generated background" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-brand-card shimmer-bg">
          {bg.status === 'failed' ? (
            <ImageIcon className="w-6 h-6 text-red-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-brand-muted animate-spin" />
          )}
        </div>
      )}

      {/* Selection overlay */}
      {selected && (
        <div className="absolute inset-0 bg-brand-red/20 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Hover overlay */}
      {!selected && bg.status === 'ready' && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-white font-medium">Select</span>
        </div>
      )}
    </button>
  );
}

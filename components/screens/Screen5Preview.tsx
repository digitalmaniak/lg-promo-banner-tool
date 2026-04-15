'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Upload, Sliders, Eye } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function Screen5Preview() {
  const {
    bannerConfig, updateBannerConfig,
    preview, setPreview,
    copyResult,
    setStepStatus, prevStep, nextStep,
  } = usePipeline();

  const [rendering, setRendering]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showSettings, setSettings] = useState(false);

  const selectedCopy = copyResult?.variants.find((v) => v.id === copyResult?.selectedVariantId);

  const renderBanner = async () => {
    setRendering(true);
    setError(null);
    setPreview({ isRendering: true });
    setStepStatus(5, 'loading');

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerConfig }),
      });
      if (!res.ok) throw new Error(`Render API error: ${res.status}`);
      const { previewUrl } = await res.json();
      setPreview({ isRendering: false, previewUrl, lastRenderedAt: new Date().toISOString() });
      setStepStatus(5, 'complete');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Render failed';
      setError(msg);
      setPreview({ isRendering: false, renderError: msg });
      setStepStatus(5, 'error');
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    if (!preview.previewUrl) renderBanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateBannerConfig({ productImageUrl: url });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-light">Live Preview</h1>
          <p className="text-brand-muted text-sm mt-1">
            Review your banner. Adjust settings and re-render as needed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSettings((s) => !s)}
            icon={<Sliders className="w-3.5 h-3.5" />}
          >
            Settings
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={rendering}
            onClick={renderBanner}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Re-render
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showSettings ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Banner preview area */}
        <div className={showSettings ? 'lg:col-span-2' : ''}>
          <div className="rounded-xl overflow-hidden border border-brand-border bg-brand-card">
            {/* Aspect ratio container: 8:3 (1600×600) */}
            <div className="relative w-full" style={{ paddingBottom: '37.5%' }}>
              {rendering ? (
                <div className="absolute inset-0 flex items-center justify-center shimmer-bg">
                  <div className="text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-brand-muted animate-spin mx-auto" />
                    <p className="text-xs text-brand-muted">Rendering banner…</p>
                  </div>
                </div>
              ) : preview.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.previewUrl}
                  alt="Banner preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                /* Simulated placeholder preview */
                <div
                  className="absolute inset-0 flex items-end p-8"
                  style={{
                    background: bannerConfig.backgroundUrl
                      ? `url(${bannerConfig.backgroundUrl}) center/cover`
                      : 'linear-gradient(135deg, #0D1117 0%, #161B27 60%, #1C2333 100%)',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: `rgba(13,17,23,${bannerConfig.overlayOpacity})` }}
                  />
                  <div className="relative z-10 space-y-1.5 max-w-lg">
                    {selectedCopy?.eyebrow && (
                      <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">
                        {selectedCopy.eyebrow}
                      </p>
                    )}
                    <h2 className="text-2xl font-bold text-white leading-tight">
                      {selectedCopy?.headline ?? 'Headline will appear here'}
                    </h2>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {selectedCopy?.subtext ?? 'Subtext will appear here'}
                    </p>
                    {selectedCopy?.cta && (
                      <div className="inline-block mt-2 bg-brand-red px-4 py-1.5 rounded text-xs text-white font-semibold">
                        {selectedCopy.cta}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas info */}
          <div className="flex items-center justify-between mt-2 text-xs text-brand-muted">
            <span>{bannerConfig.width} × {bannerConfig.height}px · Web Hero</span>
            {preview.lastRenderedAt && (
              <span>Last rendered {new Date(preview.lastRenderedAt).toLocaleTimeString()}</span>
            )}
          </div>

          {error && (
            <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Settings panel */}
        {showSettings && (
          <Card className="h-fit animate-fade-in">
            <CardHeader title="Banner Settings" />

            {/* Product image */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-2">
                  Product Image
                </label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-brand-border rounded-lg p-3 hover:border-brand-muted transition-colors text-sm text-brand-muted hover:text-brand-light">
                  <Upload className="w-4 h-4" />
                  <span>{bannerConfig.productImageUrl ? 'Replace image' : 'Upload product PNG'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                </label>
                {bannerConfig.productImageUrl && (
                  <p className="text-xs text-accent-green mt-1">✓ Image loaded</p>
                )}
              </div>

              {/* Overlay opacity */}
              <div>
                <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-2">
                  Overlay Opacity: {Math.round(bannerConfig.overlayOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.05}
                  value={bannerConfig.overlayOpacity}
                  onChange={(e) => updateBannerConfig({ overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-brand-red"
                />
              </div>

              <Button size="sm" className="w-full" onClick={renderBanner} loading={rendering} icon={<Eye className="w-3.5 h-3.5" />}>
                Apply & Re-render
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
        <Button
          onClick={nextStep}
          icon={<ChevronRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Export & Push
        </Button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { ChevronLeft, Download, Figma, Check, Package, RotateCcw, ExternalLink } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BANNER_SIZES } from '@/lib/types';
import type { BannerSize } from '@/lib/types';

type ExportStatus = 'idle' | 'exporting' | 'done' | 'error';

export function Screen6Export() {
  const { exportConfig, updateExportConfig, bannerConfig, preview, prevStep, reset } = usePipeline();
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [figmaStatus,  setFigmaStatus]  = useState<ExportStatus>('idle');
  const [exportedUrls, setExportedUrls] = useState<{ label: string; url: string }[]>([]);
  const [figmaUrl,     setFigmaUrl]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const toggleSize = (size: BannerSize) => {
    const exists = exportConfig.sizes.some((s) => s.label === size.label);
    updateExportConfig({
      sizes: exists
        ? exportConfig.sizes.filter((s) => s.label !== size.label)
        : [...exportConfig.sizes, size],
    });
  };

  const toggleFormat = (fmt: 'jpg' | 'png' | 'webp') => {
    const exists = exportConfig.formats.includes(fmt);
    updateExportConfig({
      formats: exists
        ? exportConfig.formats.filter((f) => f !== fmt)
        : [...exportConfig.formats, fmt],
    });
  };

  const handleExport = async () => {
    if (exportConfig.sizes.length === 0) return;
    setExportStatus('exporting');
    setError(null);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerConfig, exportConfig }),
      });
      if (!res.ok) throw new Error(`Export API error: ${res.status}`);
      const { files } = await res.json();
      setExportedUrls(files ?? []);
      setExportStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setExportStatus('error');
    }
  };

  const handleFigmaPush = async () => {
    setFigmaStatus('exporting');

    try {
      const res = await fetch('/api/figma-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerConfig, previewUrl: preview.previewUrl, figmaFrameId: exportConfig.figmaFrameId }),
      });
      if (!res.ok) throw new Error(`Figma API error: ${res.status}`);
      const { figmaUrl: url } = await res.json();
      setFigmaUrl(url);
      setFigmaStatus('done');
    } catch (err) {
      setFigmaStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-light">Export & Push</h1>
        <p className="text-brand-muted text-sm mt-1">
          Download your banner in multiple sizes and formats, or push directly to Figma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Export options */}
        <div className="space-y-5">
          {/* Sizes */}
          <Card>
            <CardHeader title="Output Sizes" subtitle="Select which sizes to export" />
            <div className="space-y-2">
              {(['web', 'display', 'social', 'email'] as const).map((platform) => {
                const sizes = BANNER_SIZES.filter((s) => s.platform === platform);
                return (
                  <div key={platform}>
                    <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1.5 capitalize">
                      {platform}
                    </p>
                    {sizes.map((size) => {
                      const selected = exportConfig.sizes.some((s) => s.label === size.label);
                      return (
                        <label
                          key={size.label}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-brand-panel cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={[
                                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                                selected ? 'bg-brand-red border-brand-red' : 'border-brand-border group-hover:border-brand-muted',
                              ].join(' ')}
                            >
                              {selected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm text-brand-light">{size.label}</span>
                          </div>
                          <span className="text-xs text-brand-muted font-mono">
                            {size.width}×{size.height}
                          </span>
                          <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleSize(size)} />
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Formats */}
          <Card>
            <CardHeader title="File Format" />
            <div className="flex gap-2">
              {(['jpg', 'png', 'webp'] as const).map((fmt) => {
                const active = exportConfig.formats.includes(fmt);
                return (
                  <button
                    key={fmt}
                    onClick={() => toggleFormat(fmt)}
                    className={[
                      'flex-1 py-2 rounded-lg text-sm font-semibold uppercase border transition-all',
                      active
                        ? 'bg-brand-red/20 border-brand-red text-brand-red'
                        : 'bg-transparent border-brand-border text-brand-muted hover:border-brand-muted',
                    ].join(' ')}
                  >
                    .{fmt}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Actions & status */}
        <div className="space-y-5">
          {/* Export action */}
          <Card padding="lg">
            <CardHeader title="Download Package" />
            <p className="text-xs text-brand-muted mb-4">
              {exportConfig.sizes.length} size{exportConfig.sizes.length !== 1 ? 's' : ''} selected ·{' '}
              {exportConfig.formats.join(', ').toUpperCase()}
            </p>

            {exportStatus === 'done' ? (
              <div className="space-y-3">
                <StatusBadge variant="complete" label="Export complete!" />
                <div className="space-y-1.5">
                  {exportedUrls.map(({ label, url }) => (
                    <a
                      key={label}
                      href={url}
                      download
                      className="flex items-center justify-between text-xs text-brand-light hover:text-accent-blue px-2 py-1.5 rounded hover:bg-brand-panel transition-colors"
                    >
                      <span>{label}</span>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <Button
                  className="w-full"
                  loading={exportStatus === 'exporting'}
                  disabled={exportConfig.sizes.length === 0}
                  icon={<Package className="w-4 h-4" />}
                  onClick={handleExport}
                >
                  Export {exportConfig.sizes.length > 0 ? `(${exportConfig.sizes.length} sizes)` : ''}
                </Button>
              </>
            )}
          </Card>

          {/* Figma push */}
          <Card padding="lg">
            <CardHeader
              title="Push to Figma"
              badge={<StatusBadge variant="info" label="Coming Soon" />}
            />
            <p className="text-xs text-brand-muted mb-4">
              Automatically place the banner into a Figma frame for handoff to the design team.
            </p>

            <div className="space-y-3">
              <input
                placeholder="Figma Frame ID (optional)"
                value={exportConfig.figmaFrameId ?? ''}
                onChange={(e) => updateExportConfig({ figmaFrameId: e.target.value })}
                className="w-full bg-brand-panel border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-light placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-red"
              />

              {figmaStatus === 'done' && figmaUrl ? (
                <a
                  href={figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-accent-blue hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Figma
                </a>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={figmaStatus === 'exporting'}
                  icon={<Figma className="w-4 h-4" />}
                  onClick={handleFigmaPush}
                  disabled
                >
                  Push to Figma
                </Button>
              )}
            </div>
          </Card>

          {/* Start over */}
          <div className="text-center">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-light transition-colors mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Start a new campaign
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
        <StatusBadge variant="complete" label="Pipeline complete" />
      </div>
    </div>
  );
}

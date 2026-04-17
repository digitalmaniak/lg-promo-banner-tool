'use client';

import React, { useState } from 'react';
import {
  ChevronLeft, Download, Figma, Check,
  RotateCcw, ExternalLink, Copy, Image as ImageIcon,
} from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

type ActionStatus = 'idle' | 'loading' | 'done' | 'error';

// ── Small copy-to-clipboard helper ───────────────────────────────
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="group">
      <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-start gap-2 bg-brand-panel border border-brand-border rounded-lg px-3 py-2.5">
        <p className="flex-1 text-sm text-brand-light leading-snug">{value}</p>
        <button
          onClick={copy}
          title="Copy to clipboard"
          className="shrink-0 mt-0.5 text-brand-muted hover:text-brand-red transition-colors"
        >
          {copied
            ? <Check className="w-3.5 h-3.5 text-green-500" />
            : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function Screen6Export() {
  const {
    copyResult, classification, backgrounds, selectedBackgroundId,
    exportConfig, updateExportConfig,
    bannerConfig, preview,
    prevStep, reset,
  } = usePipeline();

  const [exportStatus, setExportStatus] = useState<ActionStatus>('idle');
  const [figmaStatus,  setFigmaStatus]  = useState<ActionStatus>('idle');
  const [downloadUrl,  setDownloadUrl]  = useState<string | null>(null);
  const [figmaUrl,     setFigmaUrl]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const selectedCopy = copyResult?.variants.find((v) => v.id === copyResult?.selectedVariantId);
  const selectedBg   = backgrounds.find((b) => b.id === selectedBackgroundId);

  // ── Background image download ─────────────────────────────────
  const handleExportBg = async () => {
    if (!selectedBg?.url) return;
    setExportStatus('loading');
    setError(null);
    try {
      const res  = await fetch(selectedBg.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `lg-hero-banner-background-1600x600.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('done');
    } catch {
      setError('Download failed — try right-clicking the background in Screen 4 and saving manually.');
      setExportStatus('error');
    }
  };

  // ── Figma push ────────────────────────────────────────────────
  const handleFigmaPush = async () => {
    setFigmaStatus('loading');
    try {
      const res = await fetch('/api/figma-push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bannerConfig,
          previewUrl:    preview.previewUrl,
          figmaFrameId:  exportConfig.figmaFrameId,
          selectedCopy,
          backgroundUrl: selectedBg?.url,
        }),
      });
      if (!res.ok) throw new Error(`Figma API error: ${res.status}`);
      const { figmaUrl: url } = await res.json();
      setFigmaUrl(url);
      setFigmaStatus('done');
    } catch {
      setFigmaStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-brand-light">Export &amp; Push</h1>
        <p className="text-brand-muted text-sm mt-1">
          Download your Hero Banner background and push assets to Figma for handoff.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Copy elements + background export ─────────── */}
        <div className="space-y-5">

          {/* Selected copy elements */}
          <Card>
            <CardHeader title="Selected Copy" subtitle="From Screen 3 — click any field to copy" />
            <div className="space-y-3">
              {selectedCopy?.eyebrow && (
                <CopyField label="Eyebrow" value={selectedCopy.eyebrow} />
              )}
              <CopyField
                label="Headline"
                value={selectedCopy?.headline ?? '—'}
              />
              {selectedCopy?.subtext && (
                <CopyField label="Subtext / Body" value={selectedCopy.subtext} />
              )}
              <CopyField
                label="CTA"
                value={selectedCopy?.cta ?? '—'}
              />
              {classification?.type && (
                <CopyField
                  label="Classification"
                  value={`${classification.type} · ${classification.template}`}
                />
              )}
            </div>
          </Card>

          {/* Hero Banner background export */}
          <Card>
            <CardHeader
              title="Hero Banner Background"
              subtitle="1600 × 600 px · Ideogram v2 · JPG"
            />
            <div className="flex items-center gap-3 mb-4">
              {selectedBg?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedBg.url}
                  alt="Selected background thumbnail"
                  className="w-24 h-9 rounded object-cover border border-brand-border shrink-0"
                />
              ) : (
                <div className="w-24 h-9 rounded bg-brand-panel border border-brand-border shrink-0 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-brand-muted" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-brand-light font-medium truncate">
                  lg-hero-banner-background-1600x600.jpg
                </p>
                <p className="text-xs text-brand-muted">Web Hero · OBS / PS ready</p>
              </div>
            </div>

            {exportStatus === 'done' ? (
              <StatusBadge variant="complete" label="Downloaded!" />
            ) : (
              <>
                {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
                <Button
                  className="w-full"
                  loading={exportStatus === 'loading'}
                  disabled={!selectedBg?.url}
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExportBg}
                >
                  Download Background JPG
                </Button>
              </>
            )}
          </Card>
        </div>

        {/* ── RIGHT: Figma push ────────────────────────────────── */}
        <div className="space-y-5">
          <Card padding="lg">
            <CardHeader
              title="Push to Figma"
              badge={<StatusBadge variant="info" label="Next up" />}
            />
            <p className="text-xs text-brand-muted mb-4 leading-relaxed">
              Enter your Figma file URL or Frame ID to place the banner background and
              copy elements directly into the template frame for design handoff.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1">
                  Figma File URL or Frame ID
                </label>
                <input
                  placeholder="https://figma.com/file/... or frame node ID"
                  value={exportConfig.figmaFrameId ?? ''}
                  onChange={(e) => updateExportConfig({ figmaFrameId: e.target.value })}
                  className="w-full bg-brand-panel border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-light placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              {figmaStatus === 'done' && figmaUrl ? (
                <div className="space-y-2">
                  <StatusBadge variant="complete" label="Pushed to Figma!" />
                  <a
                    href={figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-red hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Figma
                  </a>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={figmaStatus === 'loading'}
                  icon={<Figma className="w-4 h-4" />}
                  onClick={handleFigmaPush}
                  disabled
                >
                  Push to Figma
                </Button>
              )}

              {figmaStatus === 'error' && (
                <p className="text-xs text-red-400">Push failed — Figma integration coming soon.</p>
              )}
            </div>
          </Card>

          {/* What gets pushed summary */}
          <Card padding="sm">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
              What will be pushed to Figma
            </p>
            <ul className="space-y-2 text-xs text-brand-muted">
              {[
                'Hero Banner background image (1600×600)',
                'Eyebrow, Headline, Subtext, CTA as text layers',
                'Classification type & template name as frame notes',
                'LG EI font styles applied to text layers',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          {/* Start over */}
          <div className="text-center pt-2">
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

      {/* ── Navigation ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>
          Back
        </Button>
        <StatusBadge variant="complete" label="Pipeline complete" />
      </div>
    </div>
  );
}

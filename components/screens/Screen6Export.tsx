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
  const [figmaError, setFigmaError] = useState<string | null>(null);
  const [pushSummary, setPushSummary] = useState<{ imageUploaded: boolean; commentId: string } | null>(null);

  const handleFigmaPush = async () => {
    setFigmaStatus('loading');
    setFigmaError(null);
    try {
      // Step 1 — save banner data so the Figma plugin can fetch it
      await fetch('/api/figma-data', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          eyebrow:        selectedCopy?.eyebrow ?? '',
          headline:       selectedCopy?.headline ?? '',
          subtext:        selectedCopy?.subtext ?? '',
          cta:            selectedCopy?.cta ?? '',
          backgroundUrl:  selectedBg?.url ?? '',
          classification: classification?.type ?? '',
          template:       classification?.template ?? '',
        }),
      });

      // Step 2 — post Figma comment (requires FIGMA_ACCESS_TOKEN in Vercel)
      const res = await fetch('/api/figma-push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          selectedCopy,
          classification,
          backgroundUrl:  selectedBg?.url,
          figmaFrameId:   exportConfig.figmaFrameId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Figma push failed (${res.status})`);
      setFigmaUrl(data.figmaUrl);
      setPushSummary({ imageUploaded: data.summary?.imageUploaded, commentId: data.commentId });
      setFigmaStatus('done');
    } catch (err) {
      setFigmaError(err instanceof Error ? err.message : 'Push failed');
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
        <div className="space-y-5 opacity-40 pointer-events-none select-none">
          <Card padding="lg">
            <CardHeader
              title="Push to Figma"
              badge={
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium text-brand-muted bg-brand-border/30 border-brand-border/50">
                  Reconsidering
                </span>
              }
            />
            <p className="text-xs text-brand-muted mb-4 leading-relaxed">
              Uploads the background to Figma's CDN and posts an anchored handoff
              comment on the template frame with all copy, classification, and next steps
              for the design team.
            </p>

            <div className="space-y-3">
              {/* Optional frame ID override */}
              <div>
                <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1">
                  Frame Node ID <span className="font-normal normal-case">(optional — defaults to template root)</span>
                </label>
                <input
                  placeholder="e.g. 12:34  — leave blank to use default frame"
                  value={exportConfig.figmaFrameId ?? ''}
                  onChange={(e) => updateExportConfig({ figmaFrameId: e.target.value })}
                  className="w-full bg-brand-panel border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-light placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              {figmaStatus === 'done' && figmaUrl ? (
                <div className="space-y-3">
                  <StatusBadge variant="complete" label="Ready for plugin!" />
                  <ul className="text-xs text-brand-muted space-y-1.5">
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500 shrink-0" />
                      Banner data saved — plugin can now fetch it
                    </li>
                    {pushSummary?.commentId && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500 shrink-0" />
                        Handoff comment posted to Figma frame
                      </li>
                    )}
                  </ul>

                  {/* Plugin next steps */}
                  <div className="bg-brand-panel border border-brand-border rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-brand-light">Next: run the plugin in Figma</p>
                    <ol className="text-xs text-brand-muted space-y-1 list-decimal list-inside">
                      <li>Open the Figma template file</li>
                      <li>Menu → Plugins → Development → <strong className="text-brand-light">LG Banner Tool</strong></li>
                      <li>Click <strong className="text-brand-light">Apply to Template</strong></li>
                    </ol>
                  </div>

                  <a
                    href={figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-brand-red hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open template in Figma
                  </a>
                </div>
              ) : (
                <>
                  {figmaError && (
                    <p className="text-xs text-red-400 bg-red-50 border border-red-200 rounded-lg p-3 leading-relaxed">
                      {figmaError}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    loading={figmaStatus === 'loading'}
                    icon={<Figma className="w-4 h-4" />}
                    onClick={handleFigmaPush}
                    disabled={!selectedBg?.url}
                  >
                    {figmaStatus === 'loading' ? 'Pushing to Figma…' : 'Push to Figma'}
                  </Button>
                </>
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

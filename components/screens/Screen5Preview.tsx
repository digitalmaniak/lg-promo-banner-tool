'use client';

import React, { useState, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Upload, SunMedium, Moon,
  Sliders, ImagePlus, X,
} from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ─────────────────────────────────────────────
//  Detect whether the selected background is
//  dark (needs white copy) or light (dark copy).
//  Based on classification type from brand knowledge.
// ─────────────────────────────────────────────
function isDarkTemplate(template: string, type: string): boolean {
  if (template === 'npi_beauty_shot') return true;
  if (type === 'Price Drop' || type === 'Clearance') return true;
  if (type === 'NPI') return true;
  return false;
}

export function Screen5Preview() {
  const {
    classification,
    copyResult,
    backgrounds, selectedBackgroundId,
    bannerConfig, updateBannerConfig,
    prevStep, nextStep,
  } = usePipeline();

  const selectedBg   = backgrounds.find((b) => b.id === selectedBackgroundId);
  const selectedCopy = copyResult?.variants.find((v) => v.id === copyResult?.selectedVariantId);

  // Determine default text scheme from template type
  const defaultDark = isDarkTemplate(
    classification?.template ?? '',
    classification?.type ?? '',
  );

  const [darkText, setDarkText]       = useState(!defaultDark);   // true = dark text on light bg
  const [overlay, setOverlay]         = useState(defaultDark ? 0.15 : 0);
  const [showControls, setControls]   = useState(false);
  const [productImg, setProductImg]   = useState<string | null>(bannerConfig.productImageUrl ?? null);
  const fileRef                       = useRef<HTMLInputElement>(null);

  const textColor   = darkText ? '#0F172A' : '#FFFFFF';
  const eyebrowColor = darkText ? '#64748B' : 'rgba(255,255,255,0.75)';
  const subtextColor = darkText ? '#334155' : 'rgba(255,255,255,0.85)';
  const bgUrl       = selectedBg?.url ?? bannerConfig.backgroundUrl ?? '';

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProductImg(url);
    updateBannerConfig({ productImageUrl: url });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-light">Live Preview</h1>
          <p className="text-brand-muted text-sm mt-1">
            Your banner, composited in real time. Upload a product image to complete it.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Text scheme toggle */}
          <button
            onClick={() => setDarkText((d) => !d)}
            title={darkText ? 'Switch to white text' : 'Switch to dark text'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border text-xs font-medium text-brand-muted hover:text-brand-light hover:border-brand-muted transition-colors"
          >
            {darkText ? <Moon className="w-3.5 h-3.5" /> : <SunMedium className="w-3.5 h-3.5" />}
            {darkText ? 'White text' : 'Dark text'}
          </button>
          <button
            onClick={() => setControls((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border text-xs font-medium text-brand-muted hover:text-brand-light hover:border-brand-muted transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Adjust
          </button>
        </div>
      </div>

      {/* ── Banner Canvas ───────────────────────────────────── */}
      {/*  Aspect ratio: 1600 × 600 = 37.5% padding-bottom     */}
      <div className="rounded-xl overflow-hidden shadow-lg border border-brand-border">
        <div className="relative w-full" style={{ paddingBottom: '37.5%' }}>

          {/* Layer 1 — Background image */}
          <div
            className="absolute inset-0 bg-gray-200"
            style={{
              backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Layer 2 — Gradient overlay for copy legibility
               Dark templates: black-to-transparent left→right (darkens copy zone)
               Light templates: white-to-transparent left→right (lightens copy zone) */}
          {overlay > 0 && (
            <div
              className="absolute inset-0"
              style={{
                background: darkText
                  ? `linear-gradient(to right, rgba(255,255,255,${overlay}) 0%, rgba(255,255,255,${overlay * 0.6}) 45%, transparent 70%)`
                  : `linear-gradient(to right, rgba(0,0,0,${overlay}) 0%, rgba(0,0,0,${overlay * 0.6}) 45%, transparent 70%)`,
              }}
            />
          )}

          {/* Layer 3 — Product image (right zone, composited) */}
          {productImg && (
            <div
              className="absolute top-0 right-0 h-full flex items-end justify-end"
              style={{ width: '55%' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImg}
                alt="Product"
                className="h-full w-full object-contain object-right-bottom"
                style={{ maxHeight: '100%' }}
              />
            </div>
          )}

          {/* Layer 4 — Copy zone (left ~45%) */}
          <div
            className="absolute inset-0 flex items-center"
            style={{ paddingLeft: '4%', paddingRight: '57%' }}
          >
            <div className="w-full space-y-0">

              {/* Eyebrow */}
              {selectedCopy?.eyebrow && (
                <p
                  style={{
                    fontFamily: "'LGEIText', sans-serif",
                    fontWeight: 700,
                    fontSize: 'clamp(9px, 0.75vw, 11px)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: eyebrowColor,
                    marginBottom: '4%',
                    lineHeight: 1,
                  }}
                >
                  {selectedCopy.eyebrow}
                </p>
              )}

              {/* Red accent line (Figma template shows a small red bar above headline) */}
              <div
                style={{
                  width: 'clamp(20px, 2vw, 28px)',
                  height: '2px',
                  backgroundColor: '#B00020',
                  marginBottom: '6%',
                }}
              />

              {/* Headline */}
              <h2
                style={{
                  fontFamily: "'LGEIHeadline', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(18px, 2.6vw, 42px)',
                  lineHeight: 1.1,
                  color: textColor,
                  marginBottom: '5%',
                  letterSpacing: '-0.01em',
                }}
              >
                {selectedCopy?.headline ?? 'Headline goes here'}
              </h2>

              {/* Subtext */}
              {selectedCopy?.subtext && (
                <p
                  style={{
                    fontFamily: "'LGEIText', sans-serif",
                    fontWeight: 400,
                    fontSize: 'clamp(9px, 0.85vw, 13px)',
                    lineHeight: 1.55,
                    color: subtextColor,
                    marginBottom: '7%',
                    maxWidth: '90%',
                  }}
                >
                  {selectedCopy.subtext}
                </p>
              )}

              {/* CTA Button */}
              {selectedCopy?.cta && (
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#B00020',
                    color: '#FFFFFF',
                    fontFamily: "'LGEIText', sans-serif",
                    fontWeight: 700,
                    fontSize: 'clamp(8px, 0.75vw, 12px)',
                    letterSpacing: '0.02em',
                    padding: 'clamp(5px, 0.5vw, 8px) clamp(12px, 1.2vw, 20px)',
                    borderRadius: '999px',
                    cursor: 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedCopy.cta}
                </div>
              )}
            </div>
          </div>

          {/* Layer 5 — Product upload prompt (right zone, when no image) */}
          {!productImg && (
            <div
              className="absolute top-0 right-0 h-full flex flex-col items-center justify-center"
              style={{ width: '52%' }}
            >
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 opacity-40 hover:opacity-70 transition-opacity group"
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-white flex items-center justify-center group-hover:border-brand-red transition-colors">
                  <ImagePlus className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-xs font-medium" style={{ fontFamily: "'LGEIText', sans-serif" }}>
                  Upload product image
                </span>
              </button>
            </div>
          )}

          {/* Product image remove button */}
          {productImg && (
            <button
              onClick={() => { setProductImg(null); updateBannerConfig({ productImageUrl: undefined }); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
              title="Remove product image"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          {/* Badge (top right, from classification) */}
          {classification?.suggestedBadge && (
            <div
              className="absolute"
              style={{ top: '8%', right: productImg ? '4%' : '6%' }}
            >
              <div
                style={{
                  backgroundColor: '#B00020',
                  color: '#FFFFFF',
                  fontFamily: "'LGEIText', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(7px, 0.65vw, 10px)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: 'clamp(4px, 0.4vw, 6px) clamp(8px, 0.8vw, 12px)',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {classification.suggestedBadge}
              </div>
            </div>
          )}

        </div>{/* end aspect-ratio container */}
      </div>

      {/* ── Canvas metadata ─────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-brand-muted px-1">
        <span>1600 × 600 px · Web Hero · {classification?.template ?? 'banner'}</span>
        <span className="flex items-center gap-3">
          {selectedBg && <span>Background: Ideogram v2</span>}
          <span style={{ fontFamily: "'LGEIHeadline', sans-serif" }} className="text-brand-light font-medium">
            LG EI Fonts active
          </span>
        </span>
      </div>

      {/* ── Adjustment Controls ─────────────────────────────── */}
      {showControls && (
        <Card padding="sm" className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {/* Product image upload */}
            <div>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Product Image</p>
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-brand-border rounded-lg p-3 hover:border-brand-red transition-colors text-sm text-brand-muted hover:text-brand-light">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">{productImg ? 'Replace product PNG' : 'Upload product PNG'}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/webp,image/jpeg"
                  className="hidden"
                  onChange={handleProductUpload}
                />
              </label>
              {productImg && (
                <button
                  onClick={() => { setProductImg(null); updateBannerConfig({ productImageUrl: undefined }); }}
                  className="text-xs text-red-500 mt-1 hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>

            {/* Overlay opacity */}
            <div>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
                Overlay Opacity: {Math.round(overlay * 100)}%
              </p>
              <input
                type="range"
                min={0}
                max={0.75}
                step={0.05}
                value={overlay}
                onChange={(e) => setOverlay(parseFloat(e.target.value))}
                className="w-full accent-brand-red"
              />
              <p className="text-xs text-brand-muted mt-1">Gradient fades left → transparent right</p>
            </div>

            {/* Text scheme */}
            <div>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Text Color</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDarkText(false)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    !darkText
                      ? 'border-brand-red bg-red-50 text-brand-red'
                      : 'border-brand-border text-brand-muted hover:border-brand-muted'
                  }`}
                >
                  ◻ White
                </button>
                <button
                  onClick={() => setDarkText(true)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    darkText
                      ? 'border-brand-red bg-red-50 text-brand-red'
                      : 'border-brand-border text-brand-muted hover:border-brand-muted'
                  }`}
                >
                  ◼ Dark
                </button>
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* ── Navigation ──────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          onClick={nextStep}
          icon={<ChevronRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Export &amp; Push
        </Button>
      </div>

      {/* Hidden file input for product image (also triggered by canvas upload prompt) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/webp,image/jpeg"
        className="hidden"
        onChange={handleProductUpload}
      />
    </div>
  );
}

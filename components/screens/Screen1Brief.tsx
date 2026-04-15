'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronRight, Info } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { BriefData } from '@/lib/types';

const CAMPAIGN_TYPES = [
  'New Product Launch',
  'Price Drop / Sale',
  'Event / Holiday',
  'Bundle Deal',
  'Clearance',
  'Brand Awareness',
  'Competitive',
];

const BRAND_TONES = [
  'Premium & Sophisticated',
  'Urgent & Action-Oriented',
  'Lifestyle & Aspirational',
  'Technical & Feature-Rich',
  'Playful & Energetic',
];

const initialBrief: BriefData = {
  productName:      '',
  productCategory:  '',
  campaignType:     '',
  targetAudience:   '',
  keyMessage:       '',
  price:            '',
  promotionDetails: '',
  campaignDates:    '',
  retailer:         '',
  brandTone:        '',
  additionalNotes:  '',
};

function inputClass(hasError: boolean): string {
  return [
    'w-full bg-brand-panel border rounded-lg px-3 py-2 text-sm text-brand-light',
    'placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-red',
    'focus:border-transparent transition-all',
    hasError ? 'border-red-500/70' : 'border-brand-border',
  ].join(' ');
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-brand-light">
        {label}
        {required && <span className="text-brand-red text-xs">*</span>}
        {hint && (
          <span title={hint} className="text-brand-muted cursor-help">
            <Info className="w-3 h-3" />
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Screen1Brief() {
  const { setBrief, setStepStatus, nextStep } = usePipeline();
  const [form, setForm] = useState<BriefData>(initialBrief);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BriefData, string>>>({});

  const update = (field: keyof BriefData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BriefData, string>> = {};
    if (!form.productName.trim())     newErrors.productName = 'Required';
    if (!form.productCategory.trim()) newErrors.productCategory = 'Required';
    if (!form.campaignType)           newErrors.campaignType = 'Select a campaign type';
    if (!form.targetAudience.trim())  newErrors.targetAudience = 'Required';
    if (!form.keyMessage.trim())      newErrors.keyMessage = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setStepStatus(1, 'loading');
    await new Promise((r) => setTimeout(r, 400));
    setBrief(form);
    setLoading(false);
    nextStep();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-light">Campaign Brief</h1>
        <p className="text-brand-muted text-sm">
          Fill in your campaign details and Claude will classify the promotion type and generate tailored banner copy.
        </p>
      </div>

      {/* Required fields */}
      <Card>
        <h2 className="text-xs uppercase tracking-wider text-brand-muted mb-5 font-semibold">
          Core Details <span className="text-brand-red">*</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Product Name" required error={errors.productName}>
            <input
              value={form.productName}
              onChange={(e) => update('productName', e.target.value)}
              placeholder='e.g. OLED evo W6 97"'
              className={inputClass(!!errors.productName)}
            />
          </Field>

          <Field label="Product Category" required error={errors.productCategory}>
            <input
              value={form.productCategory}
              onChange={(e) => update('productCategory', e.target.value)}
              placeholder="e.g. OLED TV, Refrigerator, Washer"
              className={inputClass(!!errors.productCategory)}
            />
          </Field>

          <Field label="Campaign Type" required error={errors.campaignType}>
            <select
              value={form.campaignType}
              onChange={(e) => update('campaignType', e.target.value)}
              className={inputClass(!!errors.campaignType)}
            >
              <option value="">Select type...</option>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Target Audience"
            required
            hint="Who is this campaign primarily targeting?"
            error={errors.targetAudience}
          >
            <input
              value={form.targetAudience}
              onChange={(e) => update('targetAudience', e.target.value)}
              placeholder="e.g. Early adopters, Tech enthusiasts 35-54"
              className={inputClass(!!errors.targetAudience)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Key Message"
              required
              hint="The single most important thing the banner must communicate"
              error={errors.keyMessage}
            >
              <textarea
                rows={2}
                value={form.keyMessage}
                onChange={(e) => update('keyMessage', e.target.value)}
                placeholder="e.g. The world's largest wallpaper OLED TV is finally here"
                className={inputClass(!!errors.keyMessage)}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Optional fields */}
      <Card>
        <h2 className="text-xs uppercase tracking-wider text-brand-muted mb-5 font-semibold">
          Additional Details{' '}
          <span className="text-brand-muted text-xs normal-case font-normal">(optional but recommended)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Price / Offer" error={errors.price}>
            <input
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="e.g. $29,999 - Save $3,000"
              className={inputClass(false)}
            />
          </Field>

          <Field label="Retailer / Channel" error={errors.retailer}>
            <input
              value={form.retailer}
              onChange={(e) => update('retailer', e.target.value)}
              placeholder="e.g. Best Buy, LG.com, Costco"
              className={inputClass(false)}
            />
          </Field>

          <Field label="Campaign Dates" error={errors.campaignDates}>
            <input
              value={form.campaignDates}
              onChange={(e) => update('campaignDates', e.target.value)}
              placeholder="e.g. May 1 - June 30, 2025"
              className={inputClass(false)}
            />
          </Field>

          <Field label="Brand Tone" error={errors.brandTone}>
            <select
              value={form.brandTone}
              onChange={(e) => update('brandTone', e.target.value)}
              className={inputClass(false)}
            >
              <option value="">Let AI decide...</option>
              {BRAND_TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Promotion Details" error={errors.promotionDetails}>
              <textarea
                rows={2}
                value={form.promotionDetails}
                onChange={(e) => update('promotionDetails', e.target.value)}
                placeholder="e.g. Pre-order bonus: $500 gift card + free installation"
                className={inputClass(false)}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Additional Notes" error={errors.additionalNotes}>
              <textarea
                rows={2}
                value={form.additionalNotes}
                onChange={(e) => update('additionalNotes', e.target.value)}
                placeholder="Any specific requirements, restrictions, or context for the AI..."
                className={inputClass(false)}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-muted">
          <span className="text-brand-red">*</span> Required fields
        </p>
        <Button
          size="lg"
          loading={loading}
          icon={loading ? undefined : <Sparkles className="w-4 h-4" />}
          iconPosition="left"
          onClick={handleSubmit}
        >
          {loading ? 'Saving...' : 'Classify & Generate Copy'}
          {!loading && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

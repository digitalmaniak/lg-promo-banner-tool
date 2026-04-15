'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, ChevronRight, Upload, FileText, X } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { BriefData } from '@/lib/types';

export function Screen1Brief() {
  const { setBrief, setStepStatus, nextStep } = usePipeline();
  const [rawText, setRawText]     = useState('');
  const [fileName, setFileName]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
      setFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
    // reset input so the same file can be re-uploaded
    e.target.value = '';
  };

  const clearFile = () => {
    setFileName(null);
    setRawText('');
  };

  const handleSubmit = async () => {
    if (!rawText.trim()) {
      setError('Please paste your brief or upload a file before continuing.');
      return;
    }
    setLoading(true);
    setError(null);
    setStepStatus(1, 'loading');
    await new Promise((r) => setTimeout(r, 300));

    // Pack the full raw brief into keyMessage so the classify + copy APIs receive it
    const brief: BriefData = {
      productName:      '',
      productCategory:  '',
      campaignType:     '',
      targetAudience:   '',
      keyMessage:       rawText.trim(),
      price:            '',
      promotionDetails: '',
      campaignDates:    '',
      retailer:         '',
      brandTone:        '',
      additionalNotes:  '',
    };

    setBrief(brief);
    setLoading(false);
    nextStep();
  };

  const charCount = rawText.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-light">Campaign Brief</h1>
        <p className="text-brand-muted text-sm">
          Paste your existing brief below or upload a text file. Claude will read it and handle the rest.
        </p>
      </div>

      {/* Main input card */}
      <Card padding="md">
        {/* File upload strip */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
            Brief Content
          </span>

          <div className="flex items-center gap-2">
            {fileName ? (
              <div className="flex items-center gap-1.5 text-xs text-accent-green bg-accent-green/10 border border-accent-green/30 rounded-full px-3 py-1">
                <FileText className="w-3 h-3" />
                <span className="max-w-[160px] truncate">{fileName}</span>
                <button
                  onClick={clearFile}
                  className="ml-1 text-brand-muted hover:text-brand-light transition-colors"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-light border border-brand-border hover:border-brand-muted rounded-full px-3 py-1 transition-all"
              >
                <Upload className="w-3 h-3" />
                Upload brief file
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.rtf,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            if (error) setError(null);
          }}
          rows={18}
          placeholder={`Paste your full campaign brief here...

Example:
Product: LG OLED evo G5 65"
Campaign: New Product Launch
Key Message: The brightest OLED ever made — experience perfect blacks and peak brightness together
Target Audience: Premium TV buyers, home theater enthusiasts, ages 35-60
Price: $2,999
Promotion: Pre-order by May 31 and receive a free soundbar ($499 value)
Retailer: Best Buy, LG.com
Dates: May 15 – June 30, 2025
Tone: Premium & Sophisticated`}
          className={[
            'w-full bg-brand-dark border rounded-lg px-4 py-3 text-sm text-brand-light',
            'placeholder-brand-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-red',
            'focus:border-transparent transition-all resize-none leading-relaxed font-mono',
            error ? 'border-red-500/70' : 'border-brand-border',
          ].join(' ')}
        />

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs font-mono ${charCount > 0 ? 'text-brand-muted' : 'text-brand-border'}`}>
            {charCount > 0 ? `${charCount.toLocaleString()} characters` : 'No content yet'}
          </span>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </Card>

      {/* Tips */}
      <div className="flex gap-3 text-xs text-brand-muted bg-brand-panel/50 border border-brand-border/50 rounded-xl px-4 py-3">
        <Sparkles className="w-3.5 h-3.5 text-accent-violet shrink-0 mt-0.5" />
        <span>
          Include product name, campaign type, key message, target audience, pricing, and any promotion details.
          The more context you provide, the more accurate the AI classification and copy will be.
        </span>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Button
          size="lg"
          loading={loading}
          icon={loading ? undefined : <Sparkles className="w-4 h-4" />}
          iconPosition="left"
          onClick={handleSubmit}
          disabled={!rawText.trim()}
        >
          {loading ? 'Reading brief...' : 'Classify & Generate Copy'}
          {!loading && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

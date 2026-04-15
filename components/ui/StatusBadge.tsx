'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2, Minus } from 'lucide-react';

type BadgeVariant = 'idle' | 'loading' | 'complete' | 'error' | 'warning' | 'info';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const variantConfig: Record<
  BadgeVariant,
  { color: string; icon: React.ReactNode; defaultLabel: string }
> = {
  idle:     { color: 'text-brand-muted bg-brand-border/30 border-brand-border/50',    icon: <Minus className="w-3 h-3" />,               defaultLabel: 'Idle' },
  loading:  { color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/30',   icon: <Loader2 className="w-3 h-3 animate-spin" />, defaultLabel: 'Processing' },
  complete: { color: 'text-accent-green bg-accent-green/10 border-accent-green/30',   icon: <CheckCircle2 className="w-3 h-3" />,         defaultLabel: 'Complete' },
  error:    { color: 'text-red-400 bg-red-900/20 border-red-800/40',                  icon: <AlertCircle className="w-3 h-3" />,          defaultLabel: 'Error' },
  warning:  { color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/30',   icon: <AlertCircle className="w-3 h-3" />,          defaultLabel: 'Warning' },
  info:     { color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30',      icon: <Clock className="w-3 h-3" />,               defaultLabel: 'Info' },
};

export function StatusBadge({ variant, label, pulse = false, size = 'sm' }: StatusBadgeProps) {
  const cfg = variantConfig[variant];
  const text = label ?? cfg.defaultLabel;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        cfg.color,
        pulse ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {cfg.icon}
      {text}
    </span>
  );
}

// Confidence meter for classification screen
export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90 ? 'bg-accent-green' :
    pct >= 70 ? 'bg-accent-amber' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-brand-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

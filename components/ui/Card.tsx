'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
};

export function Card({
  children,
  className = '',
  onClick,
  selected = false,
  hoverable = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-brand-card rounded-xl border shadow-sm transition-all duration-150',
        selected
          ? 'border-brand-red ring-1 ring-brand-red/30 shadow-md'
          : 'border-brand-border',
        hoverable && !selected
          ? 'hover:border-brand-red/40 hover:shadow-md cursor-pointer'
          : '',
        onClick && !hoverable ? 'cursor-pointer' : '',
        paddingStyles[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, badge, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-brand-light truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-brand-muted mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

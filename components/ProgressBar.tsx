'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import type { WizardStep } from '@/lib/types';

const STEPS: { step: WizardStep; label: string; short: string }[] = [
  { step: 1, label: 'Brief Input',        short: 'Brief' },
  { step: 2, label: 'Classification',     short: 'Type' },
  { step: 3, label: 'Copy Variants',      short: 'Copy' },
  { step: 4, label: 'Background Gallery', short: 'BG' },
  { step: 5, label: 'Live Preview',       short: 'Preview' },
  { step: 6, label: 'Export & Push',      short: 'Export' },
];

export function ProgressBar() {
  const { currentStep, stepStatuses, goToStep } = usePipeline();

  return (
    <nav aria-label="Pipeline progress" className="w-full">
      {/* Desktop: full step labels */}
      <ol className="hidden md:flex items-center w-full">
        {STEPS.map(({ step, label }, idx) => {
          const status = stepStatuses[step];
          const isCurrent  = step === currentStep;
          const isComplete = status === 'complete';
          const isAccessible = isComplete || step <= currentStep;
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              <li className="flex items-center">
                <button
                  onClick={() => isAccessible && goToStep(step)}
                  disabled={!isAccessible}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'flex items-center gap-2 text-xs font-medium transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red rounded-md px-1 py-0.5',
                    isCurrent  ? 'text-brand-light' : '',
                    isComplete && !isCurrent ? 'text-accent-green cursor-pointer hover:text-accent-green/80' : '',
                    !isComplete && !isCurrent ? 'text-brand-muted cursor-default' : '',
                    isAccessible && !isCurrent && !isComplete ? 'cursor-pointer hover:text-brand-light' : '',
                  ].join(' ')}
                >
                  {/* Step circle */}
                  <span
                    className={[
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                      isCurrent
                        ? 'bg-brand-red border-brand-red text-white'
                        : isComplete
                        ? 'bg-accent-green/20 border-accent-green text-accent-green'
                        : 'bg-transparent border-brand-border text-brand-muted',
                    ].join(' ')}
                  >
                    {isComplete && !isCurrent ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      step
                    )}
                  </span>

                  {/* Label */}
                  <span>{label}</span>
                </button>
              </li>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mx-2 h-px bg-brand-border">
                  <div
                    className="h-full bg-brand-red/60 transition-all duration-300"
                    style={{ width: isComplete ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Mobile: compact step indicator */}
      <div className="flex md:hidden items-center justify-between px-1">
        <span className="text-xs text-brand-muted">
          Step {currentStep} of 6
        </span>
        <div className="flex gap-1">
          {STEPS.map(({ step }) => {
            const isComplete = stepStatuses[step] === 'complete';
            const isCurrent  = step === currentStep;
            return (
              <div
                key={step}
                className={[
                  'h-1.5 rounded-full transition-all duration-200',
                  isCurrent  ? 'w-4 bg-brand-red' :
                  isComplete ? 'w-3 bg-accent-green' :
                               'w-3 bg-brand-border',
                ].join(' ')}
              />
            );
          })}
        </div>
        <span className="text-xs font-medium text-brand-light">
          {STEPS.find((s) => s.step === currentStep)?.short}
        </span>
      </div>
    </nav>
  );
}

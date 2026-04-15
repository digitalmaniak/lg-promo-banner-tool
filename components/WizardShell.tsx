'use client';

import React from 'react';
import { RotateCcw, Zap } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen1Brief }      from '@/components/screens/Screen1Brief';
import { Screen2Classify }   from '@/components/screens/Screen2Classify';
import { Screen3Copy }       from '@/components/screens/Screen3Copy';
import { Screen4Gallery }    from '@/components/screens/Screen4Gallery';
import { Screen5Preview }    from '@/components/screens/Screen5Preview';
import { Screen6Export }     from '@/components/screens/Screen6Export';

const SCREENS = {
  1: Screen1Brief,
  2: Screen2Classify,
  3: Screen3Copy,
  4: Screen4Gallery,
  5: Screen5Preview,
  6: Screen6Export,
} as const;

export function WizardShell() {
  const { currentStep, reset } = usePipeline();
  const ActiveScreen = SCREENS[currentStep];

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark">
      {/* ── Top nav bar ── */}
      <header className="sticky top-0 z-50 bg-brand-panel/90 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo / brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-brand-red flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-brand-light tracking-tight">
                  LG Promo Banner Tool
                </span>
              </div>
            </div>

            {/* Progress bar (center) */}
            <div className="flex-1 mx-6 max-w-3xl">
              <ProgressBar />
            </div>

            {/* Reset button */}
            <button
              onClick={reset}
              title="Reset pipeline"
              className="shrink-0 flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-light transition-colors px-2 py-1.5 rounded-md hover:bg-brand-card"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in" key={currentStep}>
          <ActiveScreen />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-brand-border bg-brand-panel/50 py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-brand-muted">
          <span>HSAD AX Services</span>
          <span>AI-powered · Internal Use Only</span>
        </div>
      </footer>
    </div>
  );
}

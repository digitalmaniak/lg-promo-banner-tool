'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  PipelineState,
  PipelineActions,
  WizardStep,
  StepStatus,
  BriefData,
  ClassificationResult,
  CopyResult,
  ImageSpec,
  GeneratedBackground,
  BannerConfig,
  PreviewState,
  ExportConfig,
} from '@/lib/types';

// ─────────────────────────────────────────────
//  Initial State
// ─────────────────────────────────────────────
const initialState: PipelineState = {
  currentStep: 1,
  stepStatuses: { 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle', 6: 'idle' },

  brief: null,
  classification: null,
  copyResult: null,
  imageSpec: null,
  backgrounds: [],
  selectedBackgroundId: null,

  bannerConfig: {
    width: 1600,
    height: 600,
    productImageUrl: undefined,
    backgroundUrl: undefined,
    copy: null,
    template: '',
    overlayOpacity: 0.45,
  },

  preview: {
    previewUrl: undefined,
    isRendering: false,
    renderError: undefined,
    lastRenderedAt: undefined,
  },

  exportConfig: {
    formats: ['jpg'],
    sizes: [],
    figmaPush: false,
    figmaFrameId: undefined,
  },

  sessionId: `session_${Date.now()}`,
  projectName: 'Untitled Campaign',
};

// ─────────────────────────────────────────────
//  Action Types
// ─────────────────────────────────────────────
type Action =
  | { type: 'GO_TO_STEP';       payload: WizardStep }
  | { type: 'SET_STEP_STATUS';  payload: { step: WizardStep; status: StepStatus } }
  | { type: 'SET_BRIEF';        payload: BriefData }
  | { type: 'SET_CLASSIFICATION'; payload: ClassificationResult }
  | { type: 'SET_COPY_RESULT';  payload: CopyResult }
  | { type: 'SELECT_COPY_VARIANT'; payload: string }
  | { type: 'SET_IMAGE_SPEC';   payload: ImageSpec }
  | { type: 'ADD_BACKGROUND';   payload: GeneratedBackground }
  | { type: 'UPDATE_BACKGROUND'; payload: { id: string; update: Partial<GeneratedBackground> } }
  | { type: 'SELECT_BACKGROUND'; payload: string }
  | { type: 'UPDATE_BANNER_CONFIG'; payload: Partial<BannerConfig> }
  | { type: 'SET_PREVIEW';      payload: PreviewState }
  | { type: 'UPDATE_EXPORT_CONFIG'; payload: Partial<ExportConfig> }
  | { type: 'RESET' };

// ─────────────────────────────────────────────
//  Reducer
// ─────────────────────────────────────────────
function pipelineReducer(state: PipelineState, action: Action): PipelineState {
  switch (action.type) {
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_STEP_STATUS':
      return {
        ...state,
        stepStatuses: {
          ...state.stepStatuses,
          [action.payload.step]: action.payload.status,
        },
      };

    case 'SET_BRIEF':
      return {
        ...state,
        brief: action.payload,
        stepStatuses: { ...state.stepStatuses, 1: 'complete' },
      };

    case 'SET_CLASSIFICATION':
      return {
        ...state,
        classification: action.payload,
        bannerConfig: { ...state.bannerConfig, template: action.payload.template },
        stepStatuses: { ...state.stepStatuses, 2: 'complete' },
      };

    case 'SET_COPY_RESULT':
      return {
        ...state,
        copyResult: action.payload,
        stepStatuses: { ...state.stepStatuses, 3: 'complete' },
      };

    case 'SELECT_COPY_VARIANT': {
      if (!state.copyResult) return state;
      const variant = state.copyResult.variants.find((v) => v.id === action.payload) ?? null;
      return {
        ...state,
        copyResult: { ...state.copyResult, selectedVariantId: action.payload },
        bannerConfig: { ...state.bannerConfig, copy: variant },
      };
    }

    case 'SET_IMAGE_SPEC':
      return { ...state, imageSpec: action.payload };

    case 'ADD_BACKGROUND':
      return { ...state, backgrounds: [...state.backgrounds, action.payload] };

    case 'UPDATE_BACKGROUND':
      return {
        ...state,
        backgrounds: state.backgrounds.map((bg) =>
          bg.id === action.payload.id ? { ...bg, ...action.payload.update } : bg
        ),
      };

    case 'SELECT_BACKGROUND': {
      const selected = state.backgrounds.find((b) => b.id === action.payload);
      return {
        ...state,
        selectedBackgroundId: action.payload,
        bannerConfig: { ...state.bannerConfig, backgroundUrl: selected?.url },
        stepStatuses: { ...state.stepStatuses, 4: 'complete' },
      };
    }

    case 'UPDATE_BANNER_CONFIG':
      return { ...state, bannerConfig: { ...state.bannerConfig, ...action.payload } };

    case 'SET_PREVIEW':
      return { ...state, preview: action.payload };

    case 'UPDATE_EXPORT_CONFIG':
      return { ...state, exportConfig: { ...state.exportConfig, ...action.payload } };

    case 'RESET':
      return { ...initialState, sessionId: `session_${Date.now()}` };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────
//  Context
// ─────────────────────────────────────────────
type PipelineContextValue = PipelineState & PipelineActions;

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);

  const goToStep = useCallback((step: WizardStep) => dispatch({ type: 'GO_TO_STEP', payload: step }), []);
  const nextStep = useCallback(() => {
    if (state.currentStep < 6) dispatch({ type: 'GO_TO_STEP', payload: (state.currentStep + 1) as WizardStep });
  }, [state.currentStep]);
  const prevStep = useCallback(() => {
    if (state.currentStep > 1) dispatch({ type: 'GO_TO_STEP', payload: (state.currentStep - 1) as WizardStep });
  }, [state.currentStep]);
  const setBrief = useCallback((brief: BriefData) => dispatch({ type: 'SET_BRIEF', payload: brief }), []);
  const setClassification = useCallback((result: ClassificationResult) => dispatch({ type: 'SET_CLASSIFICATION', payload: result }), []);
  const setCopyResult = useCallback((result: CopyResult) => dispatch({ type: 'SET_COPY_RESULT', payload: result }), []);
  const selectCopyVariant = useCallback((id: string) => dispatch({ type: 'SELECT_COPY_VARIANT', payload: id }), []);
  const setImageSpec = useCallback((spec: ImageSpec) => dispatch({ type: 'SET_IMAGE_SPEC', payload: spec }), []);
  const addBackground = useCallback((bg: GeneratedBackground) => dispatch({ type: 'ADD_BACKGROUND', payload: bg }), []);
  const updateBackground = useCallback((id: string, update: Partial<GeneratedBackground>) => dispatch({ type: 'UPDATE_BACKGROUND', payload: { id, update } }), []);
  const selectBackground = useCallback((id: string) => dispatch({ type: 'SELECT_BACKGROUND', payload: id }), []);
  const updateBannerConfig = useCallback((update: Partial<BannerConfig>) => dispatch({ type: 'UPDATE_BANNER_CONFIG', payload: update }), []);
  const setPreview = useCallback((preview: PreviewState) => dispatch({ type: 'SET_PREVIEW', payload: preview }), []);
  const updateExportConfig = useCallback((update: Partial<ExportConfig>) => dispatch({ type: 'UPDATE_EXPORT_CONFIG', payload: update }), []);
  const setStepStatus = useCallback((step: WizardStep, status: StepStatus) => dispatch({ type: 'SET_STEP_STATUS', payload: { step, status } }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <PipelineContext.Provider
      value={{
        ...state,
        goToStep,
        nextStep,
        prevStep,
        setBrief,
        setClassification,
        setCopyResult,
        selectCopyVariant,
        setImageSpec,
        addBackground,
        updateBackground,
        selectBackground,
        updateBannerConfig,
        setPreview,
        updateExportConfig,
        setStepStatus,
        reset,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline(): PipelineContextValue {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline must be used within <PipelineProvider>');
  return ctx;
}

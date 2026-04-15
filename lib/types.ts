// ─────────────────────────────────────────────
//  Brief Input (Screen 1)
// ─────────────────────────────────────────────
export interface BriefData {
  productName: string;
  productCategory: string;
  campaignType: string;
  targetAudience: string;
  keyMessage: string;
  price?: string;
  promotionDetails?: string;
  campaignDates?: string;
  retailer?: string;
  brandTone?: string;
  additionalNotes?: string;
}

// ─────────────────────────────────────────────
//  Classification (Screen 2)
// ─────────────────────────────────────────────
export type PromotionType =
  | 'NPI'           // New Product Introduction
  | 'Price Drop'    // Promotional price reduction
  | 'Event Sale'    // Holiday / seasonal
  | 'Bundle'        // Multi-product bundle
  | 'Clearance'     // End of life
  | 'Brand'         // Brand awareness
  | 'Comparison';   // Competitive / side-by-side

export interface ClassificationResult {
  type: PromotionType;
  confidence: number;       // 0–1
  template: string;         // e.g. "NPI_dark_hero"
  reasoning: string;
  suggestedBadge?: string;  // e.g. "NEW ARRIVAL"
  urgencySignals: string[];
  targetDemographic: string;
  brandToneMatch: string;
  rawResponse?: string;
}

// ─────────────────────────────────────────────
//  Copy Variants (Screen 3)
// ─────────────────────────────────────────────
export interface CopyVariant {
  id: string;
  headline: string;
  subtext: string;
  eyebrow?: string;         // e.g. "INTRODUCING"
  cta: string;
  tone: 'premium' | 'urgent' | 'lifestyle' | 'technical' | 'playful';
  characterCounts: {
    headline: number;
    subtext: number;
  };
}

export interface CopyResult {
  variants: CopyVariant[];
  selectedVariantId: string | null;
  brandVoiceScore: number;  // 0–100
  characterLimitWarnings: string[];
}

// ─────────────────────────────────────────────
//  Background Gallery (Screen 4)
// ─────────────────────────────────────────────
export interface ImageSpec {
  prompt: string;
  negativePrompt: string;
  aspectRatio: '16:9' | '3:1' | '4:1';
  style: 'photorealistic' | 'cinematic' | 'gradient' | 'abstract';
  colorPalette: string[];
  modelUsed: 'ideogram' | 'midjourney' | 'dalle3' | 'mock';
}

export interface GeneratedBackground {
  id: string;
  url: string;
  thumbnailUrl?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  seed?: number;
  prompt: string;
  generatedAt?: string;
}

// ─────────────────────────────────────────────
//  Banner Preview (Screen 5)
// ─────────────────────────────────────────────
export interface BannerConfig {
  width: number;   // default 1600
  height: number;  // default 600
  productImageUrl?: string;
  backgroundUrl?: string;
  copy: CopyVariant | null;
  template: string;
  overlayOpacity: number;  // 0–1
}

export interface PreviewState {
  previewUrl?: string;
  isRendering: boolean;
  renderError?: string;
  lastRenderedAt?: string;
}

// ─────────────────────────────────────────────
//  Export (Screen 6)
// ─────────────────────────────────────────────
export interface ExportConfig {
  formats: ('jpg' | 'png' | 'webp')[];
  sizes: BannerSize[];
  figmaPush: boolean;
  figmaFrameId?: string;
}

export interface BannerSize {
  label: string;
  width: number;
  height: number;
  platform: 'web' | 'social' | 'email' | 'display';
}

export const BANNER_SIZES: BannerSize[] = [
  { label: 'Web Hero',        width: 1600, height: 600,  platform: 'web' },
  { label: 'Leaderboard',     width: 728,  height: 90,   platform: 'display' },
  { label: 'Half Page',       width: 300,  height: 600,  platform: 'display' },
  { label: 'Instagram Post',  width: 1080, height: 1080, platform: 'social' },
  { label: 'Instagram Story', width: 1080, height: 1920, platform: 'social' },
  { label: 'Email Header',    width: 600,  height: 200,  platform: 'email' },
];

// ─────────────────────────────────────────────
//  Pipeline State (shared across all screens)
// ─────────────────────────────────────────────
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export type StepStatus = 'idle' | 'loading' | 'complete' | 'error';

export interface PipelineState {
  // Navigation
  currentStep: WizardStep;
  stepStatuses: Record<WizardStep, StepStatus>;

  // Screen data
  brief: BriefData | null;
  classification: ClassificationResult | null;
  copyResult: CopyResult | null;
  imageSpec: ImageSpec | null;
  backgrounds: GeneratedBackground[];
  selectedBackgroundId: string | null;
  bannerConfig: BannerConfig;
  preview: PreviewState;
  exportConfig: ExportConfig;

  // Global
  sessionId: string;
  projectName: string;
}

export interface PipelineActions {
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setBrief: (brief: BriefData) => void;
  setClassification: (result: ClassificationResult) => void;
  setCopyResult: (result: CopyResult) => void;
  selectCopyVariant: (id: string) => void;
  setImageSpec: (spec: ImageSpec) => void;
  addBackground: (bg: GeneratedBackground) => void;
  updateBackground: (id: string, update: Partial<GeneratedBackground>) => void;
  selectBackground: (id: string) => void;
  updateBannerConfig: (update: Partial<BannerConfig>) => void;
  setPreview: (preview: PreviewState) => void;
  updateExportConfig: (update: Partial<ExportConfig>) => void;
  setStepStatus: (step: WizardStep, status: StepStatus) => void;
  reset: () => void;
}

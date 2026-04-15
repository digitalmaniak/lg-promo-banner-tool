# LG Promo Banner Tool

AI-powered promotional banner generation tool for LG campaigns — built by HSAD Creative Services.

## What It Does

A 6-screen wizard that takes a campaign brief from input to export:

1. **Brief Input** — Enter product, campaign type, key message, audience
2. **Classification** — Claude classifies the promotion type and picks the optimal template
3. **Copy Variants** — Claude generates 3 headline/subtext variants with brand voice scoring
4. **Background Gallery** — AI generates 6 background images (Ideogram v2 or mock)
5. **Live Preview** — Composite preview with overlay controls and product image upload
6. **Export & Push** — Download in multiple sizes/formats; push to Figma

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with LG/HSAD brand palette
- **React Context** for pipeline state across all screens
- **Next.js API Routes** as secure proxy for Claude, Ideogram, Figma
- **Vercel** for hosting + environment variable management

---

## Local Development

### 1. Install dependencies

```bash
cd "promo web tool"
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local and add your API keys
```

At minimum, add `ANTHROPIC_API_KEY` to enable live AI features.
Without it, the tool runs in **mock mode** with demo data.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
cd "promo web tool"
git init
git add .
git commit -m "Initial skeleton: LG Promo Banner Tool"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lg-promo-banner-tool.git
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `lg-promo-banner-tool` repository
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy** — Vercel builds and gives you a live URL instantly

### Step 3 — Add Environment Variables

In Vercel → Project Settings → **Environment Variables**, add:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (required for live AI) |
| `IDEOGRAM_API_KEY` | Background image generation (optional) |
| `FIGMA_ACCESS_TOKEN` | Figma push integration (optional) |
| `FIGMA_FILE_ID` | Target Figma file (optional) |

After adding vars, click **Redeploy** or push a new commit.

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/classify` | POST | Classify promotion type via Claude |
| `/api/copy-gen` | POST | Generate copy variants via Claude |
| `/api/image-gen` | POST | Generate backgrounds via Ideogram |
| `/api/render` | POST | Composite banner server-side |
| `/api/export` | POST | Resize + export in multiple formats |
| `/api/figma-push` | POST | Push banner to Figma frame |

All routes work in **mock mode** (returning demo data) when API keys are not set — so the UI is always demonstrable.

---

## Project Structure

```
promo web tool/
├── app/
│   ├── layout.tsx          # Root HTML shell + metadata
│   ├── page.tsx            # Entry point — mounts PipelineProvider + WizardShell
│   ├── globals.css         # Tailwind directives + CSS variables
│   └── api/
│       ├── classify/       # Claude classification endpoint
│       ├── copy-gen/       # Claude copy generation endpoint
│       ├── image-gen/      # Ideogram image generation endpoint
│       ├── render/         # Server-side banner compositing
│       ├── export/         # Multi-size export
│       └── figma-push/     # Figma integration
├── components/
│   ├── WizardShell.tsx     # Top nav + step router
│   ├── ProgressBar.tsx     # Step indicator
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── StatusBadge.tsx
│   └── screens/
│       ├── Screen1Brief.tsx
│       ├── Screen2Classify.tsx
│       ├── Screen3Copy.tsx
│       ├── Screen4Gallery.tsx
│       ├── Screen5Preview.tsx
│       └── Screen6Export.tsx
├── context/
│   └── PipelineContext.tsx  # Global wizard state (React Context + useReducer)
├── lib/
│   └── types.ts             # All TypeScript types for the pipeline
├── .env.example             # Environment variable template
└── README.md
```

---

## Roadmap

- [ ] Server-side banner compositing with Sharp
- [ ] Midjourney v7 integration
- [ ] Streaming SSE for background generation (thumbnails appear as generated)
- [ ] Figma Plugin API push
- [ ] ZIP download for export packages
- [ ] Campaign history / saved sessions
- [ ] n8n webhook integration

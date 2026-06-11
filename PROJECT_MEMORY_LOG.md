# COOP·AUDIT·AI — Project Memory Log

_Last updated: 2026-06-09_

A running record of goals, decisions, established rules, and pending work for the
**COOP·AUDIT·AI** app (a React-based cooperative-audit PDF/ZIP analyzer).

---

## 1. Project Overview

- **App name:** COOP·AUDIT·AI ("Cooperative · Audit · Intelligence")
- **Purpose:** Upload a ZIP of cooperative society audit PDFs, auto-detect financial
  statements, run AI verification/tallying, flag missing files, surface audit defects,
  generate a defect sheet, and provide an AI legal chat.
- **Stack:** React 19 + Vite 8, Tailwind CSS v4 (`@import "tailwindcss"`),
  lucide-react icons, JSZip, pdfjs-dist. Packaged to a Windows `.exe` via `pkg`
  (`server.cjs` + built `dist/`).
- **Primary source files:**
  - `src/APCooperativeFinancialAnalyser.jsx` — the whole app (~7,200 lines, single component).
  - `src/index.css` — theme + custom CSS (~1,150 lines).
- **Dev preview:** Vite dev server on port **5173** (config in `.claude/launch.json`).
  Active preview serverId during this work: `6543d1e5-09f8-4b97-a9d8-fbdcde734d4c`.
- **Environment:** Windows. Use the **PowerShell** tool (not Bash) for shell commands.

---

## 2. Primary Goal

Transform the app from the original **dark "Midnight Black" theme** into a
**soft light premium theme**, then iterate on UI/UX polish per user feedback.

**Signature background gradient:**
`linear-gradient(160deg, #EAE6F8 0%, #FFFFFF 50%, #EBF7F2 100%)`
(pastel lavender → white → mint green).

---

## 3. Key Decisions & Insights

### Theme / Visual System
- **Light theme variables** (`src/index.css`): `--bg-deep: #F8F6FC`, `--bg-card: #FFFFFF`,
  `--bg-elev: #F3F1F9`; text colors inverted to dark slate.
- **Cards:** white with subtle shadow `0 1px 3px rgba(0,0,0,0.04)`.
- **Accent palette:** violet `#7c3aed` (primary), emerald `#10b981` (success/tally),
  rose `#e11d48` (errors/missing).
- **Logo dark PNG issue:** CSS cannot recolor a PNG's internal background. Resolved by
  framing the dark logo in an **animated VIBGYOR rainbow border** (`conic-gradient` +
  `@property --vibgyor-angle`) rather than filtering the image. User preferred keeping
  the original dark logo art inside the rainbow frame.
- **Hero section:** frosted-glass light gradient
  `linear-gradient(135deg, rgba(234,230,248,0.85)...)` with **dark text**.
  ⚠️ A dark "fog" hero background was explicitly **rejected** — keep it light & legible.
- **Scan animation** kept for light theme: `@keyframes scanBeam` / `scanTrail`; other
  decorative blur/animations were suppressed.
- **VIBGYOR focus ring** on chat input via `@keyframes vibgyor-border-shift`.

### Admin Login Gate (NEW)
- **Client-side login** blocks the entire app until authenticated. Implemented as an
  **early `return`** in `APCooperativeFinancialAnalyser.jsx` (before the main app return),
  guarded by `if (!isAuthenticated)`.
- **Hardcoded admin credentials** (admin-only, no backend): username **`USER`**,
  password **`Pass@123`**. Validated in `handleLogin()`.
- State added near `activeView`: `isAuthenticated`, `loginUser`, `loginPass`, `loginError`.
  Helpers: `handleLogin(e)` (validates → sets auth or `loginError`),
  `handleLoginReset()` (clears fields + error).
- **Login UI:** centered card using the **`glossy-border-box`** class, the real logo via
  the reused **`<LogoMark />`** component (carries the **VIBGYOR rainbow ring**
  automatically because the ring CSS keys off the logo's `alt="COOP - AUDIT AI Logo"`
  and the login screen renders inside `#root`), "COOP·AUDIT·AI / ADMIN LOGIN" title,
  Username + Password inputs (`vibgyor-input-focus`), **Login** (renders emerald-green via
  a global form-button style — intentionally kept) + **Reset** (white outline) buttons,
  red error text on bad credentials, and an "Authorized admin access only" note.
- Login flow verified working in preview (USER / Pass@123 → unlocks app; Reset clears).

### Offline engine — composite audit-defect scenarios (NEW)
- **Why:** without an API key the chat falls back to the keyword engine, which couldn't
  answer natural-language defect questions (e.g. "amount not remitted by the salesman and the
  CEO not recorded in daybook — what section/rules and narrate as defect").
- **What:** added `DEFECT_SCENARIOS` + `matchDefectScenario(q)` in
  `APCooperativeFinancialAnalyser.jsx` (just above `answerLegalQuery`). Each scenario has
  required keyword groups (synonyms) + optional boost groups; `answerLegalQuery` now checks
  scenarios FIRST and returns applicable provisions + a ready defect narrative.
- **Defect scenarios (kind:'defect'):** salesman non-remittance; transaction not recorded in
  Day Book; cash shortage in chest; bogus/benami/ghost loans; interest not charged/short;
  stock shortage; overdue/time-barred loans; reserve-fund/investments not made or diverted;
  NPA/IRAC provision not made. Each returns provisions + a Defect-Sheet narrative.
- **Statutory-officer footer:** every defect answer now auto-appends `OFFICER_ESCALATION` —
  how the defect is pursued by the **Inquiry Officer (u/s 51), Inspection Officer (u/s 52/53),
  Surcharge Officer/Registrar (u/s 60), Liquidator (on winding-up), and Arbitrator (dispute
  u/s 61)**, with recovery u/s 71.
- **Officer-role scenarios (kind:'officer'):** direct questions about the inquiry / inspection
  / surcharge officer, liquidator, and arbitrator return a self-contained role+powers answer.
- Easy to extend — add entries to `DEFECT_SCENARIOS`. Scoring: required groups ×2 + optional
  hits; most-specific scenario wins.
- **Verified** live (no API key): cash-shortage query returns provisions + narrative + officer
  footer; "powers of the liquidator" returns the liquidator role answer.

### AI Legal Chat — switched to Google Gemini (LATEST, working live)
- Live AI provider is now **Google Gemini** (was Claude). Functions: `getGeminiKey`,
  `hasGeminiKey`, `geminiMessage`; constants `GEMINI_MODEL`, `DEV_GEMINI_API_KEY`;
  localStorage `COOP_GEMINI_KEY`; env `VITE_GEMINI_API_KEY`. Endpoint:
  `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=…`
  (CORS works from the browser; roles mapped user/assistant→user/model; `system_instruction`
  for the system prompt; response from `candidates[0].content.parts[].text`).
- **Model = `gemini-2.5-flash-lite`.** Chosen after testing with the supplied key:
  `gemini-2.0-flash` → 429 (free-tier limit 0 for that model); `gemini-1.5-flash` → 404
  (not available on this key); `gemini-2.5-flash` → 200 but **empty text** (its built-in
  "thinking" consumes the token budget); **`gemini-2.5-flash-lite` → 200 with clean text.**
  To switch models, query `GET …/v1beta/models?key=…` for what the key supports.
- **Key now lives in `.env`** (git-ignored), not in source: `VITE_GEMINI_API_KEY=…`.
  `DEV_GEMINI_API_KEY = ''` in source (no committed secret). `.env.example` is the committed
  template; `.gitignore` ignores `.env` / `.env.*` (keeps `.env.example`). Resolution order:
  localStorage (`COOP_GEMINI_KEY`, AI Key panel) → `VITE_GEMINI_API_KEY` → empty.
  ⚠️ Vite still **inlines** `VITE_` vars into the built bundle/.exe, so the key is extractable
  from a distributed build — for zero exposure, blank the `.env` and use the AI Key panel
  (localStorage only). Restart the dev server after editing `.env`.
- **Verified live:** two-pass agent (draft → official-tone humanize) returns real Gemini
  answers (official-memo format) + Indian Kanoon/AP HC links; both POSTs returned 200.
  Offline fallback still works when no key / on error.

### AI Legal Chat — reverted to Claude + key fixes (earlier this session, now superseded)
- The chat had been switched to **OpenAI (`gpt-4o`)** at some point, with a **real OpenAI
  secret key hardcoded in source** (`DEV_OPENAI_API_KEY`). Diagnosis via the network panel:
  live calls returned **HTTP 429 `insufficient_quota`** (no billing on that account) →
  every call failed and silently fell back to the offline engine (the "acts like a search
  engine" symptom). CORS was fine (OpenAI allows browser calls).
- **Fixes applied (user chose: remove key + switch back to Claude):**
  - **Removed the hardcoded secret** entirely; `DEV_ANTHROPIC_API_KEY = ''` (no secret in source).
  - **Reverted to Anthropic Claude `claude-opus-4-8`** via direct browser fetch
    (`anthropic-dangerous-direct-browser-access: true`) — browser-friendly, no backend.
  - Renamed everything back: `getAnthropicKey` / `hasAnthropicKey` / `anthropicMessage`,
    localStorage `COOP_ANTHROPIC_KEY`, env `VITE_ANTHROPIC_API_KEY`.
  - Fixed a **`hasOpenAIKey` ReferenceError** (used but never defined) that was crashing the
    chat view to a blank screen — now `hasAnthropicKey()` is defined.
  - **Key precedence** corrected: localStorage (AI Key panel) → `.env` → optional local
    fallback. So a pasted key always takes effect.
- **In-app AI Key panel** (chat header): status badge (green "Live AI" / amber "Offline"),
  paste/Save/Remove a key (stored in `localStorage['COOP_ANTHROPIC_KEY']`, never bundled),
  plus a "Test Live AI" panel (`runAiKeyTest`) that shows whether a call went live or offline.
- **Verified:** no-key → badge "Offline" + offline answers; save key → badge "Live AI";
  remove → "Offline". To actually reason live, supply a funded **Anthropic** key via the panel
  or `VITE_ANTHROPIC_API_KEY`.
- ⚠️ The exposed OpenAI key string should be treated as **compromised — rotate/revoke it** in
  the OpenAI dashboard (it was committed to source and ran in the browser).

### AI Legal Chat — Claude agent (NEW, implemented)
- **What:** The AI Legal Chat now acts like an AI agent. Two-pass pipeline using
  **Anthropic Claude `claude-opus-4-8`**: (1) draft a precise statutory legal narrative,
  then (2) **humanize** it into clear plain English; finally append **case-law / statute
  reference links** (Indian Kanoon + AP High Court) — the "LLM + reference links (no live
  scrape)" approach the user chose.
- **Where:** `APCooperativeFinancialAnalyser.jsx`. New module-level helpers near
  `answerLegalQuery` (~line 255): `getAnthropicKey()`, `hasAnthropicKey()`,
  `anthropicMessage()` (direct browser `fetch` to `api.anthropic.com/v1/messages` with
  `anthropic-dangerous-direct-browser-access: true`), `buildCaseLawReferences()`,
  `generateLegalAgentAnswer()`. The chat `<form onSubmit>` (~line 6440) now calls the agent
  async, passing the last ~6 turns as history.
- **Reference links:** Indian Kanoon `https://indiankanoon.org/search/?formInput=...`,
  AP High Court via `google.com/search?q=...site:aphc.gov.in`. Rendered as clickable `<a>`
  links in each AI bubble via a new `references` field on chat messages.
- **API key resolution (first match wins):** (1) `localStorage['COOP_ANTHROPIC_KEY']` — admin
  pastes at runtime, **never baked into the bundle** (best for the packaged .exe); (2) build-time
  `VITE_ANTHROPIC_API_KEY`.
- **Graceful fallback:** if no key (`NO_API_KEY`) or any API error, falls back to the existing
  offline `answerWithCorpus()` keyword/corpus engine, still appending the reference links.
  Verified working in dev (no key → fallback + links render correctly).
- **Model rules followed (Opus 4.8):** no `temperature`/`top_p`/`top_k`, no `budget_tokens`;
  `max_tokens` 1100 (non-streaming, well under timeout). Prompts instruct the model to NOT
  fabricate case citations.
- ⚠️ **Security note:** browser-side key use exposes the key to anyone with devtools on the
  running app. Acceptable for the admin-only local tool; prefer the `localStorage` path so the
  key isn't embedded in the distributed bundle.

### Recent UI changes (this session)
- **Landing / upload drop-zone (first page) overhaul:**
  - Added a **welcome banner** above the box: "WELCOME USER, THIS IS FINANCIAL STATEMENT
    PDF ANALYSER" (brand `gradient-text`, centered).
  - Gave the drop-zone box a **glossy two-tone gradient border** via the new
    **`.glossy-border-box`** CSS class (violet `#7c3aed` → purple → cyan `#22d3ee` →
    emerald `#10b981`), with an animated color-pan, a moving glossy sheen (`::after`),
    a violet/emerald drop-shadow, and lift-on-hover.
  - Fixed leftover **dark-theme styling** on this box (was `bg-slate-900/40` + cyan text)
    → now clean white with slate sub-text; drag-active glow uses violet/emerald.
  - **Compacted the first page** so the whole landing fits in one viewport: drop-zone
    padding `p-12/p-16 → p-6/p-8`, folder emoji `text-7xl → text-5xl`, heading
    `text-3xl → text-2xl`, tighter internal spacing; welcome `mb-6 → mb-4`; hero card
    `p-8 → p-6`; main container `p-8 → p-6`, `space-y-6 → space-y-5`.
- **Upload/scan progress bar fill** → changed to **solid `bg-black`** (was a
  violet→emerald gradient) with a black glow, so the filled % is clearly visible.
  Location: `APCooperativeFinancialAnalyser.jsx` ~line 4924.
- **Progress percentage + "File X / Y" text** → **black & bold** (`text-black font-black`)
  for legibility during scanning.
- **Dashboard action buttons (new):** Added **"Print"** (black, `Printer` icon →
  `window.print()`) and **"Upload another file"** (white outline, `Upload` icon →
  `window.location.reload()`). Placed after the dashboard results block (~line 7075),
  gated on `activeView === 'dashboard' && !loading && (detectedFiles.length > 0 ||
  auditResults.length > 0)`. Wrapper has class `no-print`. Imported `Printer` from lucide-react.
- **Print stylesheet** added to `index.css` (`@media print`): forces white background,
  `print-color-adjust: exact`, hides `.no-print` and `aside nav`, collapses the sidebar
  to full width, prevents page breaks inside tables/cards. Lets a user Print / Save-as-PDF
  the audit result + uploaded document info + missing-files banner.
- **Unified logo icon (hero):** A single inline SVG (`viewBox 0 0 120 120`) combining
  three concepts — (1) **cooperation**: three nodes (navy top-left, emerald top-right,
  navy bottom) interconnected into a **triangle** orbiting the document; (2) **audit**:
  magnifying glass with emerald rim + navy **checkmark** scanning the lower-right corner;
  (3) **file analyzer**: centered white document with folded corner + navy/emerald
  **bar chart**. Palette navy `#1E3A8A` / emerald `#10B981` / white, flat geometric style.
  Location: `APCooperativeFinancialAnalyser.jsx` ~line 4660.

### Earlier UI changes (prior session)
- **Uploaded file name** repositioned to appear *after* the subtitle (not above the title).
- **Files Missing banner** redesigned to light rose theme; visibility restricted to
  `activeView === 'dashboard' || 'documents'` only (hidden on report/defects/chat/generator).
- **Step labels** simplified: "Step 02 · Detect" → "Detect", "Step 03 · Verify" → "Verify".
- **Chat welcome text:** "Welcome to COOP-AUDIT AI - LEGAL CHAT. Ask me about APCS Act &
  Rules, 1964 and also Case Laws for reference."
- **Defect narratives** (`buildDefectSheet()`, ~lines 860–1117): shortened to ~40 words
  each using legal abbreviations (u/s, r/w) with statutory references preserved.

---

## 4. Established Rules / Conventions

1. **Light & legible always** — no dark backgrounds on hero/content sections; text must
   be clearly readable. Revert if a color change "doesn't feel good."
2. **Windows shell = PowerShell tool**, never Bash syntax.
3. **Read a file before Write/Edit**; many launch/config files already exist.
4. **Preserve scan animations**; suppress other decorative animations/blurs.
5. **Keep statutory references** when simplifying legal text; tone = professional legal
   terminology, concise.
6. **Verify visual changes** in the preview (screenshot) after editing; note that some
   elements (scan bar, action buttons) only render when audit results exist.
7. **Color language:** violet = primary/active, emerald = success/tally, rose = error/missing,
   navy+emerald = brand logo.
8. **`no-print` class** marks anything that must be excluded from printouts.
9. **Admin login is client-side only** — credentials **`USER` / `Pass@123`** are
   hardcoded in `handleLogin()`; no backend/auth server. Admin-only by design.
10. **Reusable building blocks:** `<LogoMark />` (logo + auto VIBGYOR ring via `alt`),
    `.glossy-border-box` (animated two-tone glossy gradient border),
    `.vibgyor-input-focus` (rainbow focus ring on inputs).

---

## 5. Current State

- **Admin login gate** in front of the whole app (USER / Pass@123); verified working.
  Login screen uses the real logo + VIBGYOR ring (`<LogoMark />`) and `glossy-border-box`.
- Light premium theme fully applied; hero, sidebar, cards, scan UI, missing-files banner
  all restyled.
- **First page (landing) compacted to fit one viewport**, with welcome banner and a
  glossy two-tone gradient-bordered upload box.
- Black progress bar + black percentage text working.
- Print / Upload-another-file buttons working (confirmed rendering once results load).
- Print stylesheet in place.
- Unified navy/emerald logo icon rendering in the hero.
- App flow: **Login → compact landing page → main app.**
- **AI Legal Chat = Google Gemini (`gemini-2.5-flash-lite`)**, live and verified (two-pass
  draft→official-humanize + Indian Kanoon/AP HC links). Key wired (hardcoded DEV fallback +
  AI Key panel + `VITE_GEMINI_API_KEY`); offline engine is the fallback.
- Offline engine answers composite audit-defect questions (9 defect scenarios + 5 statutory-
  officer roles + inquiry-report Part A/B), with an "Action by Statutory Officers" footer.
- No blocking errors; the occasional `[vite] Failed to reload` console lines are transient
  mid-edit HMR saves (app renders cleanly after reload).
- ⚠️ Security: a Gemini key and (historically) an OpenAI key were committed to source — both
  should be rotated; prefer the AI Key panel / `.env` for distribution.

---

## 6. Next Steps / Pending Work

### OPEN — top of queue (2026-06-10)
- **New hero logo — needs the image file.** Sidebar logo was **removed**; the logo was
  **moved into the hero** beside "COOPERATIVE AUDIT PDF FILE ANALYZER" (replaced the small
  SVG icon). The hero `<img alt="Audit Management System logo">` currently points at the OLD
  `logoImage` (`src/assets/logo.png`) as a placeholder. User is adding a NEW shield emblem
  ("AUDIT MANAGEMENT SYSTEM") as a separate file — once they give the filename, change the one
  import (`import logoImage from './assets/<newfile>'`, or add a new `auditLogo` import and
  point the hero img at it). NOTE: I can't write pasted images to disk — user must add the file.
  `LogoMark` component is now unused (login uses an inline img; sidebar logo removed).
- **Split the mega-file by menu/view — REQUESTED, NOT YET DONE.** `APCooperativeFinancialAnalyser.jsx`
  is **~8,090 lines**, one default-export component holding all state + every view. User wants it
  divided into per-view files (Dashboard, Upload Documents, Report Analysis, Audit Defects,
  AI Legal Chat, Defect Sheet Generator) so future edits target one file. Plan: (a) first extract
  pure module-level logic/data — Gemini agent (`getGeminiKey`/`geminiMessage`/`generateLegalAgentAnswer`),
  legal KB + `answerLegalQuery` + `DEFECT_SCENARIOS`/`matchDefectScenario`, corpus loader
  (`searchLegalCorpus`/`buildSnippet`/`BUNDLED_LEGAL_REFS`), `generateDefectNarrative`/defect-sheet
  builders, small components (`LogoMark`, `MiniCard`), currency/file helpers — into `src/lib/*`
  and `src/components/*` (low risk). (b) Then extract each `activeView === ...` block into a view
  component, sharing the big state via React Context (state lives in many `useState` in the parent;
  prop-threading would be heavy). HIGH RISK — verify each view after extraction. Not started beyond
  structure mapping.

1. ~~**AI Legal Chat — case-law lookup.**~~ ✅ **DONE** — implemented as a two-pass Claude
   (`claude-opus-4-8`) agent (narrate → humanize) with Indian Kanoon + AP High Court
   reference links and an offline fallback. **Remaining:** provide a real Anthropic API key
   (via `localStorage['COOP_ANTHROPIC_KEY']` or `VITE_ANTHROPIC_API_KEY`) to exercise the
   live AI path; currently verified only on the offline-fallback path. Optionally add a small
   in-app "AI key" settings field so the admin can paste the key without touching localStorage
   manually.
2. **Print output QA** — actually exercise the Print button with real results and confirm
   the printed/PDF page contains audit results + uploaded-document info + missing files,
   and that the sidebar nav / buttons are correctly hidden.
3. **Logo icon final sign-off** — confirm the refined triangle-node icon is approved at
   full size; optionally export a 1024×1024 standalone asset if a brand icon file is needed.
4. **Regression sweep** — verify the light theme across all views (dashboard, upload
   documents, report analysis, audit defects, legal chat, defect sheet generator).
5. **Packaging** — when UI is finalized, rebuild the `.exe` (`npm run pack:exe`).

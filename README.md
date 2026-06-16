# 🛡️ COOP·AUDIT·AI (Cooperative · Audit · Intelligence)

COOP·AUDIT·AI is a premium React-based desktop-optimized web application designed to automate the auditing process of cooperative societies. By parsing ZIP packages containing financial statement PDFs, the app automatically identifies document types, checks for completeness, verifies tally balances, flags statutory defects under the Andhra Pradesh Cooperative Societies (APCS) Act & Rules, 1964, and provides a conversational AI legal assistant powered by Google Gemini.

The application is bundled into a single standalone Windows executable (`COOP-AUDIT-AI.exe`) with an embedded Node.js local server, allowing audits to run fully offline without local installations or database servers.

---

## ✨ Features

### 🔐 1. Admin Authentication Gate
* **Client-Side Login:** Protects access with a styled credentials gate.
* **Credentials:** Username `USER` / Password `Pass@123` (obfuscated in source using binary bit-string comparison).
* **Modern UI:** Features a dynamic VIBGYOR glowing focus ring on inputs and an animated rainbow logo frame.

### 📁 2. Document Parsing & Inventory
* **ZIP Processing:** Drag-and-drop or select a cooperative society audit ZIP.
* **PDF Extraction:** Extracts text and structures financial sheets locally using `pdfjs-dist` and `JSZip`.
* **Completeness Checker:** Flags missing mandatory sheets (e.g., Balance Sheet, Profit & Loss, Receipts & Disbursements, etc.) on a dedicated dashboard banner.

### 📊 3. Audit Tally & Report Analysis
* **Verification Panel:** Extracts ledger balances and checks if the financial statements tally (e.g., Total Receipts vs. Total Disbursements, Assets vs. Liabilities).
* **Visual Status Indicators:** Highlights tallied components with green (success) and mismatches with rose (error) pills.
* **Schedules & Ledgers:** Lists extracted rows, categories, and ledger entries for detailed inspection.

### 📋 4. Concurrent Audit & Irregularities
* **Categorized Fault-Logging:** Classifies issues into B.1 (Financial Irregularities), B.2 (Accounting Irregularities), and B.3 (Administrative Irregularities).
* **Drafting Workspace:** Lets auditors draft, modify, and review defect descriptions.

### ⚖️ 5. AI Legal Chat & Offline Fallback
* **Google Gemini AI:** Configured to use `gemini-2.5-flash-lite` (via `VITE_GEMINI_API_KEY` or an in-app Settings key).
* **Two-Pass Legal Agent:** First drafts a precise statutory legal memo citing APCS Act and then humanizes it into clean English.
* **Case Law Links:** Automatically appends relevant Indian Kanoon and AP High Court search references.
* **Robust Offline Engine:** Fallback mode with a built-in keyword matcher mapping 9 common defect scenarios and 5 statutory officer roles (Inquiry u/s 51, Inspection u/s 52/53, Surcharge u/s 60, Arbitration u/s 61, Liquidator, and Surcharge Recovery u/s 71).

### 🖨️ 6. Defect Sheet & Exporting
* **Official Memo Generation:** Compiles findings into standard statutory report parts (Part A & Part B).
* **Print Stylesheet:** Custom `@media print` CSS formats the dashboard, schedules, and defect sheets perfectly for printing or saving to PDF.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide React (Icons).
* **PDF/ZIP Engine:** JSZip, PDF.js (`pdfjs-dist`).
* **AI Provider:** Google Gemini API (`generativelanguage.googleapis.com`).
* **Standalone Server:** Node.js HTTP SPA-server (`server.cjs`).
* **EXE Packager:** packaged via `nexe` (previously `pkg`).

---

## 📂 Codebase Structure

```
coop-audit-ai/
├── server.cjs                # Standalone HTTP SPA server for the packaged .exe
├── index.html                # App entry point (loads Orbitron/Space Grotesk fonts)
├── package.json              # Project scripts & dependencies
├── vite.config.js            # Vite configurations with React and Tailwind plugins
├── scripts/
│   └── pack.mjs              # Version stamping and EXE compiler script
├── src/
│   ├── main.jsx              # React app mounting point
│   ├── index.css             # Design system, theme variables, print styles, and animations
│   ├── version.js            # Single source of truth for version label (auto-generated)
│   ├── APCooperativeFinancialAnalyser.jsx  # Main application shell & global context value
│   ├── context/
│   │   └── AuditContext.jsx  # Core React Context hooks
│   └── views/                # Modular view pages loaded into the sidebar:
│       ├── DashboardView.jsx              # Main dashboard, ZIP upload, and tally status
│       ├── UploadDocumentsView.jsx        # Table of uploaded files and extraction statuses
│       ├── ReportAnalysisView.jsx         # Extracted ledgers, spreadsheets, and audit sheets
│       ├── ConcurrentAuditView.jsx        # Irregularities classification (B1, B2, B3)
│       ├── AuditDefectsView.jsx           # Auto-surfaced audit defects
│       ├── LegalChatView.jsx              # Gemini-powered AI Legal Chat & Offline Knowledge Base
│       └── DefectSheetGeneratorView.jsx   # Defect Sheet creator and exporter
```

---

## 🚀 Development Setup

### Prerequisites
* **Node.js** (v14 or higher recommended)
* **PowerShell** (Windows Environment)

### Installation
1. Clone the repository and navigate to the directory:
   ```powershell
   cd c:\Users\dell\Downloads\coop-audit-ai
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```

### Running Locally
* **Vite Development Server (with HMR):**
  ```powershell
  npm run dev
  ```
  Open `http://localhost:5173/` in your browser.

* **Production Local Server Simulation:**
  ```powershell
  npm run build
  npm run start
  ```
  This builds the static assets to `dist/`, starts the local server in `server.cjs` on port `5173`, and automatically opens the app in your default web browser.

---

## 🔑 AI API Key Configuration

To enable the live Gemini AI assistant, you can choose one of the following methods:

1. **System Environment / Local .env (Build Time):**
   Copy `.env.example` to `.env` and fill in your Google Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=AIzaSy...
   ```
   *Note: Vite embeds variables starting with `VITE_` into the static JavaScript output during build time. Anyone with access to the packaged `.exe` could inspect the code and extract the key.*

2. **In-App AI Settings Panel (Runtime - Recommended):**
   To keep your key fully secure and prevent it from being packaged into the executable:
   * Leave `VITE_GEMINI_API_KEY` blank.
   * Open the app, go to **AI Legal Chat**, click the **AI Key** settings button, paste your key, and click **Save**.
   * The key is stored in your local browser’s `localStorage` and never bundled or transmitted elsewhere.

---

## 📦 Packaging Standalone Windows EXE

The project includes an automated versioning and compilation script `scripts/pack.mjs` that stamps versions, runs a production build, and packs the backend server plus frontend assets into a single desktop-runnable binary.

### Packaging Commands
* **Patch Bump (e.g. V2.0.0 ➔ V2.0.1):**
  ```powershell
  npm run pack:exe
  ```
* **Minor Bump (e.g. V2.0.0 ➔ V2.1.0):**
  ```powershell
  npm run pack:exe:minor
  ```
* **Major Bump (e.g. V2.0.0 ➔ V3.0.0):**
  ```powershell
  npm run pack:exe:major
  ```
* **Specify Exact Version:**
  ```powershell
  node scripts/pack.mjs --set 2.0.2
  ```

The script will produce a compiled standalone binary inside:
📂 `release/COOP-AUDIT-AI.exe`

---

## 🛡️ License

Confidential and Proprietary. Designed for the Audit Management @sivapnlr80-cpu@github.com. All rights reserved.

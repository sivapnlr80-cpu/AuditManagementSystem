import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import * as PDFJS from 'pdfjs-dist';
import {
  Receipt, Table2, Scale, Landmark, LayoutDashboard, Upload, Printer,
  ScrollText, FileArchive, ShieldCheck, Sparkles, Activity, CheckCircle2,
  XCircle, ListChecks, Building2, FileCheck2, BadgeCheck, Award,
  MessagesSquare, FilePlus2, Send, Trash2, Bot, User as UserIcon,
  KeyRound, Zap, AlertCircle, FileText, ClipboardCheck,
} from 'lucide-react';

import logoImage from './assets/logo.png';
import auditLogo from './assets/audit-logo.png';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
PDFJS.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

import { AuditContext } from './context/AuditContext';
import { APP_VERSION } from './version';
import DashboardView from './views/DashboardView';
import UploadDocumentsView from './views/UploadDocumentsView';
import ReportAnalysisView from './views/ReportAnalysisView';
import AuditDefectsView from './views/AuditDefectsView';
import LegalChatView from './views/LegalChatView';
import DefectSheetGeneratorView from './views/DefectSheetGeneratorView';
import ConcurrentAuditView from './views/ConcurrentAuditView';

// Extract the full text of an already-parsed PDF document. Kept separate from
// extractPDFText so a single parsed document can be reused for both the full-text
// pass and the schedule-specific parsers (avoids re-parsing the same PDF).
async function extractTextFromDoc(pdfDocument) {
  let extractedText = '';

  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber++
  ) {
    const page = await pdfDocument.getPage(pageNumber);

    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ');

    extractedText += `${pageText}\n`;
  }

  return extractedText;
}

async function extractPDFText(zipEntry) {
  const pdfData = await zipEntry.async('uint8array');

  const pdfDocument = await PDFJS.getDocument({
    data: pdfData,
  }).promise;

  return extractTextFromDoc(pdfDocument);
}

function cleanCurrency(value) {
  if (!value) {
    return 0;
  }

  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .trim();

  const parsed = parseFloat(cleaned);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function extractFinancialPair(text) {
  const normalizedText = text.split('\n').join(' ');

  const amountPattern = /\b\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?\b/g;

  const values = normalizedText.match(amountPattern) || [];

  let leftAmount = 0;
  let rightAmount = 0;

  for (let index = values.length - 2; index >= 0; index--) {
    const leftValue = cleanCurrency(values[index]);

    const rightValue = cleanCurrency(values[index + 1]);

    const validValues =
      leftValue > 1000 &&
      rightValue > 1000 &&
      String(Math.floor(leftValue)).length <= 12 &&
      String(Math.floor(rightValue)).length <= 12;

    if (validValues) {
      leftAmount = leftValue;
      rightAmount = rightValue;
      break;
    }
  }

  return {
    leftAmount,
    rightAmount,
    tallied: Math.abs(leftAmount - rightAmount) < 0.01,
    difference: Math.abs(leftAmount - rightAmount),
  };
}

function normalizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const DOCUMENT_TYPES = [
  { key: 'receiptsandpayments', type: 'Receipts and Payments', hasFinancialTable: true },
  { key: 'trailbalance', type: 'Trail Balance', hasFinancialTable: true },
  { key: 'tradingaccount', type: 'Trading Account', hasFinancialTable: true },
  { key: 'profitandlossappropriation', type: 'Profit and Loss Appropriation', hasFinancialTable: true },
  { key: 'profitandlossaccount', type: 'Profit and Loss Account', hasFinancialTable: true },
  { key: 'balancesheet', type: 'Balance Sheet', hasFinancialTable: true },
  { key: 'auditindex', type: 'Audit Index', hasFinancialTable: false },
  { key: 'nameandaddressofthesociety', type: 'Name & Address of Society', hasFinancialTable: false },
  { key: 'finalauditreport', type: 'Final Audit Report', hasFinancialTable: false },
  { key: 'soundnesscertificate', type: 'Soundness Certificate', hasFinancialTable: false },
  { key: 'auditratingandclassification', type: 'Audit Rating & Classification', hasFinancialTable: false },
];

/* === AI Legal Chat — knowledge base =================================
 * Keyword-driven responses grounded in the APCS Act 1964,
 * APCS Rules 1964, NABARD norms, and the Audit Manual for PACS.
 * ================================================================= */
const LEGAL_KB = [
  {
    keys: ['section 50', 'sec 50', 's.50', 'audit of accounts'],
    answer:
      "Section 50 of the APCS Act, 1964 — Audit of Accounts. Empowers the Registrar to audit or cause the audit of the accounts of every Society at least once a year. Under sub-section (5), if the Managing Committee fails to place the audit report before the General Body within 30 days of receipt, members of the committee cease to hold office.",
  },
  {
    keys: ['section 51', 'sec 51', 's.51', 'inquiry'],
    answer:
      'Section 51 of the APCS Act, 1964 — Inquiry into the Affairs of a Society. The Registrar may hold an inquiry into the constitution, working and financial condition of a Society on his own motion or on application by a financing bank or a prescribed proportion of members.',
  },
  {
    keys: ['section 52', 'sec 52', 's.52', 'inspection'],
    answer:
      'Section 52 of the APCS Act, 1964 — Inspection of a Society. The Registrar or any officer authorised by him may inspect or cause the inspection of any society and its books and accounts.',
  },
  {
    keys: ['section 54', 'sec 54', 's.54', 'rectification'],
    answer:
      "Section 54 of the APCS Act, 1964 — Rectification of Defects. The Registrar shall draw the attention of the Society to the defects noticed in every audit conducted under Section 50, inquiry under Section 51, or inspection under Section 52/53, and may make an order directing the Society or its officers to take such action and within such time as may be specified therein to remedy such defects.",
  },
  {
    keys: ['section 55-a', 'section 55a', 'sec 55-a', 's.55-a', 'maintenance of accounts', 'books of account', 'rule 58', 'rule 59'],
    answer:
      'Section 55-A of the APCS Act, 1964 read with Rules 58 and 59 — Maintenance of Accounts and Books. The Chief Executive Officer and the President of every Society are jointly and severally responsible for keeping, maintaining, signing and authenticating the prescribed accounts and books, and for producing the same when called for in connection with audit, inquiry, inspection or election. Sub-section (2) empowers the Registrar to direct production where records are not maintained.',
  },
  {
    keys: ['section 60', 'sec 60', 's.60', 'surcharge'],
    answer:
      'Section 60 of the APCS Act, 1964 — Surcharge. Empowers the Registrar, on application by the Society or otherwise, to surcharge any officer or former officer of the Society for any loss caused to the Society by negligence, misconduct, breach of trust, or misappropriation of funds/property of the Society.',
  },
  {
    keys: ['section 71', 'sec 71', 's.71', 'recovery certificate'],
    answer:
      'Section 71 of the APCS Act, 1964 — Recovery Certificates. Provides for the Registrar to issue recovery certificates for sums due to a Society. The certificate is enforceable as if it were a decree of a civil court and may be executed through attachment and sale of the defaulting member’s movable / immovable property.',
  },
  {
    keys: ['section 115-d', 'section 115d', 's.115-d', 's.115d', 'cost of management', 'staff cost ceiling', 'com ceiling'],
    answer:
      'Section 115-D of the APCS Act, 1964 read with NABARD norms — Cost of Management. Prescribes the eligibility ceilings on Cost of Management of PACS — Cost of Management at 50% of Total Income (Annexure-8) and Staff Cost at 30% of Total Income. Exceeding these ceilings exposes the Managing Committee to responsibility.',
  },
  {
    keys: ['section 30', 'sec 30', 's.30', 'managing committee duties', 'general body'],
    answer:
      "Section 30 of the APCS Act, 1964 — Powers and duties of the Managing Committee. Sub-section (2) requires the annual accounts and audit report to be placed before the General Body read with Rule 22. Sub-section (xxii) casts a specific duty on the Managing Committee to conduct a periodical review of all overdue loans and defaulters of the Society.",
  },
  {
    keys: ['rule 41', 'rule 41(c)', 'rule 41(c)(6)', '41(c)(6)', 'overdue debtors'],
    answer:
      'Rule 41(C)(6) of the APCS Rules, 1964 — Declaration of Overdue Debtors. Mandates the Society to declare overdue debtors once every quarter. Read with Section 30(xxii), the CEO must publish the overdue list every three months and place it before the Managing Committee for legal/recovery action.',
  },
  {
    keys: ['rule 22', 'r.22'],
    answer:
      'Rule 22 of the APCS Rules, 1964 read with Section 30(2) — General Body discussion. Requires the audited annual accounts, audit report and the defaulters’ list to be placed before, and discussed by, the General Body within the prescribed timeline.',
  },
  {
    keys: ['rule 58', 'rule 59'],
    answer:
      'Rules 58 and 59 of the APCS Rules, 1964 — Operationalize Section 55-A by prescribing the form of books and registers to be maintained, the manner of authentication, and the duty to produce them for audit/inquiry/inspection.',
  },
  {
    keys: ['para 6.12', 'paragraph 6.12', '6.12.1', '6.12.2', '6.12.3'],
    answer:
      "Paragraph 6.12 of the Audit Manual for PACS — Audit Observations & Defect Reporting. Categorises defects into 6.12.1 Financial Irregularities (budget overruns, irregular loans, mis-recognised income, heavy cash retention, frauds), 6.12.2 Accounting Irregularities (registers not maintained, wrong postings, inadequate provisioning, NABARD norm breaches), and 6.12.3 Administrative Irregularities (delegation, GB/MC meetings, internal controls, housekeeping, prior-defect non-compliance).",
  },
  {
    keys: ['para 7.1', 'paragraph 7.1', '7.1', 'computerised', 'computerized environment', 'erp accounting'],
    answer:
      'Paragraph 7.1 of the Audit Manual for PACS — Accounting and Record Keeping in a Computerised Environment. Requires the auditor to verify that financial statements (P&L, Balance Sheet, Trial Balance) are correctly generated for the full set of accounts, properly authenticated by the Secretary, and preserved in soft and hard form for at least 7 years.',
  },
  {
    keys: ['para 7.4', 'paragraph 7.4', '7.4', 'password control'],
    answer:
      "Paragraph 7.4 of the Audit Manual for PACS — Password Controls. Passwords for taking backups, entering/updating operating systems, creating/editing master records, system shutdowns and rebooting should only be with the Secretary or System Administrator. Users must change passwords regularly and not share them.",
  },
  {
    keys: ['para 7.5', 'paragraph 7.5', '7.5', 'interest rate control', 'interest controls'],
    answer:
      "Paragraph 7.5 of the Audit Manual for PACS — Key Transaction Controls / Interest Rates. The auditor must obtain interest rates keyed into the system and match them with rates prescribed by management; obtain the log of interest rate changes; ensure changes are duly authorized; test-check calculations; and verify reversals on interest defaults.",
  },
  {
    keys: ['irac', 'income recognition', 'asset classification', 'provisioning norms', 'nabard prudential'],
    answer:
      "NABARD's IRAC Norms — Income Recognition, Asset Classification and Provisioning. Loans are classified as Standard, Sub-Standard, Doubtful or Loss based on overdue periods. Graded provisioning is required: Sub-Standard 10%, Doubtful 20-100% (sub-bucket basis), Loss 100%. Sundry Debtors aged > 3 years require 100% provision with no scope for realization.",
  },
  {
    keys: ['annexure-5', 'annexure 5', 'imbalance'],
    answer:
      "Annexure-5 — Calculation of Imbalance. Formula: Imbalance = A − B, where A = Amounts Pending for Payment (Deposits + Borrowings) and B = Amounts Pending for Recovery (Loans & Advances + Term Deposits other than Reserve Funds). If B is greater than (or equal to) A, the Imbalance is treated as Nil. A positive imbalance indicates that payables exceed recoverables — a sign of financial weakness.",
  },
  {
    keys: ['annexure-8', 'annexure 8', 'total income computation'],
    answer:
      "Annexure-8 — Computation of Total Income, Cost of Management and Staff Cost. Lists income heads (interest on loans, investments, trade income, other income), interest expenditure, and computes Total Income. Eligibility for Staff Cost is 30% of Total Income; for Cost of Management it is 50% of Total Income. A negative Total Income renders these ceilings inoperative.",
  },
  {
    keys: ['annexure-11', 'annexure 11', 'legal action coverage'],
    answer:
      'Annexure-11 — Particulars of Legal Action Coverage on Loans and Advances. Captures outstanding loans, overdue loans, and the legal-action status: covered, decree issued & EPs filed, decree issued & EPs not filed, not covered. Read with Section 30(xxii) and Rule 41(C)(6), all uncovered overdues attract immediate legal action including Section 71 recovery certificates.',
  },
  {
    keys: ['schedule-9', 'schedule 9', 'provisions', 'npa provisions'],
    answer:
      "Schedule-9 — Provisions. Records closing balances of provisions made for NPAs (Sub-Standard, Doubtful, Loss), Overdue Interest on Loans and Advances, Bad and Doubtful Sundry Debtors (Others), and Depreciation on Investments. Negative closing balances or zero NPA provisions breach NABARD IRAC norms and Section 55-A of the APCS Act.",
  },
  {
    keys: ['schedule-16b', 'schedule 16b', 'sundry debtors'],
    answer:
      "Schedule-16B — Sundry Debtors. Records Sundry Debtors (Others) classified as: Due from below 1 year, Due from below 3 years, and Due from above 3 years (No scope for realisation - 100%). Aged debtors > 3 years require 100% provisioning, Section 71 recovery action where possible, and write-off resolution before the General Body for time-barred items.",
  },
  {
    keys: ['hi', 'hello', 'hey', 'greetings'],
    answer:
      "Hello. I'm COOP·AUDIT·AI's legal assistant. Ask me about APCS Act 1964 sections, APCS Rules, NABARD norms, or Audit Manual for PACS paragraphs.",
  },
];

/* =====================================================================
 * AI Legal Agent — powered by Google Gemini (gemini-2.0-flash)
 * Two-pass pipeline: (1) draft a precise statutory narrative, then
 * (2) humanize it into official, formal English. Appends ready-made
 * case-law lookups on Indian Kanoon + AP High Court. Falls back to the
 * offline corpus/keyword engine when no API key is set or a call fails.
 *
 * Gemini's Generative Language API supports direct browser calls with an
 * API key (?key=...) — no backend needed.
 *
 * API key resolution (first match wins):
 *   1) localStorage 'COOP_GEMINI_KEY'   (admin pastes via the AI Key panel)
 *   2) build-time env  VITE_GEMINI_API_KEY  (.env file, not in source)
 *   3) DEV_GEMINI_API_KEY fallback below
 * ===================================================================== */
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
// No hardcoded key in source. The key comes from the AI Key panel (localStorage)
// or the VITE_GEMINI_API_KEY env var (see .env, which is git-ignored).
const DEV_GEMINI_API_KEY = '';

function getGeminiKey() {
  // 1) localStorage (admin-pasted via the AI Key panel) — highest priority
  try {
    const ls =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('COOP_GEMINI_KEY')
        : null;
    if (ls && ls.trim()) return ls.trim();
  } catch (_) {
    /* localStorage may be unavailable */
  }
  // 2) Build-time env (from .env file — not in source)
  try {
    const envKey =
      import.meta && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && String(envKey).trim() && String(envKey).trim() !== 'undefined')
      return String(envKey).trim();
  } catch (_) {
    /* import.meta not available */
  }
  // 3) Hardcoded dev fallback (last resort)
  if (DEV_GEMINI_API_KEY && DEV_GEMINI_API_KEY !== 'AIza-YOUR-KEY-HERE') {
    return DEV_GEMINI_API_KEY.trim();
  }
  return '';
}

function hasGeminiKey() {
  return !!getGeminiKey();
}

async function geminiMessage({ system, messages, maxTokens = 1100 }) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    const e = new Error('NO_API_KEY');
    e.code = 'NO_API_KEY';
    throw e;
  }
  // Map the shared {role, content} shape to Gemini's contents format.
  // Gemini uses roles 'user' and 'model' (assistant -> model).
  const contents = (messages || []).map((m) => ({
    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
    parts: [{ text: String(m.content ?? '') }],
  }));

  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
  };
  if (system) {
    body.system_instruction = { parts: [{ text: system }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const cand = (data.candidates && data.candidates[0]) || null;
  const parts = (cand && cand.content && cand.content.parts) || [];
  return parts
    .map((p) => p.text || '')
    .join('\n')
    .trim();
}

// Construct ready-made case-law / statute lookups (no live scraping).
function buildCaseLawReferences(query) {
  const ikInput = `${query} cooperative society Andhra Pradesh APCS Act 1964`;
  const ik = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(
    ikInput
  )}`;
  const aphc = `https://www.google.com/search?q=${encodeURIComponent(
    `${query} Andhra Pradesh High Court judgment site:aphc.gov.in`
  )}`;
  return [
    { label: 'Indian Kanoon — statute & case-law search', url: ik },
    { label: 'Andhra Pradesh High Court — judgments search', url: aphc },
  ];
}

// Two-pass AI agent: formal legal narrative -> humanized rewrite.
async function generateLegalAgentAnswer(query, history = []) {
  const draftSystem =
    'You are a Senior Statutory Auditor and legal counsel specialising in the ' +
    'Andhra Pradesh Cooperative Societies (APCS) Act, 1964, the APCS Rules, 1964, ' +
    'NABARD IRAC norms, the Audit Manual for PACS, and the Cooperative Accounting ' +
    'Standards (CAS) Manual. Answer strictly, accurately and in a practical, ' +
    'field-ready manner for a cooperative auditor. ' +
    'Always cite the exact provisions using abbreviations (u/s = under section, ' +
    'r/w = read with), e.g. Section 55-A r/w Rules 58 & 59, Section 60 (surcharge), ' +
    'Section 54 (rectification), Section 71 (recovery). ' +
    'Structure the answer as: (1) the applicable provisions; (2) a short, clear ' +
    'explanation; and, when the question describes an irregularity or a loss, ' +
    '(3) a ready-to-use Defect-Sheet narrative, and (4) how the matter is pursued by ' +
    'the statutory officers — Inquiry Officer (u/s 51), Inspection Officer (u/s 52/53), ' +
    'Surcharge Officer / Registrar (u/s 60), Liquidator (on winding-up) and Arbitrator ' +
    '(dispute u/s 61), with recovery u/s 71. ' +
    'For inquiry / inspection report questions, explain the Part A (narrative and ' +
    'rectifiable defects) vs Part B (responsibility-fixing: civil liability for surcharge, ' +
    'and criminal liability where an offence is disclosed) format. ' +
    'Where the question concerns a legal position, note the relevant principle from Indian ' +
    'case law (Supreme Court / Andhra Pradesh High Court) at a general level. ' +
    'IMPORTANT: never invent case names, party names, or citations you are not certain of — ' +
    'if unsure, describe the settled legal principle without attributing a fake citation. ' +
    'Produce a precise, well-structured legal narrative.';
  const draft = await geminiMessage({
    system: draftSystem,
    messages: [...history, { role: 'user', content: query }],
    maxTokens: 1100,
  });

  const humanizeSystem =
    'Rewrite the following legal narrative into clear, precise, formal English suitable for ' +
    'OFFICIAL USE — fit for inclusion in audit reports, defect sheets, inquiry / inspection ' +
    'reports and official correspondence of a cooperative society. Use a professional, ' +
    'impersonal and authoritative tone; avoid casual or conversational wording. ' +
    'Preserve every statutory citation exactly (sections, rules, NABARD norms, Audit Manual / CAS ' +
    'paragraphs) — do not drop, change or renumber any provision, and retain the abbreviations ' +
    'u/s and r/w. ' +
    'Keep the structure of the narrative intact: the applicable provisions, the explanation, ' +
    'the Defect-Sheet narrative (if present), the action by the statutory officers, and any ' +
    'Part A / Part B breakdown — presented in well-organised paragraphs or numbered points. ' +
    'Improve readability and remove redundancy, but do not simplify to the point of losing legal ' +
    'precision. Do not add new legal claims or sections, and do not fabricate case citations that ' +
    'were not in the narrative.';
  let humanized = draft;
  try {
    humanized = await geminiMessage({
      system: humanizeSystem,
      messages: [{ role: 'user', content: `LEGAL NARRATIVE:\n\n${draft}` }],
      maxTokens: 1100,
    });
  } catch (_) {
    // If the humanize pass fails, fall back to the draft narrative.
    humanized = draft;
  }

  return {
    text: humanized || draft,
    references: buildCaseLawReferences(query),
  };
}

/* =====================================================================
 * Composite audit-defect scenarios — lets the OFFLINE engine answer
 * natural-language defect questions (no API key needed). Each scenario
 * has required keyword groups (any synonym within a group counts) plus
 * optional groups that boost the match. Returns applicable provisions
 * and a ready-to-use defect narrative.
 * ===================================================================== */
const DEFECT_SCENARIOS = [
  {
    id: 'salesman-non-remittance',
    kind: 'defect',
    groups: [
      ['salesman', 'saleman', 'sales man', 'sales-man', 'seller', 'depot incharge', 'depot in-charge', 'fair price shop', 'fps dealer'],
      ['not remit', 'non remit', 'non-remit', 'remitted', 'unremitted', 'un-remitted', 'not deposit', 'not credited', 'not handed over', 'withheld', 'retained the', 'misappropri', 'cash shortage', 'shortage of cash', 'short remit'],
    ],
    minGroups: 2,
    optionalGroups: [
      ['day book', 'daybook', 'day-book', 'cash book', 'cashbook', 'books of account'],
      ['ceo', 'chief executive', 'secretary', 'president', 'not recorded', 'not entered', 'not accounted', 'suppress', 'not posted'],
    ],
    answer: `SCENARIO — Sale proceeds not remitted by the Salesman and not recorded in the Day Book by the CEO

▸ APPLICABLE PROVISIONS
• Section 55-A, APCS Act, 1964 r/w Rules 58 & 59 — The Chief Executive Officer and the President are jointly and severally responsible for keeping, maintaining, signing and authenticating the prescribed books of account (Day Book, Cash Book, Ledgers). Failure to record cash sale proceeds in the Day Book is a direct breach.
• Section 60, APCS Act, 1964 (Surcharge) — The Registrar may surcharge the salesman and the CEO for the loss caused to the Society by negligence, misconduct, breach of trust or misappropriation of its funds (the un-remitted amount).
• Section 50 r/w Section 54, APCS Act, 1964 — The defect noticed in audit is brought to the Society's notice; the Registrar may direct rectification and recovery within a specified time.
• Section 30 / 30(xxii), APCS Act, 1964 — Managing Committee's duty to supervise the CEO and review cash handling; failure attracts responsibility.
• Section 71, APCS Act, 1964 — Recovery of the un-remitted amount as an arrear, enforceable as a decree of a civil court.
• Audit Manual for PACS (cash-management paras) r/w CAS Manual — daily reconciliation of cash sales with the Day Book / Cash Book is mandatory.

▸ NATURE OF VIOLATION
Temporary misappropriation / retention of the Society's sale proceeds by the salesman, coupled with non-accounting of the receipt in the Day Book by the CEO — a breach of statutory record-keeping and a loss to the Society.

▸ DEFECT (as it would read in the Defect Sheet)
"Cash sale proceeds of ₹______ collected by the Salesman were not remitted to the Society's cash chest / bank, and the corresponding receipt was not recorded in the Day Book by the Chief Executive Officer. This constitutes misappropriation and suppression of receipts in breach of Section 55-A, APCS Act, 1964 r/w Rules 58 & 59. The CEO and the Salesman are jointly and severally responsible. The CEO is directed u/s 54 to recover the amount and pass correct entries; the un-remitted sum is recoverable u/s 71, and the responsible persons are liable to surcharge u/s 60 of the Act for the loss caused to the Society."`,
  },
  {
    id: 'transaction-not-recorded',
    kind: 'defect',
    groups: [
      ['day book', 'daybook', 'day-book', 'cash book', 'cashbook', 'books of account', 'ledger'],
      ['not recorded', 'not entered', 'not accounted', 'unrecorded', 'omitted', 'suppress', 'not posted', 'not maintained', 'off the books'],
    ],
    minGroups: 2,
    optionalGroups: [
      ['ceo', 'chief executive', 'secretary', 'president'],
      ['cash', 'receipt', 'amount', 'transaction', 'collection'],
    ],
    answer: `SCENARIO — Receipts / transactions not recorded in the Day Book (Books of Account)

▸ APPLICABLE PROVISIONS
• Section 55-A, APCS Act, 1964 r/w Rules 58 & 59 — The CEO and the President are jointly and severally responsible for keeping and authenticating the prescribed books of account; non-recording of a transaction in the Day Book / Cash Book is a direct breach.
• Section 60, APCS Act, 1964 (Surcharge) — surcharge for any loss caused to the Society by such suppression or negligence.
• Section 50 r/w Section 54, APCS Act, 1964 — audit defect to be rectified within the time directed by the Registrar.
• Section 71, APCS Act, 1964 — recovery of any consequential shortfall as an arrear.
• Audit Manual for PACS r/w CAS Manual — every receipt and payment must be entered in the Day Book on the date of the transaction.

▸ DEFECT (as it would read in the Defect Sheet)
"A receipt / transaction of ₹______ was not recorded in the Day Book / Cash Book, resulting in suppression of accounts in breach of Section 55-A, APCS Act, 1964 r/w Rules 58 & 59. The Chief Executive Officer is directed u/s 54 to pass the correct entries and reconcile the books; the responsible officer is liable to surcharge u/s 60 and the amount is recoverable u/s 71 of the Act."`,
  },

  /* ---- More recurring PACS audit defects ---- */
  {
    id: 'cash-shortage-chest',
    kind: 'defect',
    groups: [
      ['cash chest', 'cash on hand', 'physical cash', 'cash balance', 'cash in hand', 'cash book balance'],
      ['shortage', 'short', 'missing', 'difference', 'not tally', 'does not tally', 'negative cash', 'misappropri', 'deficit'],
    ],
    minGroups: 2,
    answer: `SCENARIO — Shortage of cash in the cash chest / cash on hand not tallying with the Cash Book

▸ APPLICABLE PROVISIONS
• Section 55-A, APCS Act, 1964 r/w Rules 58 & 59 — Cash Book and cash chest must be maintained and the closing cash balance physically verified daily; a shortage is a breach.
• Section 60, APCS Act, 1964 (Surcharge) — the responsible officer / cashier is surchargeable for the cash shortage as a loss to the Society.
• Section 50 r/w Section 54 — defect to be rectified within the time directed by the Registrar.
• Section 71, APCS Act, 1964 — recovery of the shortage as an arrear.

▸ DEFECT (Defect Sheet)
"On physical verification the cash on hand fell short of the Cash Book balance by ₹______. The unexplained shortage constitutes misappropriation in breach of Section 55-A, APCS Act, 1964 r/w Rules 58 & 59. The Chief Executive Officer / cashier is directed u/s 54 to make good the shortage; the amount is recoverable u/s 71 and the responsible person is liable to surcharge u/s 60 of the Act."`,
  },
  {
    id: 'bogus-ghost-loans',
    kind: 'defect',
    groups: [
      ['bogus loan', 'ghost loan', 'benami loan', 'fictitious loan', 'fake loan', 'bogus member', 'ghost member', 'non-existent member', 'benami', 'fictitious member'],
    ],
    minGroups: 1,
    optionalGroups: [
      ['loan', 'advance', 'sanction', 'disburse'],
      ['without security', 'no documents', 'no kyc', 'not genuine'],
    ],
    answer: `SCENARIO — Bogus / benami / ghost loans sanctioned to non-existent or ineligible members

▸ APPLICABLE PROVISIONS
• Section 55-A, APCS Act, 1964 r/w Rules 58 & 59 — loan ledgers and member records must reflect genuine, verifiable transactions; bogus entries are a breach.
• Section 30 / 30(xxii), APCS Act, 1964 — Managing Committee's duty to sanction loans properly and review overdues / defaulters.
• Section 60, APCS Act, 1964 (Surcharge) — surcharge of the office-bearers / CEO who sanctioned or disbursed the bogus loans for the loss to the Society.
• Section 50 r/w Section 54, and Section 71 — rectification and recovery of the diverted amount; the matter also attracts NABARD IRAC norms for asset classification.

▸ DEFECT (Defect Sheet)
"Loans aggregating ₹______ were sanctioned / disbursed in the names of non-existent / benami members without genuine documentation, amounting to diversion / misappropriation of the Society's funds in breach of Section 55-A r/w Section 30, APCS Act, 1964. The sanctioning office-bearers and the CEO are jointly liable; the amount is recoverable u/s 71 and the responsible persons are liable to surcharge u/s 60 of the Act."`,
  },
  {
    id: 'interest-not-charged',
    kind: 'defect',
    groups: [
      ['interest not charged', 'interest not collected', 'interest not levied', 'not levied interest', 'penal interest not', 'no interest charged', 'interest omitted', 'interest short', 'under charged interest', 'under-charged interest', 'less interest charged'],
    ],
    minGroups: 1,
    answer: `SCENARIO — Interest / penal interest on loans not charged or short-charged

▸ APPLICABLE PROVISIONS
• CAS Manual r/w Section 55-A, APCS Act, 1964 — interest and penal interest must be correctly computed and posted to each loan account; omission / short-charge is a breach.
• Section 60, APCS Act, 1964 (Surcharge) — surcharge for the loss of income caused to the Society.
• Section 50 r/w Section 54 — defect to be rectified; Section 71 — recovery of the short-collected interest.

▸ DEFECT (Defect Sheet)
"Interest / penal interest of ₹______ recoverable on loan accounts was not charged / was short-charged, causing loss of income to the Society in breach of the CAS Manual r/w Section 55-A, APCS Act, 1964. The CEO is directed u/s 54 to compute and recover the amount; the shortfall is recoverable u/s 71 and the responsible officer is liable to surcharge u/s 60."`,
  },
  {
    id: 'stock-shortage',
    kind: 'defect',
    groups: [
      ['stock shortage', 'shortage of stock', 'stock not tally', 'stock does not tally', 'physical stock', 'godown shortage', 'missing stock', 'stock difference', 'shortfall in stock', 'shortage of fertilizer', 'shortage of fertiliser', 'pds stock', 'stock register'],
      ['shortage', 'short', 'missing', 'difference', 'not tally', 'shortfall', 'deficit'],
    ],
    minGroups: 1,
    answer: `SCENARIO — Shortage of stock (fertiliser / PDS / consumer goods) against the Stock Register

▸ APPLICABLE PROVISIONS
• Section 55-A, APCS Act, 1964 r/w Rules 58 & 59 — Stock Register must be maintained and physically verified; a shortage against book stock is a breach.
• Section 60, APCS Act, 1964 (Surcharge) — surcharge for the value of the stock shortage as a loss to the Society.
• Section 50 r/w Section 54, and Section 71 — rectification and recovery; the Audit Manual for PACS prescribes periodical physical verification of stock.

▸ DEFECT (Defect Sheet)
"On physical verification the closing stock fell short of the Stock Register balance by ₹______ (qty ______). The unexplained shortage constitutes misappropriation in breach of Section 55-A, APCS Act, 1964 r/w Rules 58 & 59. The CEO / storekeeper is directed u/s 54 to make good the shortage; the value is recoverable u/s 71 and the responsible person is liable to surcharge u/s 60."`,
  },
  {
    id: 'overdue-time-barred',
    kind: 'defect',
    groups: [
      ['time barred', 'time-barred', 'barred by limitation', 'limitation', 'overdue loan', 'overdues not reviewed', 'not renewed', 'no recovery action', 'recovery not initiated', 'dead loan', 'chronic overdue'],
    ],
    minGroups: 1,
    answer: `SCENARIO — Overdue loans allowed to become time-barred / no recovery action taken

▸ APPLICABLE PROVISIONS
• Section 30(xxii), APCS Act, 1964 — Managing Committee's specific duty to conduct a periodical review of all overdue loans and defaulters; failure is a breach.
• Section 71, APCS Act, 1964 — recovery-certificate machinery available but not invoked in time.
• Section 60, APCS Act, 1964 (Surcharge) — surcharge for the loss where a recoverable debt has become irrecoverable / barred by limitation through negligence.
• Section 50 r/w Section 54 — defect to be rectified.

▸ DEFECT (Defect Sheet)
"Overdue loans aggregating ₹______ were allowed to remain without recovery action and have become / are nearing time-barred, in breach of Section 30(xxii), APCS Act, 1964. The Managing Committee and the CEO failed to initiate recovery u/s 71. The responsible persons are liable to surcharge u/s 60 for the resultant loss; the CEO is directed u/s 54 to initiate immediate recovery for live debts."`,
  },
  {
    id: 'investments-not-made',
    kind: 'defect',
    groups: [
      ['investment not made', 'funds not invested', 'reserve fund not invested', 'not invested', 'idle funds', 'fund diverted', 'diversion of funds', 'statutory investment', 'reserve fund diverted', 'funds diverted'],
    ],
    minGroups: 1,
    answer: `SCENARIO — Reserve Fund / surplus funds not invested as required (or funds diverted)

▸ APPLICABLE PROVISIONS
• Reserve Fund provisions of the APCS Act, 1964 and the Rules on investment of funds r/w Section 55-A — statutory reserves / surplus funds must be invested as prescribed; non-investment or diversion is a breach.
• Section 60, APCS Act, 1964 (Surcharge) — surcharge for the loss of interest income / value to the Society.
• Section 50 r/w Section 54, and Section 71 — rectification and recovery of any diverted amount.

▸ DEFECT (Defect Sheet)
"Reserve Fund / surplus funds of ₹______ were not invested as statutorily required (or were diverted to non-permitted use), causing loss to the Society in breach of the Reserve Fund provisions r/w Section 55-A, APCS Act, 1964. The CEO is directed u/s 54 to invest / restore the funds; any diverted amount is recoverable u/s 71 and the responsible persons are liable to surcharge u/s 60."`,
  },
  {
    id: 'npa-provision-not-made',
    kind: 'defect',
    groups: [
      ['npa', 'irac', 'asset classification', 'sub-standard', 'sub standard', 'doubtful asset', 'bad and doubtful', 'overdue interest', 'provisioning'],
      ['provision not made', 'not provided', 'short provision', 'not classified', 'wrong classification', 'not made', 'understated', 'provisioning'],
    ],
    minGroups: 1,
    answer: `SCENARIO — NPA not classified / provision not made as per NABARD IRAC norms

▸ APPLICABLE PROVISIONS
• NABARD IRAC norms r/w Schedule-9 and Section 55-A, APCS Act, 1964 — assets must be classified (Standard / Sub-Standard / Doubtful / Loss) and provisions made; failure understates losses and is a breach.
• Section 60, APCS Act, 1964 (Surcharge) — where mis-classification conceals or causes a loss.
• Section 50 r/w Section 54 — defect to be rectified in the accounts.

▸ DEFECT (Defect Sheet)
"NPAs were not classified and provisions of ₹______ were not made as required under NABARD IRAC norms r/w Schedule-9 and Section 55-A, APCS Act, 1964, thereby overstating profit / understating losses. The CEO is directed u/s 54 to classify the assets and make the required provisions in the accounts."`,
  },

  /* ---- Statutory officers — roles, powers & how a defect is pursued ---- */
  {
    id: 'officer-inquiry-report',
    kind: 'officer',
    groups: [
      ['inquiry officer', 'enquiry officer', 'inquiry report', 'enquiry report', 'inquiry u/s 51', 'section 51 report', 'inquiry under section 51'],
      ['part a', 'part b', 'part-a', 'part-b', 'civil liability', 'criminal liability', 'key aspects', 'aspects to report', 'what to report', 'report format', 'responsibility', 'charge'],
    ],
    minGroups: 2,
    answer: `INQUIRY OFFICER'S REPORT — Key aspects, Part A & Part B (Inquiry u/s 51, APCS Act, 1964)

▸ KEY ASPECTS THE REPORT MUST COVER
• The constitution, working and financial condition of the Society as on the date of inquiry.
• Each specific point / allegation referred for inquiry, with a clear finding on it.
• The defects, irregularities and violations noticed, citing the provision breached (sections / rules).
• The loss, if any, caused to the Society — quantified item-wise.
• Fixation of responsibility — the person(s) responsible for each irregularity / loss.
• The documentary evidence relied upon and the explanation of the persons concerned.
• Recommendations — rectification u/s 54, surcharge u/s 60, recovery u/s 71, prosecution where a criminal offence is disclosed, and any further action (supersession / cancellation).

▸ PART A vs PART B (commonly-followed format)
• PART A — the narrative / general part: records the findings on the working and financial condition and the irregularities that are rectifiable in nature (no fixing of personal monetary liability). These are pursued through rectification u/s 54.
• PART B — the responsibility-fixing / charge part: lists each item that caused loss to the Society, the amount, and the person(s) held responsible — i.e. the basis for civil liability (surcharge u/s 60 and recovery u/s 71) and, where a criminal offence is disclosed, criminal liability (prosecution).

▸ IF ONLY CIVIL LIABILITY IS INVOLVED
• PART A is still required — it carries the narrative findings and the rectifiable defects.
• PART B is also required — it must quantify the loss and name the responsible person(s) so that surcharge proceedings u/s 60 and recovery u/s 71 can follow.
• Only the criminal-liability content is omitted (no prosecution schedule), since no criminal offence such as misappropriation with mens rea or falsification of accounts is disclosed.
In short: civil liability ⇒ BOTH Part A (narrative + rectifiable defects) and Part B (loss + responsibility for surcharge) are prepared; only the criminal-liability portion is left out.

(Note: the precise Part A / Part B layout can vary by departmental circular / proforma — confirm against the prescribed inquiry-report format in force.)`,
  },
  {
    id: 'officer-inquiry',
    kind: 'officer',
    groups: [
      ['inquiry officer', 'enquiry officer', 'inquiry into', 'enquiry into', 'inquiry under section 51', 'power of inquiry', 'powers of inquiry officer'],
    ],
    minGroups: 1,
    answer: `INQUIRY OFFICER — Inquiry into the affairs of a Society (Section 51, APCS Act, 1964)

• Power: The Registrar (or an officer authorised by him) may, on his own motion or on application by a financing bank or a prescribed proportion of members, hold an inquiry into the constitution, working and financial condition of a Society.
• Duties: examine the books, records and office-bearers; fix responsibility for the irregularities noticed; submit an inquiry report.
• Outcome of findings: defects are pursued for rectification u/s 54; loss / misappropriation is surcharged u/s 60; amounts are recovered u/s 71; serious findings may lead to supersession of the committee or cancellation of registration.`,
  },
  {
    id: 'officer-inspection',
    kind: 'officer',
    groups: [
      ['inspection officer', 'inspecting officer', 'inspection of society', 'inspection of books', 'inspection under section 52', 'power of inspection', 'powers of inspection officer'],
    ],
    minGroups: 1,
    answer: `INSPECTION OFFICER — Inspection of a Society and its books (Sections 52 & 53, APCS Act, 1964)

• Power: The Registrar or an officer authorised by him may inspect, or cause the inspection of, any Society and its books and accounts (Section 52). A financing bank / creditor may seek inspection under Section 53.
• Duties: verify the books, cash, stock and securities; report the irregularities and defects.
• Outcome: defects → rectification u/s 54; loss → surcharge u/s 60; recovery u/s 71.`,
  },
  {
    id: 'officer-surcharge',
    kind: 'officer',
    groups: [
      ['surcharge officer', 'surcharge proceedings', 'how to surcharge', 'power to surcharge', 'surcharge order', 'section 60 surcharge', 'powers of surcharge officer'],
    ],
    minGroups: 1,
    answer: `SURCHARGE OFFICER — Surcharge of office-bearers / officers (Section 60, APCS Act, 1964)

• Power: The Registrar, on application by the Society or otherwise (including on audit / inquiry / inspection findings), may surcharge any present or former officer for any loss caused to the Society by negligence, misconduct, breach of trust or misappropriation of its funds / property.
• Process: quantify the loss, issue notice, hear the person, and pass a surcharge order fixing the amount payable.
• Recovery: the surcharged amount is recoverable as an arrear u/s 71 of the Act.`,
  },
  {
    id: 'officer-liquidator',
    kind: 'officer',
    groups: [
      ['liquidator', 'liquidation', 'winding up', 'wound up', 'winding-up'],
    ],
    minGroups: 1,
    answer: `LIQUIDATOR — On winding up of a Society (APCS Act, 1964)

• Appointment: on cancellation of registration / winding up of the Society, a Liquidator is appointed to wind up its affairs.
• Powers / duties: take charge of the assets, books and records; determine the contributions of present and past members; settle the list of creditors and debtors; realise the assets and distribute the proceeds as per priority.
• Defects / losses: irregularities and misappropriations found are pursued — the responsible persons can be surcharged u/s 60 and the amounts recovered u/s 71; the Liquidator includes such dues in the list for recovery.`,
  },
  {
    id: 'officer-arbitrator',
    kind: 'officer',
    groups: [
      ['arbitrator', 'arbitration', 'arbitration award', 'dispute referred', 'reference to arbitration', 'award executable', 'cooperative dispute'],
    ],
    minGroups: 1,
    answer: `ARBITRATOR — Decision of disputes (Section 61, APCS Act, 1964)

• Jurisdiction: any dispute touching the constitution, management or business of a Society is referred under Section 61 to the Registrar, his nominee, or an arbitrator for decision.
• Process: the parties are heard and an award is passed; the limitation for reference is governed by Section 62.
• Effect: the award is executable as a decree of a civil court, and any sum awarded is recoverable as an arrear u/s 71 of the Act.`,
  },
];

// Standard escalation block appended to every defect answer — how the
// defect is pursued by each statutory officer under the APCS Act, 1964.
const OFFICER_ESCALATION = `▸ ACTION BY STATUTORY OFFICERS
• Inquiry Officer (u/s 51) — on inquiry into the working / financial condition of the Society, records the defect and fixes responsibility.
• Inspection Officer (u/s 52 / 53) — on inspection of the books, cash and stock, verifies and reports the irregularity.
• Surcharge Officer / Registrar (u/s 60) — quantifies the loss and surcharges the responsible officer(s) for negligence, misconduct, breach of trust or misappropriation.
• Liquidator (on winding-up of the Society) — takes the defect on record, includes the amount in the list of dues, and proceeds to recover it from the persons responsible.
• Arbitrator / Registrar's nominee (dispute referred u/s 61) — adjudicates any resulting dispute; the award is executable and the amount recoverable u/s 71.`;

function matchDefectScenario(q) {
  let best = null;
  let bestScore = 0;
  for (const sc of DEFECT_SCENARIOS) {
    const req = sc.groups || [];
    const opt = sc.optionalGroups || [];
    let reqHits = 0;
    for (const g of req) if (g.some((kw) => q.includes(kw))) reqHits++;
    if (reqHits < (sc.minGroups || req.length)) continue;
    let optHits = 0;
    for (const g of opt) if (g.some((kw) => q.includes(kw))) optHits++;
    const score = reqHits * 2 + optHits;
    if (score > bestScore) {
      best = sc;
      bestScore = score;
    }
  }
  if (!best) return null;
  // Defect answers get the statutory-officer escalation footer; the
  // officer-role answers are self-contained.
  return best.kind === 'defect'
    ? `${best.answer}\n\n${OFFICER_ESCALATION}`
    : best.answer;
}

function answerLegalQuery(query) {
  if (!query || !query.trim())
    return 'Please type a question about a specific Section, Rule, Annexure, Schedule, or Paragraph of the Audit Manual.';
  const q = query.toLowerCase().trim();
  // Composite natural-language audit-defect scenarios (handled first)
  const scenarioAns = matchDefectScenario(q);
  if (scenarioAns) return scenarioAns;
  // Exact-keyword match scoring
  let best = null;
  let bestScore = 0;
  for (const entry of LEGAL_KB) {
    for (const k of entry.keys) {
      if (q.includes(k.toLowerCase())) {
        const score = k.length; // longer keys get priority
        if (score > bestScore) {
          best = entry;
          bestScore = score;
        }
      }
    }
  }
  if (best) return best.answer;
  return `I don't have a precise entry for that yet. Try asking about a specific Section (e.g. Section 50, 54, 55-A, 60, 71, 115-D), Rule (e.g. Rule 22, 41(C)(6), 58, 59), Annexure (5, 8, 11), Schedule (9, 16B), or Audit Manual paragraph (6.12, 7.1, 7.4, 7.5, IRAC norms).`;
}

/* === Legal corpus loader =============================================
 * The 5 reference PDFs bundled in /public/legal-references/ are
 * fetched and parsed by PDF.js into an in-memory page-text index.
 * Re-running parsing for the same PDF is idempotent.
 * ================================================================= */
const BUNDLED_LEGAL_REFS = [
  {
    id: 'apcs-act',
    name: 'APCS Act 1964',
    url: '/legal-references/apcs-act-1964.pdf',
  },
  {
    id: 'apcs-rules',
    name: 'APCS Rules 1964',
    url: '/legal-references/apcs-rules-1964.pdf',
  },
  {
    id: 'audit-manual',
    name: 'Audit Manual for PACS',
    url: '/legal-references/audit-manual-pacs.pdf',
  },
  {
    id: 'handbook-statutory',
    name: 'Handbook on Statutory Functions',
    url: '/legal-references/handbook-statutory-functions.pdf',
  },
  {
    id: 'handbook-laws',
    name: 'Handbook on Cooperative Laws',
    url: '/legal-references/handbook-cooperative-laws.pdf',
  },
];

async function parsePdfArrayBufferToPages(buffer, label) {
  const data = new Uint8Array(buffer);
  const pdfDocument = await PDFJS.getDocument({ data }).promise;
  const pages = [];
  for (let n = 1; n <= pdfDocument.numPages; n++) {
    const page = await pdfDocument.getPage(n);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((it) => it.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push({ n, text });
  }
  return { name: label, pages };
}

/* ════════════════════════════════════════════════════════════════════
 * CONCURRENT AUDIT / PERIODICAL INSPECTION — analysis helpers
 * Used by the "Concurrent Audit / Periodical Inspection — Defect Sheet
 * Generator" section: scans an uploaded statement (e.g. Trial Balance)
 * and emits categorised, statute-cited defects, on top of which the user
 * may add custom defects via generateDefectNarrative().
 * ════════════════════════════════════════════════════════════════════ */

// Abbreviation glossary (module-level twin of the defectSheet pass) so the
// concurrent sheet reads in complete terms too.
const CA_ABBR_GLOSSARY = [
  ['CC&RCS', 'Commissioner for Cooperation & Registrar of Coop. Societies, A.P., Guntur'],
  ['CEO', 'Chief Executive Officer'],
  ['GB', 'General Body'],
  ['MC', 'Managing Committee'],
  ['PACS', 'Primary Agricultural Credit Society'],
  ['APCS', 'Andhra Pradesh Cooperative Societies'],
  ['ERP', 'Enterprise Resource Planning'],
  ['FAS', 'Financial Accounting System'],
  ['DCT', 'Digital Capture Tool'],
  ['TB', 'Trial Balance'],
  ['BDR', 'Bad Debt Reserve'],
  ['BDP', 'Business Development Plan'],
  ['KYC', 'Know Your Customer'],
  ['NABARD', 'National Bank for Agriculture and Rural Development'],
  ['NPA', 'Non-Performing Asset'],
  ['CAS', 'Common Accounting System'],
  ['GoI', 'Government of India'],
];

function caExpandAbbr(text) {
  if (!text) return text;
  let out = text
    .replace(/\bu\/s\b/gi, 'under Section')
    .replace(/\br\/w\b/gi, 'read with')
    .replace(/\bdt\.\s*/gi, 'dated ')
    .replace(/\bPara\b/g, 'Paragraph');
  for (const [abbr, full] of CA_ABBR_GLOSSARY) {
    const esc = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\w&])${esc}(s)?(?![\\w&])`, 'g');
    let definePending = !out.includes(full);
    out = out.replace(re, (m, s) => {
      const sfx = s || '';
      if (definePending) {
        definePending = false;
        return `${full}${sfx} (${abbr}${sfx})`;
      }
      return `${full}${sfx}`;
    });
  }
  return out;
}

// Uniform auditor opening for the concurrent sheet.
function caPrependObservation(text) {
  if (!text) return text;
  let core = text.trim();
  if (/^during the period under/i.test(core)) return text;
  core = core.replace(/^it is observed that[,:]?\s+/i, '');
  const firstWord = core.split(/\s+/)[0] || '';
  const isProper =
    /[-–—]/.test(firstWord) ||
    /^[A-Z]{2,}/.test(firstWord) ||
    /^[A-Z][a-z]+[A-Z]/.test(firstWord);
  const body = isProper ? core : core.charAt(0).toLowerCase() + core.slice(1);
  return `During the period under concurrent audit / periodical inspection, it is observed that, ${body}`;
}

// Keyword-driven defect rules. Each match contributes one defect. Narratives
// are written to start lower-case so they flow after the standard opening.
const CONCURRENT_DEFECT_RULES = [
  {
    id: 'parking',
    test: (t) => /parking\s*account/.test(t),
    category: 'financial',
    title:
      'Un-Reconciled "Parking" Balances in the Trial Balance — CC&RCS SOP dt. 20.08.2024',
    narrative:
      'one or more "Parking Account" heads appear in the Trial Balance, representing un-reconciled balances carried during the PACS computerisation. Per CC&RCS Memo No. AGC06-12021/2/2019-PMC SEC-CCRCS dt. 20.08.2024 (Operational Guidelines for Creation of Un-Reconciled / Parking Accounts) r/w SOP for Clearing Parking Balances (File No. AGC06-13/6/2024-PAC SEC-CCRCS), such balances must be investigated, reconciled and cleared to their proper GL heads at the earliest. The CEO is directed to reconcile and clear the parked balances u/s 54 r/w Section 55-A, APCS Act, 1964 before finalisation of accounts.',
  },
  {
    id: 'reserveFund',
    test: (t) => /reserve\s*fund/.test(t),
    category: 'accounting',
    title: 'Appropriation to Reserve Fund — Section 45 r/w Rule 36',
    narrative:
      'the Reserve Fund appears in the statement, but the concurrent audit could not confirm that at least one-fourth (25%) of the net profit for the year has been carried to the Reserve Fund as required u/s 45, APCS Act, 1964 r/w Rule 36 of the APCS Rules, 1964. The CEO/MC is directed to demonstrate the prescribed appropriation and place the same before the GB.',
  },
  {
    id: 'plAppropriation',
    test: (t) => /profit\s*(and|&)?\s*loss\s*appropriation|net\s*profit|surplus/.test(t),
    category: 'accounting',
    title: 'Appropriation of Net Profit Pending — Section 45 r/w Bye-laws',
    narrative:
      'a balance is seen under the Profit & Loss Appropriation Account; appropriation of net profit to the Reserve Fund, dividend, Common Good Fund and other statutory funds is required to be made as per Section 45, APCS Act, 1964, the Rules and the Society\'s bye-laws, duly approved by the GB. The CEO is directed to complete the statutory appropriations and produce the GB resolution.',
  },
  {
    id: 'riskFund',
    test: (t) => /bad\s*debt\s*reserve|risk\s*fund|\bbdr\b/.test(t),
    category: 'financial',
    title: 'Adequacy of Bad Debt / Risk Fund Provisioning — NABARD IRAC Norms',
    narrative:
      'Bad Debt Reserve / Risk Fund heads appear in the statement; the concurrent audit could not satisfy itself that provisioning against NPAs is adequate as per NABARD IRAC norms r/w the CAS Manual and Section 55-A, APCS Act, 1964. The CEO is directed to compute the graded provision required and make good any shortfall.',
  },
  {
    id: 'recapitalisation',
    test: (t) =>
      /recapitalis|\bgrants?\b|contribution from (g\.?o\.?i|state)/.test(t),
    category: 'financial',
    title:
      'Utilisation of Grants / Recapitalisation Assistance — Conditions of Sanction',
    narrative:
      'Grants / Recapitalisation Assistance Fund balances appear in the statement; their utilisation must strictly follow the conditions of sanction and be separately accounted. The concurrent audit could not verify end-use; the CEO is directed to produce utilisation particulars together with the sanction conditions.',
  },
  {
    id: 'suspense',
    test: (t) => /suspense|sundry/.test(t),
    category: 'accounting',
    title: 'Suspense / Sundry Balances Pending Clearance — Section 55-A',
    narrative:
      'Suspense / Sundry balances appear in the statement and are liable to be reviewed and cleared to their correct heads without delay, as their continuance impairs the true and fair view of the accounts (Section 55-A, APCS Act, 1964 r/w the CAS Manual). The CEO is directed to clear the said balances and report compliance.',
  },
];

// Extract the inspection period and a society/branch label, where present.
function extractConcurrentMeta(text, fileName) {
  const t = text || '';
  const periodMatch = t.match(
    /from\s*date\s*:?\s*([0-9][0-9\-\/.]{6,})\s*to\s*([0-9][0-9\-\/.]{6,})/i
  );
  const period = periodMatch
    ? `${periodMatch[1].trim()} to ${periodMatch[2].trim()}`
    : '';
  const branchMatch = t.match(/(?:DCCB\s*)?Branch\s*:?\s*([A-Za-z0-9 .&-]{2,40})/i);
  const branch = branchMatch ? branchMatch[1].trim() : '';
  const base = (fileName || 'Statement').replace(/\.[^.]+$/, '');
  return { period, branch, societyName: base };
}

// Build the auto-detected defect list from extracted statement text.
function analyzeConcurrentAudit(text) {
  const lower = (text || '').toLowerCase();
  const detected = [];
  for (const rule of CONCURRENT_DEFECT_RULES) {
    if (rule.test(lower)) {
      detected.push({
        category: rule.category,
        title: rule.title,
        narrative: rule.narrative,
        source: 'auto',
      });
    }
  }
  // Negative / abnormal closing balances (heuristic: a hyphen-prefixed amount).
  if (/(?:^|\s)-\s?\d[\d,]*\.\d{2}/.test(text || '')) {
    detected.push({
      category: 'financial',
      title: 'Negative / Abnormal Balances Observed — Section 55-A',
      narrative:
        'one or more heads disclose a negative or abnormal closing balance, which ordinarily should not arise and points to a mis-posting or an un-reconciled difference. The CEO is directed to examine and rectify the abnormal balances u/s 54 r/w Section 55-A, APCS Act, 1964.',
      source: 'auto',
    });
  }
  // Always append the concurrent-audit scope reservation.
  detected.push({
    category: 'administrative',
    title: 'Concurrent Audit Scope — Verification on Records Produced',
    narrative:
      'this concurrent audit / periodical inspection has been conducted on the basis of the statement and records produced; non-availability or suppression of primary records may leave irregularities undiscernible and is not attributable to the inspecting officer. Responsibility for the maintenance and production of books rests on the MC and the CEO u/s 55-A r/w Rules 58 & 59, APCS Act, 1964.',
    source: 'auto',
  });
  return detected;
}

// Search corpus: returns top-K page snippets for a query.
// Scoring = sum of term-frequency weighted by inverse keyword length
// boost, with a small bonus for exact phrase match.
function searchLegalCorpus(corpus, query, k = 4) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];
  const phrase = q;
  const tokens = q
    .split(/[^a-z0-9()\-\.]+/)
    .filter((t) => t && t.length >= 2);

  const ranked = [];
  for (const doc of corpus) {
    for (const p of doc.pages) {
      const t = p.text.toLowerCase();
      if (!t) continue;
      let score = 0;
      for (const tk of tokens) {
        const idx = t.indexOf(tk);
        if (idx >= 0) {
          // Weight rare-ish tokens (longer = rarer) higher
          const occ = t.split(tk).length - 1;
          score += occ * Math.max(1, tk.length / 3);
        }
      }
      if (t.includes(phrase)) score += 6;
      if (score > 0) {
        ranked.push({ doc, page: p, score });
      }
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, k);
}

// Build a short snippet from a page around the first matching token.
function buildSnippet(pageText, query, maxLen = 360) {
  const q = (query || '').toLowerCase().trim();
  const lower = pageText.toLowerCase();
  let idx = lower.indexOf(q);
  if (idx < 0) {
    const tokens = q.split(/\W+/).filter((t) => t.length >= 3);
    for (const tk of tokens) {
      const i = lower.indexOf(tk);
      if (i >= 0) {
        idx = i;
        break;
      }
    }
  }
  if (idx < 0) idx = 0;
  const start = Math.max(0, idx - 80);
  const end = Math.min(pageText.length, start + maxLen);
  const slice = pageText.slice(start, end);
  return (start > 0 ? '… ' : '') + slice + (end < pageText.length ? ' …' : '');
}

function classifyDocument(fileName) {
  const norm = normalizeFileName(fileName);
  for (const doc of DOCUMENT_TYPES) {
    if (norm.includes(doc.key)) {
      return { type: doc.type, hasFinancialTable: doc.hasFinancialTable };
    }
  }
  return { type: 'Other / Unclassified', hasFinancialTable: false };
}

/* === AI defect narrative generator =================================
 * Maps the user's title + draft text to a humanised auditor's
 * narrative with relevant Section / Rule / Paragraph citations.
 * Mirrors the concise 3-5 sentence style of the existing defect
 * narratives across B.1/B.2/B.3 categories.
 * ================================================================ */
function generateDefectNarrative(userText, category, mode) {
  // Detect an inline narration-mode trigger ("MODE: HIT" / "/hit" /
  // "MODE: RUN" / "/run") at the start of the note and strip it so the
  // keyword does not leak into the narration. An explicit `mode` argument
  // (from the HIT/RUN toggle) always wins over the typed trigger.
  let effectiveMode = mode || null;
  let cleanedText = (userText || '').trim();
  const trig = cleanedText.match(
    /^\s*(?:\/(hit|run)\b|mode\s*:\s*(hit|run)\b)[\s:.\-—]*/i
  );
  if (trig) {
    if (!effectiveMode) effectiveMode = (trig[1] || trig[2]).toLowerCase();
    cleanedText = cleanedText.slice(trig[0].length).trim();
  }
  const seed = cleanedText.toLowerCase();

  // Citation rules — first match wins per topic
  const topics = [
    {
      keys: ['cash', 'balance', 'retention', 'remit'],
      citations: [
        'Section 55-A of the APCS Act, 1964',
        'Paragraph 6.12.1 of the Audit Manual for PACS',
        "Society's bye-laws",
      ],
      framing:
        'cash retention discipline and prompt remittance to the financing bank',
    },
    {
      keys: ['loan', 'recovery', 'overdue', 'defaulter', 'recovery certificate'],
      citations: [
        'Section 30(xxii) of the APCS Act, 1964',
        'Rule 41(C)(6) of the APCS Rules, 1964',
        'Section 71 of the Act (recovery certificates)',
      ],
      framing:
        'periodical review of overdue loans and timely legal action against defaulters',
    },
    {
      keys: ['interest', 'rate', 'penal', 'iod'],
      citations: [
        'Paragraph 7.5 of the Audit Manual for PACS',
        'Section 55-A of the APCS Act, 1964',
      ],
      framing:
        'application of interest rates and reconciliation of interest collected against the simple-interest baseline',
    },
    {
      keys: ['provision', 'npa', 'irac', 'doubtful', 'sub-standard', 'loss asset'],
      citations: [
        'NABARD IRAC norms on Income Recognition, Asset Classification and Provisioning',
        'Section 55-A of the APCS Act, 1964',
        'the Manual on Chart of Accounts (CAS) for PACS',
      ],
      framing:
        'graded provisioning discipline and prudent recognition of credit risk',
    },
    {
      keys: ['cost of management', 'staff cost', 'salary', 'manpower'],
      citations: [
        'Section 115-D of the APCS Act, 1964',
        'NABARD norms governing Cost of Management of PACS',
      ],
      framing:
        'compliance with the prescribed ceilings on Cost of Management (50%) and Staff Cost (30%) of Total Income',
    },
    {
      keys: ['imbalance', 'asset', 'liability'],
      citations: [
        'Section 115-D of the APCS Act, 1964',
        "NABARD's IRAC norms",
      ],
      framing: 'asset-liability matching and financial soundness',
    },
    {
      keys: ['meeting', 'general body', 'managing committee', 'mc resolution'],
      citations: [
        'Section 30(2) of the APCS Act, 1964',
        'Rule 22 of the APCS Rules, 1964',
        "Society's bye-laws",
      ],
      framing:
        'placement of accounts and audit reports before the General Body',
    },
    {
      keys: ['register', 'book of account', 'ledger', 'voucher', 'authentic'],
      citations: [
        'Section 55-A of the APCS Act, 1964 read with Rules 58 and 59',
        'Paragraph 6.12.2 of the Audit Manual for PACS',
      ],
      framing:
        'maintenance and authentication of prescribed books, registers and vouchers',
    },
    {
      keys: ['budget', 'business plan', 'bdp', 'expenditure'],
      citations: [
        'Section 30 of the APCS Act, 1964',
        "NABARD's viability guidance for PACS",
      ],
      framing:
        'preparation of an approved annual budget and business development plan',
    },
    {
      keys: ['fraud', 'misappropriat', 'embezzle', 'pilfer'],
      citations: [
        'Section 60 of the APCS Act, 1964 (surcharge)',
        'Indian Penal Code and Code of Criminal Procedure',
        'Section 55-A of the Act',
      ],
      framing:
        'safeguarding of Society funds and surcharge action for loss caused',
    },
    {
      keys: ['report', 'audit defect', 'rectification'],
      citations: [
        'Section 50 of the APCS Act, 1964',
        'Section 54 of the Act (Rectification of defects)',
      ],
      framing:
        'rectification of defects noticed in the audit conducted under Section 50',
    },
    {
      keys: ['sundry', 'debtor', 'creditor', 'reconciliation'],
      citations: [
        'Section 55-A of the APCS Act, 1964',
        'the Manual on Chart of Accounts (CAS) for PACS',
        'Paragraph 6.12.2 of the Audit Manual for PACS',
      ],
      framing:
        'reconciliation of Sundry ledgers and integrity of receivable / payable classifications',
    },
    {
      keys: ['share capital', 'reserve fund', 'capital'],
      citations: [
        'Section 45 of the APCS Act, 1964',
        'Rule 36(A) of the APCS Rules, 1964',
        "Society's bye-laws",
      ],
      framing:
        'maintenance and utilisation of share capital and reserve funds',
    },
    {
      keys: ['gst', 'tax', 'tds'],
      citations: [
        'Section 55-A of the APCS Act, 1964',
        'the relevant taxation statutes',
      ],
      framing:
        'statutory tax compliance and timely deposit of TDS / GST',
    },
  ];

  let matched = null;
  for (const t of topics) {
    if (t.keys.some((k) => seed.includes(k))) {
      matched = t;
      break;
    }
  }

  if (!matched) {
    matched = {
      citations: [
        'Section 55-A of the APCS Act, 1964 read with Rules 58 and 59',
        'Paragraph 6.12 of the Audit Manual for PACS',
      ],
      framing: 'sound governance and statutory compliance',
    };
  }

  const categoryFraming = {
    financial:
      'a Financial Irregularity in the affairs of the Society',
    accounting:
      'an Accounting Irregularity in the books and records of the Society',
    administrative:
      'an Administrative Irregularity in the governance of the Society',
  };
  const catLabel = categoryFraming[category] || categoryFraming.financial;

  const escalation =
    'Failure to rectify shall attract direction by the Registrar under Section 54 of the APCS Act, 1964, and surcharge under Section 60 of the Act for any consequential loss to the Society.';

  // Concise auditor's narrative — 3-5 sentences
  const userObservation = cleanedText;
  const opening = userObservation
    ? userObservation
    : 'The Society has failed to maintain the compliance noted below.';
  const cite = matched.citations.join('; ');

  // The factual observation, terminated cleanly for use mid-sentence.
  const obs = userObservation
    ? /[.?!]$/.test(userObservation)
      ? userObservation
      : `${userObservation}.`
    : '';

  // Default (neutral) narration.
  const neutralNarrative = `${opening} This constitutes ${catLabel}, contrary to ${cite}. The defect undermines ${matched.framing}, and exposes the Chief Executive Officer and Managing Committee to responsibility. The Chief Executive Officer is hereby directed to undertake immediate corrective action, document the rectification in the Defect Rectification Register, and produce the rectified position at the next monthly audit. ${escalation}`;

  // MODE: HIT — Strict / Hard-Stop. Prima-facie violation, conclusive and
  // non-equivocal, no mitigating circumstance, concluding with the exact
  // statutory remedy (no penalty quantum, no claim of adjudication).
  const hitNarrative = `The Society has contravened ${cite}.${
    obs ? ` ${obs}` : ''
  } This constitutes ${catLabel} and is a clear violation of the said provision, which admits of no exception in the matter; the act is in direct breach of the statutory mandate and is irregular to that extent. The Chief Executive Officer / Managing Committee responsible is liable for surcharge under Section 60 of the APCS Act, 1964, apart from rectification of the defect under Section 54 of the Act.`;

  // MODE: RUN — Flexible / Running-Action. Interpretable position, notes the
  // carve-out/condition, balanced and advisory, regularisable on production
  // of the requisite record, expressly open to the competent authority.
  const runNarrative = `It is observed that${
    obs
      ? ` ${obs}`
      : ' the Society appears to have deviated from the governing provision noted below.'
  } The governing provision, ${cite}, ordinarily applies subject to the exceptions/conditions stipulated therein — and to any deviation permitted by the bye-laws or sanctioned by the General Body — which on the records produced are not seen to be fulfilled. The matter, being ${catLabel}, is presently noted as irregular and is capable of being regularised upon production of the requisite approval or record (such as the relevant resolution, sanction order or supporting voucher). Pending such clarification, the position is advisory in nature and remains open to interpretation by the competent authority / General Body / Registrar.`;

  const narrative =
    effectiveMode === 'hit'
      ? hitNarrative
      : effectiveMode === 'run'
      ? runNarrative
      : neutralNarrative;

  // ── AUTO-TITLE ── derive the defect heading FROM the narrative/observation,
  // styled like the auto-generated Audit Defects headings: "<Heading> — <Section ref>".
  // The title field was removed from the generator UI; the AI now narrates the title.
  const headingByFraming = {
    'cash retention discipline and prompt remittance to the financing bank':
      'Excess Cash Retention & Delayed Remittance',
    'periodical review of overdue loans and timely legal action against defaulters':
      'Inadequate Recovery & Legal Action on Overdue Loans',
    'application of interest rates and reconciliation of interest collected against the simple-interest baseline':
      'Interest Application & Reconciliation Discrepancy',
    'graded provisioning discipline and prudent recognition of credit risk':
      'IRAC Provisioning Deficiency on NPAs',
    'compliance with the prescribed ceilings on Cost of Management (50%) and Staff Cost (30%) of Total Income':
      'Cost of Management Exceeds Prescribed Ceiling',
    'asset-liability matching and financial soundness':
      'Financial Imbalance — Asset-Liability Mismatch',
    'placement of accounts and audit reports before the General Body':
      'Accounts Not Placed Before General Body',
    'maintenance and authentication of prescribed books, registers and vouchers':
      'Improper Maintenance of Books, Registers & Vouchers',
    'preparation of an approved annual budget and business development plan':
      'Absence of Approved Budget & Business Development Plan',
    'safeguarding of Society funds and surcharge action for loss caused':
      'Suspected Misappropriation of Society Funds',
    'rectification of defects noticed in the audit conducted under Section 50':
      'Non-Rectification of Audit Defects',
    'reconciliation of Sundry ledgers and integrity of receivable / payable classifications':
      'Unreconciled Sundry Debtors / Creditors',
    'maintenance and utilisation of share capital and reserve funds':
      'Share Capital & Reserve Fund Irregularity',
    'statutory tax compliance and timely deposit of TDS / GST':
      'Statutory Tax / TDS Non-Compliance',
  };

  // Short statutory tag, e.g. "Section 115-D", "Rule 41(C)(6)", "Para 6.12.1".
  const shortCite = (c) => {
    const m = c.match(
      /^(Section\s+[\w().-]+|Rule\s+[\w().-]+|Paragraph\s+[\d.]+)/i
    );
    if (m) return m[1].replace(/^Paragraph/i, 'Para');
    if (/NABARD/i.test(c)) return 'NABARD norms';
    return c.split(' of ')[0];
  };

  // Fallback heading for novel/unmatched defects: distil it from the narration.
  const deriveSubject = (text) => {
    let s = (text || '').trim().replace(/\s+/g, ' ');
    s = s.split(/(?<=[.!?])\s/)[0].replace(/[.;:,]+$/, '');
    if (s.length > 72) s = s.slice(0, 72).replace(/\s+\S*$/, '') + '…';
    return s
      ? s.charAt(0).toUpperCase() + s.slice(1)
      : 'Statutory & Governance Compliance Lapse';
  };

  const heading =
    headingByFraming[matched.framing] || deriveSubject(userObservation);
  const title = `${heading} — ${shortCite(matched.citations[0])}`;

  return {
    title,
    narrative,
    citations: matched.citations,
    mode: effectiveMode,
  };
}

/* === REQUIRED FILES SPEC ============================================
 * Items 1-12: named documents
 * Item 13: Schedule -I, Schedule -2 to 21, Schedule -21A to G, Schedule No-22
 * Item 14: Annexure -I, Annexure -2 to 12
 * Each entry has a regex that runs against the lowercased filename.
 * ==================================================================== */
const REQUIRED_FILES = (() => {
  const list = [
    { name: 'AuditIndex', re: /auditindex/i },
    { name: 'Name and Address of the Society', re: /name\s*(and|&)\s*address\s*of\s*the\s*society/i },
    { name: 'Final Audit Report', re: /final\s*audit\s*report/i },
    { name: 'Receipts and Payments', re: /receipts\s*(and|&)\s*payments/i },
    { name: 'Trail Balance', re: /trail\s*balance/i },
    { name: 'Trading Account', re: /trading\s*account/i },
    { name: 'Profit and Loss Account', re: /profit\s*(and|&)\s*loss\s*account(?!\s*appropriation)/i },
    { name: 'Profit and Loss Appropriation', re: /profit\s*(and|&)\s*loss\s*appropriation/i },
    { name: 'Balance Sheet', re: /balance\s*sheet/i },
    { name: 'Soundness Certificate', re: /soundness\s*certificate/i },
    { name: 'Audit Rating and Classification', re: /audit\s*rating(\s*(and|&)\s*classification)?/i },
    { name: 'Defect Sheet', re: /defect\s*sheet/i },
  ];

  // Schedule -I (Roman 1)
  list.push({
    name: 'Schedule -I',
    re: /schedule[\s\-]*i(?![a-z0-9])/i,
  });
  // Schedule -2 to -21
  for (let i = 2; i <= 21; i++) {
    list.push({
      name: `Schedule -${i}`,
      re: new RegExp(`schedule[\\s\\-]*${i}(?![0-9a-g])`, 'i'),
    });
  }
  // Schedule -21A to -21G
  for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    list.push({
      name: `Schedule -21${letter}`,
      re: new RegExp(`schedule[\\s\\-]*21${letter}(?![a-z0-9])`, 'i'),
    });
  }
  // Schedule No-22
  list.push({
    name: 'Schedule No-22',
    re: /schedule\s*no[\s\-]*22(?![0-9])/i,
  });

  // Annexure -I (Roman 1)
  list.push({
    name: 'Annexure -I',
    re: /annexure[\s\-]*i(?![a-z0-9])/i,
  });
  // Annexure -2 to -12
  for (let i = 2; i <= 12; i++) {
    list.push({
      name: `Annexure -${i}`,
      re: new RegExp(`annexure[\\s\\-]*${i}(?![0-9])`, 'i'),
    });
  }

  return list;
})();

function computeMissingRequired(uploadedFileNames) {
  const lowered = uploadedFileNames.map((n) => n.toLowerCase());
  return REQUIRED_FILES.filter(
    (req) => !lowered.some((fn) => req.re.test(fn))
  ).map((req) => req.name);
}

function LogoMark() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <div className="relative overflow-hidden rounded-[28px] shadow-[0_0_60px_rgba(52,211,153,0.45)] backdrop-blur-xl">
        <img
          src={logoImage}
          alt="COOP - AUDIT AI Logo"
          className="block w-full max-w-[230px] h-auto rounded-[28px]"
        />
      </div>
    </div>
  );
}

function MiniCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-[0_0_25px_rgba(52,211,153,0.12)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-cyan-200/80 text-sm font-semibold uppercase tracking-[0.15em]">
          {title}
        </div>

        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      <div className="text-xl font-black text-white tracking-wide">
        {value}
      </div>
    </div>
  );
}

export default function APCooperativeFinancialAnalyser() {
  const [loading, setLoading] = useState(false);
  const [detectedFiles, setDetectedFiles] = useState([]);
  const [auditResults, setAuditResults] = useState([]);
  const [societyName, setSocietyName] = useState('');
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [allFilesUploaded, setAllFilesUploaded] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] =
    useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  // ----- Admin login gate (client-side only) -----
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // ---------- Binary-encoded admin credentials (obfuscation, not security) ----------
// Username: "USER"  -> 01010101 01010011 01000101 01010010
// Password: "Pass@123" -> 01010000 01100001 01110011 01110011 01000000 00110001 00110010 00110011
// (Whitespace inside the strings is ignored at compare time; line breaks are fine.)
const ADMIN_USER_BIN = '01010101 01010011 01000101 01010010';
const ADMIN_PASS_BIN =
  '01010000 01100001 01110011 01110011' +
  ' 01000000 00110001 00110010 00110011';

// Convert a JS string to its binary representation (UTF-8 bytes, 8 bits each).
// Returns space-separated 8-bit groups to match ADMIN_PASS_BIN format above.
function textToBinary(text) {
  if (text == null) return '';
  // Encode as UTF-8 bytes first so non-ASCII characters stay stable.
  const bytes = new TextEncoder().encode(String(text));
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0) out += ' ';
    out += bytes[i].toString(2).padStart(8, '0');
  }
  return out;
}

// Normalise both sides: strip all whitespace, lowercase hex isn't relevant here
// (we compare bit-strings), but we do trim to avoid trailing-space false negatives.
function normaliseBinary(s) {
  return String(s).replace(/\s+/g, '').toLowerCase();
}

function checkBinaryCredentials(userInput, passInput) {
  const u = normaliseBinary(textToBinary(userInput));
  const p = normaliseBinary(textToBinary(passInput));
  const eu = normaliseBinary(ADMIN_USER_BIN);
  const ep = normaliseBinary(ADMIN_PASS_BIN);
  return u === eu && p === ep;
}

function handleLogin(e) {
  if (e) e.preventDefault();
  if (checkBinaryCredentials(loginUser, loginPass)) {
    setIsAuthenticated(true);
    setLoginError('');
  } else {
    setLoginError('Invalid username or password.');
  }
}

  function handleLoginReset() {
    setLoginUser('');
    setLoginPass('');
    setLoginError('');
  }

  const [missingFiles, setMissingFiles] = useState([]);
  const [fileTableData, setFileTableData] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [auditNarratives, setAuditNarratives] = useState([]);
  const [cashBookReport, setCashBookReport] = useState(null);
  const [cashBookError, setCashBookError] = useState('');
  const [cashBookProcessing, setCashBookProcessing] = useState(false);
  const [cashBalanceThreshold, setCashBalanceThreshold] =
    useState('500');
  const [cashBookAnalysis, setCashBookAnalysis] = useState(null);
  const [cashBookIncludeInDefects, setCashBookIncludeInDefects] =
    useState(false);
  const [loanRecoveryReports, setLoanRecoveryReports] = useState([]);
  const [loanRecoveryError, setLoanRecoveryError] = useState('');
  const [loanRecoveryProcessing, setLoanRecoveryProcessing] =
    useState(false);
  const [loanRecoveryAnalyses, setLoanRecoveryAnalyses] = useState(
    []
  );
  const [loanRecoveryIncludeMap, setLoanRecoveryIncludeMap] =
    useState({});
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      content:
        "Welcome to COOP-AUDIT AI - LEGAL CHAT. Ask me about APCS Act & Rules, 1964 and also Case Laws for reference.",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  // ----- Live AI (Google Gemini) key, editable from the chat UI -----
  const [aiKey, setAiKey] = useState(() => getGeminiKey());
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [aiKeyDraft, setAiKeyDraft] = useState('');
// ---- AI Key Test panel (live API vs. offline fallback) ----
const [aiTestRunning, setAiTestRunning] = useState(false);
const [aiTestResult, setAiTestResult] = useState(null);
// shape: { mode: 'live' | 'offline' | 'error', ms: number, text: string, error?: string, question: string }
const [aiTestQuestion, setAiTestQuestion] = useState(
  'What is the surcharge procedure under Section 60 of the APCS Act, 1964, and how is the amount recovered?'
);

async function runAiKeyTest() {
  const q = aiTestQuestion.trim();
  if (!q) return;
  setAiTestRunning(true);
  setAiTestResult(null);

  const t0 = performance.now();
  const liveKey = hasGeminiKey();

  if (!liveKey) {
    // Offline path: call the same fallback the chat uses
    try {
      const { text } = answerWithCorpus(q);
      const ms = Math.round(performance.now() - t0);
      setAiTestResult({
        mode: 'offline',
        ms,
        text: text.slice(0, 600) + (text.length > 600 ? '…' : ''),
        question: q,
        note: 'No API key found. Result is from the offline reference engine (LEGAL_KB + bundled PDF corpus if indexed).',
      });
    } catch (e) {
      setAiTestResult({
        mode: 'error',
        ms: Math.round(performance.now() - t0),
        text: '',
        question: q,
        error: e.message || String(e),
      });
    }
    setAiTestRunning(false);
    return;
  }

  // Live path: call the same two-pass agent the chat uses
  try {
    const { text } = await generateLegalAgentAnswer(q, []);
    const ms = Math.round(performance.now() - t0);
    setAiTestResult({
      mode: 'live',
      ms,
      text: text.slice(0, 600) + (text.length > 600 ? '…' : ''),
      question: q,
    });
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const isNoKey = e && e.code === 'NO_API_KEY';
    setAiTestResult({
      mode: isNoKey ? 'offline' : 'error',
      ms,
      text: '',
      question: q,
      error: isNoKey
        ? 'Key disappeared between check and call — try saving again.'
        : (e.message || String(e)).slice(0, 300),
    });
  }
  setAiTestRunning(false);
}

  function saveAiKey() {
    const v = aiKeyDraft.trim();
    try {
      if (v) localStorage.setItem('COOP_GEMINI_KEY', v);
      else localStorage.removeItem('COOP_GEMINI_KEY');
    } catch (_) {
      /* localStorage unavailable */
    }
    setAiKey(v);
    setAiKeyDraft('');
    setShowKeyPanel(false);
  }

  function clearAiKey() {
    try {
      localStorage.removeItem('COOP_GEMINI_KEY');
    } catch (_) {
      /* ignore */
    }
    setAiKey('');
    setAiKeyDraft('');
  }
  const [customDefects, setCustomDefects] = useState([]);
  const [customDefectDraft, setCustomDefectDraft] = useState({
    category: 'financial',
    title: '',
    narrative: '',
  });
  const [defectPreview, setDefectPreview] = useState(null); // { title, category, aiNarrative, citations }

  // ----- Concurrent Audit / Periodical Inspection -----
  const [concurrentFileName, setConcurrentFileName] = useState('');
  const [concurrentMeta, setConcurrentMeta] = useState(null); // { period, branch, societyName }
  const [concurrentDetected, setConcurrentDetected] = useState([]); // auto-found defects
  const [concurrentCustom, setConcurrentCustom] = useState([]); // user-added defects
  const [concurrentProcessing, setConcurrentProcessing] = useState(false);
  const [concurrentError, setConcurrentError] = useState('');
  const [concurrentDraft, setConcurrentDraft] = useState({
    category: 'financial',
    narrative: '',
  });
  const [concurrentPreview, setConcurrentPreview] = useState(null);

  // Legal reference corpus — bundled PDFs + user-uploaded references.
  // corpusStatus: 'idle' | 'loading' | 'ready' | 'error'
  const [corpus, setCorpus] = useState([]); // [{ id, name, pages: [{n, text}], source: 'bundled' | 'user' }]
  const [corpusStatus, setCorpusStatus] = useState('idle');
  const [corpusProgress, setCorpusProgress] = useState({
    done: 0,
    total: 0,
  });

  const financials = useMemo(() => {
    const normalizedDetected = detectedFiles.map(normalizeFileName);

    const exists = (keywords) => {
      return normalizedDetected.some((file) =>
        keywords.some((keyword) => file.includes(keyword))
      )
        ? 'Available'
        : 'Missing';
    };

    return {
      receiptsAndPayments: exists(['receiptsandpayments']),
      trailBalance: exists(['trailbalance']),
      tradingAccount: exists(['tradingaccount']),
      profitAndLossAccount: exists(['profitandlossaccount']),
      profitAndLossAppropriation: exists([
        'profitandlossappropriation',
      ]),
      balanceSheet: exists(['balancesheet']),
      auditIndex: exists(['auditindex']),
      nameAddressSociety: exists([
        'nameandaddressofthesociety',
      ]),
      finalAuditReport: exists(['finalauditreport']),
      soundnessCertificate: exists(['soundnesscertificate']),
      auditRatingClassification: exists([
        'auditratingandclassification',
      ]),
    };
  }, [detectedFiles]);

  const statementRows = useMemo(
    () => [
      {
        key: 'rp',
        label: 'Receipts & Payments',
        status: financials.receiptsAndPayments,
        icon: Receipt,
        iconColor: 'text-cyan-300',
        accent: 'cyan',
      },
      {
        key: 'tb',
        label: 'Trail Balance',
        status: financials.trailBalance,
        icon: Table2,
        iconColor: 'text-emerald-300',
        accent: 'emerald',
      },
      {
        key: 'ta',
        label: 'Trading Account',
        status: financials.tradingAccount,
        icon: Scale,
        iconColor: 'text-orange-300',
        accent: 'orange',
      },
      {
        key: 'pl',
        label: 'P & L Account',
        status: financials.profitAndLossAccount,
        icon: Scale,
        iconColor: 'text-yellow-300',
        accent: 'yellow',
      },
      {
        key: 'pla',
        label: 'P & L Appropriation',
        status: financials.profitAndLossAppropriation,
        icon: Scale,
        iconColor: 'text-pink-300',
        accent: 'pink',
      },
      {
        key: 'bs',
        label: 'Balance Sheet',
        status: financials.balanceSheet,
        icon: Landmark,
        iconColor: 'text-violet-300',
        accent: 'violet',
      },
    ],
    [financials]
  );

  const availableCount = statementRows.filter(
    (row) => row.status === 'Available'
  ).length;

  const talliedCount = auditResults.filter((r) => r.tallied).length;

  /* ============================================================
   * COMPREHENSIVE AUDIT DEFECT SHEET
   * --------------------------------------------------------
   * Synthesises every available signal (financial tallies,
   * missing files, Annexure-8 & 11 extractions) into a formal
   * Auditor's Observation Document with statute citations.
   * Voice: Lead Senior Statutory Auditor (APCS Act 1964).
   * ========================================================== */
  const defectSheet = useMemo(() => {
    if (auditResults.length === 0 && detectedFiles.length === 0) {
      return null;
    }

    const merits = [];
    const demerits = [];

    const fmt = (n) =>
      n.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    // 1) SUBMISSION OF STATUTORY RECORDS — Section 55-A r/w Rules 58, 59
    if (missingFiles.length === 0 && detectedFiles.length > 0) {
      merits.push({
        title:
          'Complete Submission of Statutory Records',
        narrative: `All prescribed financial statements, schedules and annexures produced for verification — compliant with Section 55-A, APCS Act, 1964 r/w Rules 58 & 59. Record-keeping commended.`,
      });
    } else if (missingFiles.length > 0) {
      demerits.push({
        category: 'accounting',
        title:
          'Non-Production of Statutory Reports & Loan Files — Para 7.1, Audit Manual r/w Section 55-A',
        narrative: `${missingFiles.length} of the prescribed report${
          missingFiles.length === 1 ? '' : 's'
        } could not be generated from the ERP system and ${
          missingFiles.length === 1 ? 'was' : 'were'
        } therefore not available for verification. More importantly, the Society did not place before the audit the loan files and loan ledgers, the sanction proceedings, the security and mortgage documents, or the connected subsidiary registers. In their absence, the audit could not satisfy itself as to the genuineness of the loans disbursed, the eligibility and creditworthiness of the borrowers, the rate of interest charged, the adequacy of the security held, or the present recovery position. Keeping and producing these books and records is the responsibility of the MC and the CEO under Section 55-A, APCS Act, 1964 (r/w Rules 58 & 59) and Para 7.1 of the Audit Manual for PACS. The CEO is requested to place the complete set of statutory reports, together with all loan files and connected records, before the next audit. Until that is done the audit stands qualified to this extent, and continued non-production may invite directions u/s 54 and surcharge u/s 60 of the Act for any loss caused to the Society.`,
      });
    }

    // 2) Per-statement mismatch demerits — Section 50 + 55-A + CAS Manual
    const mismatched = auditResults.filter((r) => !r.tallied);
    mismatched.forEach((r) => {
      demerits.push({
        category: 'accounting',
        title: `${r.statementType} — Non-Tallying`,
        narrative: `Discrepancy of ₹${fmt(r.difference)} between ${r.label1} (₹${fmt(r.amount1)}) and ${r.label2} (₹${fmt(r.amount2)}). Breach of CAS Manual and Section 55-A, APCS Act, 1964. CEO directed u/s 54 to reconcile and submit corrected statement.`,
      });
    });

    // 3b) TRAIL BALANCE — Module–FAS differences parked under named product heads (e-Audit SOP, Auditor Login)
    const hasTrailBalance =
      auditResults.some((r) => r.statementType === 'Trail Balance') ||
      detectedFiles.some(
        (f) => /trail\s*balance/i.test(f?.label || f?.name || '')
      );
    if (hasTrailBalance) {
      demerits.push({
        category: 'financial',
        title:
          'Un-Reconciled "Parking" Balances Not Cleared — CC&RCS SOP dt. 20.08.2024',
        narrative: `Module–FAS differences under the named product heads (Share Capital, Deposits, Loans) stand parked as un-reconciled "Parking Accounts" in the Trail Balance and remain unverified. Per CC&RCS Memo No. AGC06-12021/2/2019-PMC SEC-CCRCS dt. 20.08.2024 (Operational Guidelines for Creation of Un-Reconciled / Parking Accounts) r/w SOP for Clearing Parking Balances (File No. AGC06-13/6/2024-PAC SEC-CCRCS), such balances must be investigated, reconciled and cleared to their proper GL heads at the earliest, with prior-year closing TB tallied to current-year opening TB. CEO directed u/s 54 r/w Section 55-A, APCS Act, 1964 to reconcile and clear the parked differences before finalisation of accounts.`,
      });
    }

    // 4) ANNEXURE-8 (Total Income / Cost of Management) — Section 115-D
    const annex8 = auditNarratives.find((n) => n.key === 'annexure8');
    const annex8Pct = auditNarratives.find(
      (n) => n.key === 'annexure8Pct'
    );
    const annex8PctDemerit = !!(
      annex8Pct && annex8Pct.status === 'demerit'
    );
    // Positive Total Income is a MERIT only when the Section 115-D
    // eligibility ratios are also within limits. If Staff Cost / COM exceed
    // their ceilings, the positive income is merely the base on which the
    // breach is measured — it is reported inside the demerit, not celebrated
    // as a standalone merit.
    if (annex8 && annex8.status === 'merit' && !annex8PctDemerit) {
      merits.push({
        title:
          'Positive Total Income — Annexure-8 (Section 115-D Base)',
        narrative: annex8.narrative,
      });
    }
    // NOTE: the Annexure-8 Section 115-D demerit is MERGED with the
    // Annexure-8 % (Staff Cost / COM ratio) check below into a single
    // Cost-of-Management demerit — both flag the same Section 115-D defect.

    // 5) ANNEXURE-11 (Legal Action Coverage) — Section 30(xxii) + Rule 41(C)(6)
    const annex11 = auditNarratives.find((n) => n.key === 'annexure11');
    if (annex11 && annex11.status === 'merit') {
      merits.push({
        title:
          'Recovery & Legal Action — Adequate Coverage',
        narrative: annex11.narrative,
      });
    } else if (annex11 && annex11.status === 'demerit') {
      demerits.push({
        category: 'administrative',
        title:
          'Inadequate Legal Action on Overdues — Section 30(xxii) r/w Rule 41(C)(6)',
        narrative: annex11.narrative,
      });
    }

    // 5b) ANNEXURE-8 PERCENTAGE — Staff Cost % / COM % (annex8Pct declared in §4)
    if (annex8Pct && annex8Pct.status === 'merit') {
      merits.push({
        title:
          'Staff Cost & COM Ratios — Within Norms',
        narrative: annex8Pct.narrative,
      });
    }

    // MERGED Section 115-D / Cost-of-Management demerit:
    // Annexure-8 (absolute COM vs Total Income) and Annexure-8 % (Staff
    // Cost / COM ratios) both address the same Section 115-D defect, so
    // they are reported as ONE concise demerit (was two duplicate items).
    const com115Parts = [
      annex8 && annex8.status === 'demerit' ? annex8.narrative : null,
      annex8Pct && annex8Pct.status === 'demerit'
        ? annex8Pct.narrative
        : null,
    ].filter(Boolean);
    if (com115Parts.length > 0) {
      demerits.push({
        category: 'financial',
        title:
          'Cost of Management Exceeds Norms — Section 115-D',
        narrative: com115Parts.join(' '),
      });
    }

    // 5c) ANNEXURE-5 — Financial Imbalance (A − B)
    const annex5 = auditNarratives.find((n) => n.key === 'annexure5');
    if (annex5 && annex5.status === 'merit') {
      merits.push({
        title:
          'Annexure-5 — No Financial Imbalance',
        narrative: annex5.narrative,
      });
    } else if (annex5 && annex5.status === 'demerit') {
      demerits.push({
        category: 'financial',
        title:
          'Financial Imbalance — Annexure-5',
        narrative: annex5.narrative,
      });
    }

    // 5d) SCHEDULE-9 — Provisions on NPAs
    const sched9 = auditNarratives.find((n) => n.key === 'schedule9');
    if (sched9 && sched9.status === 'merit') {
      merits.push({
        title:
          'Schedule-9 — NABARD IRAC Provisioning Adequate',
        narrative: sched9.narrative,
      });
    } else if (sched9 && sched9.status === 'demerit') {
      demerits.push({
        category: 'accounting',
        title:
          'Schedule-9 — IRAC Provisioning Deficiency',
        narrative: sched9.narrative,
      });
    }

    // 5e) BALANCE SHEET — Sundry Debtors & Sundry Creditors
    const sdc = auditNarratives.find(
      (n) => n.key === 'sundryDebtorsCreditors'
    );
    if (sdc && sdc.status === 'demerit') {
      demerits.push({
        category: 'accounting',
        title:
          'Sundry Debtors/Creditors — Negative Closing Balance (Section 55-A)',
        narrative: sdc.narrative,
      });
    }

    // 5e-bis) SCHEDULE-16B — Sundry Debtors aged > 3 years
    // Single, concise entry (the earlier duplicate financial demerit was removed).
    // Two parsers can emit a 'schedule16b' narrative for the same file; if EITHER
    // detects dues above 3 years (a demerit), that must win over a "no dues" merit
    // — otherwise genuine non-realisable balances get wrongly reported as clean.
    const sch16bAll = auditNarratives.filter(
      (n) => n.key === 'schedule16b'
    );
    const sch16b =
      sch16bAll.find((n) => n.status === 'demerit') || sch16bAll[0];
    if (sch16b && sch16b.status === 'merit') {
      merits.push({
        title:
          'Schedule-16B — No Dues Beyond 3 Years',
        narrative: sch16b.narrative,
      });
    } else if (sch16b && sch16b.status === 'demerit') {
      const above3 = sch16b.above3Total || sch16b.metricValue || '';
      demerits.push({
        category: 'financial',
        title:
          'Schedule-16B — Non-Realisable Sundry Debtors (>3 Years), Section 30(xxii) r/w Rule 41(C)(6)',
        narrative: `Schedule-16B (Sundry Debtors) discloses ${above3} under "Due from above 3 years — No scope for realization (100%)". Being time-barred/irrecoverable, these dues require 100% provision in Schedule-9 per the CAS Manual r/w NABARD IRAC norms; their non-recovery is a material defect u/s 30(xxii), APCS Act, 1964 r/w Rule 41(C)(6) and Section 55-A. The CEO is directed u/s 54 to pursue recovery/legal action, create full provisioning, place the matter before the Managing Committee for write-off of irrecoverable items, and report rectification at the next audit.`,
      });
    }

    // 5f) CASH BOOK — Bye-law cash retention compliance (opt-in by user)
    if (
      cashBookIncludeInDefects &&
      cashBookAnalysis &&
      cashBookAnalysis.rows.length > 0
    ) {
      const fmtR = (v) =>
        `₹${v.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      if (cashBookAnalysis.nonCompliantDays === 0) {
        merits.push({
          title:
            'Cash Retention — Within Bye-law Limit',
          narrative: `Cash on Hand remained within the bye-law limit of ${fmtR(cashBookAnalysis.threshold)} on all ${cashBookAnalysis.totalDays} day(s) audited. Compliance with Para 6.12.1, Audit Manual. Commended.`,
        });
      } else {
        demerits.push({
          category: 'financial',
          title:
            'Excess Cash Retention — Interest Penalty @ 12% p.a.',
          narrative: `Cash on Hand exceeded bye-law limit of ${fmtR(cashBookAnalysis.threshold)} on ${cashBookAnalysis.nonCompliantDays} of ${cashBookAnalysis.totalDays} day(s); peak ${fmtR(cashBookAnalysis.highestCB)} on ${cashBookAnalysis.highestDate}. Notional interest on excess: ${fmtR(cashBookAnalysis.totalInterest)}. Violation of Para 6.12.1, Audit Manual. CEO directed to remit excess cash promptly; surcharge u/s 60 may be examined.`,
        });
      }
    }

    // 5g) LOAN RECOVERIES — per-file opt-in with file name as heading
    if (loanRecoveryAnalyses.length > 0) {
      const fmtR2 = (v) =>
        `₹${v.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      loanRecoveryAnalyses.forEach((a) => {
        if (!loanRecoveryIncludeMap[a.fileName]) return;
        const isMerit = Math.abs(a.netDiscrepancy) < 1;
        if (isMerit) {
          merits.push({
            title: `Loan Recoveries — ${a.fileName} — Interest Tallied`,
            narrative: `Interest verification of "${a.fileName}" against simple-interest baseline: ${a.records.length} record(s), Expected ${fmtR2(a.totalExpected)} vs Actual ${fmtR2(a.totalActual)}, discrepancy ${fmtR2(a.netDiscrepancy)}. CAS Manual compliant. Commended.`,
          });
        } else {
          demerits.push({
            category: 'financial',
            title: `Loan Recoveries — ${a.fileName} — Interest Discrepancy`,
            narrative: `Interest verification of "${a.fileName}": discrepancy of ${fmtR2(a.netDiscrepancy)} across ${a.records.length} record(s) — Expected ${fmtR2(a.totalExpected)} vs Actual ${fmtR2(a.totalActual)}. ${a.netDiscrepancy > 0 ? 'Excess suggests hidden penal/overdue interest.' : 'Shortfall suggests under-recovery.'} Breach of CAS Manual and Section 55-A, APCS Act, 1964. CEO directed to reconcile u/s 54.`,
          });
        }
      });
    }

    // 6) STANDARD RECURRING DEMERITS (per Audit Manual & APCS Act)

    // 6-zero) AUDITOR'S SCOPE RESERVATION
    demerits.push({
      category: 'administrative',
      title:
        "Auditor's Scope Reservation — Sections 50, 55-A, 60, APCS Act, 1964",
      narrative: `Audit conducted u/s 50, APCS Act, 1964 based on records produced by the Society. Non-availability of primary records, suppression of facts, or absence of vouchers may leave irregularities undiscernible — not attributable to the auditor. Responsibility for maintenance and production of books rests on the Managing Committee and CEO u/s 55-A r/w Rules 58 & 59. Subsequent discovery of misappropriation or fraud attracts surcharge u/s 60 and directions u/s 54.`,
    });

    // 6-pre) Scope limitation on interest verification
    demerits.push({
      category: 'administrative',
      title:
        'Interest Verification — Scope Limitation (Para 7.4 & 7.5, Audit Manual)',
      narrative: `Interest on loans not verified with full assurance: (a) interest component editable beyond Secretary/System Administrator (Para 7.4), (b) audit-trail log of rate changes not produced (Para 7.5). CEO personally responsible for any resulting loss; surcharge u/s 60 applicable. Managing Committee directed to restrict editing access and produce audit log.`,
    });

    // 6a) GB discussion — Section 30, Rule 22
    demerits.push({
      category: 'administrative',
      title:
        'Accounts Not Placed Before General Body — Section 30(2) r/w Rule 22',
      narrative: `Annual accounts, audit reports and defaulters' list not demonstrated as placed before the General Body u/s 30(2) r/w Rule 22. Managing Committee to convene GB, record resolutions and produce minute book; non-compliance attracts Section 50(5).`,
    });

    // 6c+6d) Managing Committee governance
    demerits.push({
      category: 'administrative',
      title:
        'Absence of BDP, Annual Budget & Defect Rectification Register — Sections 30, 54',
      narrative: `No Business Development Plan or GB-approved annual budget prepared — violation of Section 30, APCS Act and NABARD viability norms. Defect Rectification Register not maintained — violation of Section 54. Managing Committee directed to prepare BDP, annual budget, and maintain Defect Rectification Register for production at next audit.`,
    });

    // 7) USER-ADDED CUSTOM DEFECTS — appended at the END so they
    //    fall AFTER the auto-generated defects within their respective
    //    B.1 / B.2 / B.3 categories.
    customDefects.forEach((d) => {
      demerits.push({
        category: d.category,
        title: d.title,
        narrative: d.narrative,
      });
    });

    // ── EXPAND ABBREVIATIONS ── render the observation sheet in complete
    // terms: spell out short forms on first use as "Full Form (ABBR)" and
    // expand common legal contractions, across every merit/demerit narrative.
    const ABBR_GLOSSARY = [
      [
        'CC&RCS',
        'Commissioner for Cooperation & Registrar of Coop. Societies, A.P., Guntur',
      ],
      ['CEO', 'Chief Executive Officer'],
      ['GB', 'General Body'],
      ['MC', 'Managing Committee'],
      ['PACS', 'Primary Agricultural Credit Society'],
      ['APCS', 'Andhra Pradesh Cooperative Societies'],
      ['ERP', 'Enterprise Resource Planning'],
      ['FAS', 'Financial Accounting System'],
      ['DCT', 'Digital Capture Tool'],
      ['TB', 'Trail Balance'],
      ['BDP', 'Business Development Plan'],
      ['KYC', 'Know Your Customer'],
      ['NABARD', 'National Bank for Agriculture and Rural Development'],
      ['COM', 'Cost of Management'],
      ['SOP', 'Standard Operating Procedure'],
      ['GST', 'Goods and Services Tax'],
      ['TDS', 'Tax Deducted at Source'],
      ['NPA', 'Non-Performing Asset'],
    ];
    const expandAbbr = (text) => {
      if (!text) return text;
      let out = text
        .replace(/\bu\/s\b/gi, 'under Section')
        .replace(/\br\/w\b/gi, 'read with')
        .replace(/\bdt\.\s*/gi, 'dated ')
        .replace(/\bPara\b/g, 'Paragraph');
      for (const [abbr, full] of ABBR_GLOSSARY) {
        const esc = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?<![\\w&])${esc}(s)?(?![\\w&])`, 'g');
        // First standalone mention → "Full (ABBR)"; later mentions → "Full".
        // If the full form is already written out, every mention → "Full".
        let definePending = !out.includes(full);
        out = out.replace(re, (m, s) => {
          const sfx = s || '';
          if (definePending) {
            definePending = false;
            return `${full}${sfx} (${abbr}${sfx})`;
          }
          return `${full}${sfx}`;
        });
      }
      return out;
    };
    // ── UNIFORM OPENING ── every merit/demerit narrative opens with the
    // auditor's standard observation phrase. The original opening letter is
    // lower-cased so it flows after the phrase, unless it begins with a
    // proper noun / acronym (e.g. "Annexure-8", "Schedule-16B", "Module–FAS",
    // "APCS"). A leading "It is observed that" in the body is stripped to
    // avoid duplication (e.g. RUN-mode custom defects).
    const prependObservation = (text) => {
      if (!text) return text;
      let core = text.trim();
      if (/^during the year under audit/i.test(core)) return text;
      core = core.replace(/^it is observed that[,:]?\s+/i, '');
      const firstWord = core.split(/\s+/)[0] || '';
      const isProperNoun =
        /[-–—]/.test(firstWord) ||
        /^[A-Z]{2,}/.test(firstWord) ||
        /^[A-Z][a-z]+[A-Z]/.test(firstWord);
      const body = isProperNoun
        ? core
        : core.charAt(0).toLowerCase() + core.slice(1);
      return `During the year under audit, it is observed that, ${body}`;
    };
    const expandList = (arr) =>
      arr.map((x) => ({
        ...x,
        narrative: expandAbbr(prependObservation(x.narrative)),
      }));

    // Compile audit date and society
    const today = new Date();
    const auditDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    return {
      societyName: societyName || 'Society',
      auditDate,
      merits: expandList(merits),
      demerits: expandList(demerits),
    };
  }, [
    auditResults,
    detectedFiles,
    missingFiles,
    auditNarratives,
    societyName,
    cashBookAnalysis,
    cashBookIncludeInDefects,
    loanRecoveryAnalyses,
    loanRecoveryIncludeMap,
    customDefects,
  ]);

  const documentRows = useMemo(() => {
    // Extract leading serial number (e.g. "08.Receipts..." → 8,
    // "28.SCHEDULE..." → 28). Files without a leading number sort to
    // the end, then alphabetically.
    const extractSerial = (name) => {
      // strip any leading path
      const base = name.split('/').pop() || name;
      const match = base.match(/^\s*(\d+)/);
      return match ? parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
    };

    const rows = detectedFiles.map((fileName) => {
      const { type, hasFinancialTable } = classifyDocument(fileName);

      // "Financial Table Data" status is determined by actually scanning
      // the PDF text during processZIP: if 3+ Indian-format amounts were
      // found, the file contains tabular financial data.
      const hasTableData = fileTableData[fileName] === true;

      const auditEntry = auditResults.find(
        (r) => r.fileName === fileName
      );

      let financialDataStatus;
      if (
        auditEntry &&
        auditEntry.amount1 > 0 &&
        auditEntry.amount2 > 0
      ) {
        financialDataStatus = 'Verified';
      } else if (hasTableData) {
        financialDataStatus = 'Available';
      } else {
        financialDataStatus = 'N/A';
      }

      return {
        fileName,
        type,
        hasFinancialTable,
        financialDataStatus,
        serial: extractSerial(fileName),
      };
    });

    rows.sort((a, b) => {
      if (a.serial !== b.serial) return a.serial - b.serial;
      return a.fileName.localeCompare(b.fileName);
    });

    return rows;
  }, [detectedFiles, auditResults, fileTableData]);

  async function processZIP(file) {
    // Validate file extension
    if (!/\.zip$/i.test(file.name)) {
      alert('Only ZIP files are allowed.');
      return;
    }

    // Enforce 75 MB upload limit
    const MAX_BYTES = 75 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(
        `File too large (${sizeMB} MB). Maximum allowed is 75 MB.`
      );
      return;
    }

    const zipName = file.name.replace(/\.zip$/i, '');

    setSocietyName(zipName);

    try {
      setLoading(true);
      setDetectedFiles([]);
      setAuditResults([]);
      setUploadStatusMessage('');
      setAllFilesUploaded(false);
      setMissingFiles([]);
      setFileTableData({});
      setAuditNarratives([]);
      setCurrentProcessingFile('');
      setProcessedCount(0);
      setTotalCount(0);
      setCurrentStage('Reading ZIP archive…');

      const zip = await JSZip.loadAsync(file);

      const entries = Object.keys(zip.files);

      const pdfEntries = entries.filter(
        (n) =>
          !zip.files[n].dir && n.toLowerCase().endsWith('.pdf')
      );

      setTotalCount(pdfEntries.length);
      setCurrentStage('Extracting PDF statements…');

      const uploadedPdfFiles = [];
      const results = [];
      const fileTableDataMap = {};
      const narrativesAccum = [];

      // Three formats:
      //   1) Indian comma format:  "1,000" / "5,00,000.00"
      //   2) Plain 5-12 digit:     "12345" / "1000000.50"  (excludes 4-digit years like 2024)
      //   3) 4-12 digit + decimal: "5000.00"               (decimals exclude years)
      const amountPatternForCheck =
        /\b\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\b\d{5,12}(?:\.\d{1,2})?|\b\d{4,12}\.\d{1,2}/g;

      for (const entryName of entries) {
        const zipEntry = zip.files[entryName];

        try {
          if (!zipEntry.dir && entryName.toLowerCase().endsWith('.pdf')) {
            setCurrentProcessingFile(entryName);

            uploadedPdfFiles.push(entryName);

            const lowerName = entryName.toLowerCase();

            // Decompress + parse this PDF only ONCE, then reuse the parsed
            // document for the full-text pass and every schedule-specific
            // parser below. Memoised so repeated getEntryDoc() calls are free.
            let _entryDocPromise = null;
            const getEntryDoc = () =>
              (_entryDocPromise ??= zipEntry
                .async('uint8array')
                .then((data) => PDFJS.getDocument({ data }).promise));

            const pdfText = await extractTextFromDoc(await getEntryDoc());

            // Detect tabular financial data.
            // Step 1: Heal PDF.js spacing artefacts inside numbers,
            //         e.g. "5 , 00 , 000" → "5,00,000".
            const healedText = pdfText.replace(
              /(\d)\s*,\s*(?=\d)/g,
              '$1,'
            );

            // Step 2: Match candidate amount strings.
            const rawHits =
              healedText.match(amountPatternForCheck) || [];

            // Step 3: Convert to numeric and keep only sensible
            // financial values (₹1,000 to ₹1 trillion). This drops
            // 14-digit file IDs and other noise.
            const validAmounts = rawHits
              .map((s) => parseFloat(s.replace(/,/g, '')))
              .filter(
                (v) => !Number.isNaN(v) && v >= 1000 && v <= 1e12
              );

            // Require ≥2 DISTINCT values — defends against a
            // repeated printer-ID being counted as multiple amounts.
            const uniqueAmounts = new Set(validAmounts);
            fileTableDataMap[entryName] = uniqueAmounts.size >= 2;

            if (
              lowerName.includes('receipts') &&
              lowerName.includes('payments')
            ) {
              const extracted = extractFinancialPair(pdfText);

              results.push({
                statementType: 'Receipts and Payments',
                fileName: entryName,
                amount1: extracted.leftAmount,
                amount2: extracted.rightAmount,
                label1: 'Receipts Amount',
                label2: 'Payment Amount',
                tallied: extracted.tallied,
                difference: extracted.difference,
                aiRemark: extracted.tallied
                  ? 'Receipts Amount and Payment Amount are tallied.'
                  : `Difference Detected: ₹${extracted.difference.toLocaleString(
                      'en-IN'
                    )}`,
              });
            }

            if (
              lowerName.includes('trail') &&
              lowerName.includes('balance')
            ) {
              const pdfDocument = await getEntryDoc();

              async function extractRightAmountFromPage(pageNumber) {
                if (pageNumber > pdfDocument.numPages) {
                  return 0;
                }

                const page = await pdfDocument.getPage(pageNumber);

                const textContent = await page.getTextContent();

                const pageText = textContent.items
                  .map((item) => item.str)
                  .join(' ');

                const amountMatches =
                  pageText.match(
                    /\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?/g
                  ) || [];

                const cleanedAmounts = amountMatches
                  .map((value) => cleanCurrency(value))
                  .filter(
                    (value) =>
                      value > 1000 &&
                      value < 999999999999 &&
                      !String(value).startsWith('0')
                  );

                if (cleanedAmounts.length === 0) {
                  return 0;
                }

                return cleanedAmounts[cleanedAmounts.length - 1];
              }

              const firstPageRightAmount =
                await extractRightAmountFromPage(1);

              const secondPageRightAmount =
                await extractRightAmountFromPage(2);

              const tallied =
                Math.abs(
                  firstPageRightAmount - secondPageRightAmount
                ) < 0.01;

              const difference = Math.abs(
                firstPageRightAmount - secondPageRightAmount
              );

              results.push({
                statementType: 'Trail Balance',
                fileName: entryName,
                amount1: firstPageRightAmount,
                amount2: secondPageRightAmount,
                label1: '1st Page Right Amount - Grand Total',
                label2: '2nd Page Right Amount - Grand Total',
                tallied,
                difference,
                aiRemark: tallied
                  ? 'Trail Balance right-side grand totals are tallied.'
                  : `Difference Detected: ₹${difference.toLocaleString(
                      'en-IN'
                    )}`,
              });
            }

            if (
              lowerName.includes('trading') &&
              lowerName.includes('account')
            ) {
              const pdfDocument = await getEntryDoc();

              let drAmount = 0;
              let crAmount = 0;

              const amountRegex =
                /\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?/g;

              for (
                let pageNumber = 1;
                pageNumber <= pdfDocument.numPages;
                pageNumber++
              ) {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1 });
                const centerX = viewport.width / 2;

                const textContent = await page.getTextContent();

                const rowsMap = {};

                textContent.items.forEach((item) => {
                  const y = Math.round(item.transform[5]);

                  if (!rowsMap[y]) {
                    rowsMap[y] = [];
                  }

                  rowsMap[y].push({
                    text: item.str,
                    x: item.transform[4],
                  });
                });

                // Iterate rows in visual order (top → bottom in PDF =
                // high y → low y). Find the LOWEST "grand total" row.
                const sortedYs = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                let grandTotalY = null;

                for (const y of sortedYs) {
                  const rowText = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                  if (!rowText.includes('grand total')) {
                    continue;
                  }

                  if (
                    rowText.includes('previous year') ||
                    rowText.includes('prev year') ||
                    rowText.includes('opening balance')
                  ) {
                    continue;
                  }

                  grandTotalY = y;
                }

                if (grandTotalY === null) {
                  continue;
                }

                // Pull items from the grand-total row plus any items
                // within a small y-tolerance (PDFs sometimes split a
                // visual row across slightly different y coordinates).
                const tolerance = 3;
                const grandTotalItems = [];

                for (const y of sortedYs) {
                  if (Math.abs(y - grandTotalY) <= tolerance) {
                    grandTotalItems.push(...rowsMap[y]);
                  }
                }

                const sideAmount = (items) => {
                  const text = items
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ');

                  const matches = text.match(amountRegex) || [];

                  const cleaned = matches
                    .map((value) => cleanCurrency(value))
                    .filter(
                      (value) =>
                        value > 0 && value < 999999999999
                    );

                  // Layout (per statement header): each side is
                  // [Current Year | Previous Year], so the first
                  // amount encountered on a side IS the current
                  // year figure.
                  return cleaned.length > 0 ? cleaned[0] : 0;
                };

                const drItems = grandTotalItems.filter(
                  (item) => item.x < centerX
                );
                const crItems = grandTotalItems.filter(
                  (item) => item.x >= centerX
                );

                drAmount = sideAmount(drItems);
                crAmount = sideAmount(crItems);

                if (drAmount > 0 && crAmount > 0) {
                  break;
                }
              }

              const tallied = Math.abs(drAmount - crAmount) < 0.01;

              const difference = Math.abs(drAmount - crAmount);

              results.push({
                statementType: 'Trading Account',
                fileName: entryName,
                amount1: drAmount,
                amount2: crAmount,
                label1:
                  'Trading Account Dr. Side Current Year Grand Total',
                label2:
                  'Trading Account Cr. Side Current Year Grand Total',
                tallied,
                difference,
                aiRemark:
                  drAmount === 0 || crAmount === 0
                    ? 'Unable to identify Trading Account current year grand totals from PDF statement.'
                    : tallied
                    ? 'Trading Account current year Dr. Side and Cr. Side grand totals are tallied.'
                    : `Difference Detected: ₹${difference.toLocaleString('en-IN')}`,
              });
            }

            if (
              lowerName.includes('profit') &&
              lowerName.includes('loss') &&
              lowerName.includes('account') &&
              !lowerName.includes('appropriation')
            ) {
              const pdfDocument = await getEntryDoc();

              let expenditureAmount = 0;
              let incomeAmount = 0;

              const amountRegex =
                /\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?/g;

              for (
                let pageNumber = 1;
                pageNumber <= pdfDocument.numPages;
                pageNumber++
              ) {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1 });
                const centerX = viewport.width / 2;

                const textContent = await page.getTextContent();

                const rowsMap = {};

                textContent.items.forEach((item) => {
                  const y = Math.round(item.transform[5]);

                  if (!rowsMap[y]) {
                    rowsMap[y] = [];
                  }

                  rowsMap[y].push({
                    text: item.str,
                    x: item.transform[4],
                  });
                });

                const sortedYs = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                let grandTotalY = null;

                for (const y of sortedYs) {
                  const rowText = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                  if (!rowText.includes('grand total')) {
                    continue;
                  }

                  if (
                    rowText.includes('previous year') ||
                    rowText.includes('prev year')
                  ) {
                    continue;
                  }

                  grandTotalY = y;
                }

                if (grandTotalY === null) {
                  continue;
                }

                const tolerance = 3;
                const grandTotalItems = [];

                for (const y of sortedYs) {
                  if (Math.abs(y - grandTotalY) <= tolerance) {
                    grandTotalItems.push(...rowsMap[y]);
                  }
                }

                const sideAmount = (items) => {
                  const text = items
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ');

                  const matches = text.match(amountRegex) || [];

                  const cleaned = matches
                    .map((value) => cleanCurrency(value))
                    .filter(
                      (value) =>
                        value > 0 && value < 999999999999
                    );

                  // Per-side column order is "Current Year |
                  // Previous Year", so the first amount on a side
                  // is the Current Year figure.
                  return cleaned.length > 0 ? cleaned[0] : 0;
                };

                const expenditureItems = grandTotalItems.filter(
                  (item) => item.x < centerX
                );
                const incomeItems = grandTotalItems.filter(
                  (item) => item.x >= centerX
                );

                expenditureAmount = sideAmount(expenditureItems);
                incomeAmount = sideAmount(incomeItems);

                if (expenditureAmount > 0 && incomeAmount > 0) {
                  break;
                }
              }

              const tallied =
                Math.abs(expenditureAmount - incomeAmount) < 0.01;

              const difference = Math.abs(
                expenditureAmount - incomeAmount
              );

              results.push({
                statementType: 'Profit and Loss Account',
                fileName: entryName,
                amount1: expenditureAmount,
                amount2: incomeAmount,
                label1:
                  'P & L Account Expenditure Current Year Grand Total',
                label2:
                  'P & L Account Income Current Year Grand Total',
                tallied,
                difference,
                aiRemark:
                  expenditureAmount === 0 || incomeAmount === 0
                    ? 'Unable to identify Profit and Loss Account current year grand totals from PDF statement.'
                    : tallied
                    ? 'Profit and Loss Account current year Expenditure and Income grand totals are tallied.'
                    : `Difference Detected: ₹${difference.toLocaleString('en-IN')}`,
              });
            }

            if (
              lowerName.includes('profit') &&
              lowerName.includes('loss') &&
              lowerName.includes('appropriation')
            ) {
              const pdfDocument = await getEntryDoc();

              let expenditureAmount = 0;
              let incomeAmount = 0;

              const amountRegex =
                /\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?/g;

              for (
                let pageNumber = 1;
                pageNumber <= pdfDocument.numPages;
                pageNumber++
              ) {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1 });
                const centerX = viewport.width / 2;

                const textContent = await page.getTextContent();

                const rowsMap = {};

                textContent.items.forEach((item) => {
                  const y = Math.round(item.transform[5]);

                  if (!rowsMap[y]) {
                    rowsMap[y] = [];
                  }

                  rowsMap[y].push({
                    text: item.str,
                    x: item.transform[4],
                  });
                });

                const sortedYs = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                let grandTotalY = null;

                for (const y of sortedYs) {
                  const rowText = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                  if (!rowText.includes('grand total')) {
                    continue;
                  }

                  if (
                    rowText.includes('previous year') ||
                    rowText.includes('prev year')
                  ) {
                    continue;
                  }

                  grandTotalY = y;
                }

                if (grandTotalY === null) {
                  continue;
                }

                const tolerance = 3;
                const grandTotalItems = [];

                for (const y of sortedYs) {
                  if (Math.abs(y - grandTotalY) <= tolerance) {
                    grandTotalItems.push(...rowsMap[y]);
                  }
                }

                const sideAmount = (items) => {
                  const text = items
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ');

                  const matches = text.match(amountRegex) || [];

                  const cleaned = matches
                    .map((value) => cleanCurrency(value))
                    .filter(
                      (value) =>
                        value > 0 && value < 999999999999
                    );

                  // Per-side column order is "Current Year |
                  // Previous Year", so the first amount on a side
                  // is the Current Year figure.
                  return cleaned.length > 0 ? cleaned[0] : 0;
                };

                const expenditureItems = grandTotalItems.filter(
                  (item) => item.x < centerX
                );
                const incomeItems = grandTotalItems.filter(
                  (item) => item.x >= centerX
                );

                expenditureAmount = sideAmount(expenditureItems);
                incomeAmount = sideAmount(incomeItems);

                if (expenditureAmount > 0 && incomeAmount > 0) {
                  break;
                }
              }

              const tallied =
                Math.abs(expenditureAmount - incomeAmount) < 0.01;

              const difference = Math.abs(
                expenditureAmount - incomeAmount
              );

              results.push({
                statementType: 'Profit and Loss Appropriation',
                fileName: entryName,
                amount1: expenditureAmount,
                amount2: incomeAmount,
                label1:
                  'P & L Appropriation Expenditure Current Year Grand Total',
                label2:
                  'P & L Appropriation Income Current Year Grand Total',
                tallied,
                difference,
                aiRemark:
                  expenditureAmount === 0 || incomeAmount === 0
                    ? 'Unable to identify Profit and Loss Appropriation current year grand totals from PDF statement.'
                    : tallied
                    ? 'Profit and Loss Appropriation current year Expenditure and Income grand totals are tallied.'
                    : `Difference Detected: ₹${difference.toLocaleString('en-IN')}`,
              });
            }

            if (
              lowerName.includes('balance') &&
              lowerName.includes('sheet')
            ) {
              const pdfDocument = await getEntryDoc();

              const amountRegex =
                /\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?/g;

              async function extractCurrentYearGrandTotal(
                pageNumber
              ) {
                if (pageNumber > pdfDocument.numPages) {
                  return 0;
                }

                const page = await pdfDocument.getPage(pageNumber);

                const textContent = await page.getTextContent();

                const rowsMap = {};

                textContent.items.forEach((item) => {
                  const y = Math.round(item.transform[5]);

                  if (!rowsMap[y]) {
                    rowsMap[y] = [];
                  }

                  rowsMap[y].push({
                    text: item.str,
                    x: item.transform[4],
                  });
                });

                const sortedYs = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                let grandTotalY = null;

                for (const y of sortedYs) {
                  const rowText = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((entry) => entry.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                  if (!rowText.includes('grand total')) {
                    continue;
                  }

                  if (
                    rowText.includes('previous year') ||
                    rowText.includes('prev year')
                  ) {
                    continue;
                  }

                  grandTotalY = y;
                }

                if (grandTotalY === null) {
                  return 0;
                }

                const tolerance = 3;
                const grandTotalItems = [];

                for (const y of sortedYs) {
                  if (Math.abs(y - grandTotalY) <= tolerance) {
                    grandTotalItems.push(...rowsMap[y]);
                  }
                }

                const rowText = grandTotalItems
                  .slice()
                  .sort((a, b) => a.x - b.x)
                  .map((entry) => entry.text)
                  .join(' ');

                const matches = rowText.match(amountRegex) || [];

                const cleaned = matches
                  .map((value) => cleanCurrency(value))
                  .filter(
                    (value) => value > 0 && value < 999999999999
                  );

                // Column header order on each Balance Sheet page is
                // "Current Year | Previous Year", so the first
                // numeric amount on the Grand Total row is the
                // Current Year figure.
                return cleaned.length > 0 ? cleaned[0] : 0;
              }

              const firstPageGrandTotal =
                await extractCurrentYearGrandTotal(1);

              const secondPageGrandTotal =
                await extractCurrentYearGrandTotal(2);

              const tallied =
                Math.abs(
                  firstPageGrandTotal - secondPageGrandTotal
                ) < 0.01;

              const difference = Math.abs(
                firstPageGrandTotal - secondPageGrandTotal
              );

              results.push({
                statementType: 'Balance Sheet',
                fileName: entryName,
                amount1: firstPageGrandTotal,
                amount2: secondPageGrandTotal,
                label1:
                  '1st Page Current Year Grand Total (Capital & Liabilities)',
                label2:
                  '2nd Page Current Year Grand Total (Properties & Assets)',
                tallied,
                difference,
                aiRemark:
                  firstPageGrandTotal === 0 ||
                  secondPageGrandTotal === 0
                    ? 'Unable to identify Balance Sheet current year grand totals from PDF statement.'
                    : tallied
                    ? 'Balance Sheet 1st Page and 2nd Page current year grand totals are tallied.'
                    : `Difference Detected: ₹${difference.toLocaleString('en-IN')}`,
              });

              // === Sundry Debtors & Sundry Creditors — Closing Balance check ===
              const bsTextRaw = await extractTextFromDoc(await getEntryDoc());
              const bsHealed = bsTextRaw.replace(
                /(\d)\s*,\s*(?=\d)/g,
                '$1,'
              );
              const sdcAmtRe =
                /-?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|-?\d+\.\d{1,2}/g;
              const bsLines = bsHealed
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);

              let sundryDebtorsCY = null;
              let sundryCreditorsCY = null;
              for (const line of bsLines) {
                const lower = line.toLowerCase();
                const amts = (line.match(sdcAmtRe) || [])
                  .map((s) => parseFloat(s.replace(/,/g, '')))
                  .filter((v) => !Number.isNaN(v));
                if (
                  lower.includes('sundry debtors') &&
                  sundryDebtorsCY === null &&
                  amts.length > 0
                ) {
                  // first amount on the row is the Current Year value
                  sundryDebtorsCY = amts[0];
                }
                if (
                  lower.includes('sundry creditors') &&
                  sundryCreditorsCY === null &&
                  amts.length > 0
                ) {
                  sundryCreditorsCY = amts[0];
                }
              }

              if (
                sundryDebtorsCY !== null ||
                sundryCreditorsCY !== null
              ) {
                const fmtSDC = (v) =>
                  v === null
                    ? '—'
                    : `₹${v.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`;
                const sdNeg =
                  sundryDebtorsCY !== null && sundryDebtorsCY < 0;
                const scNeg =
                  sundryCreditorsCY !== null &&
                  sundryCreditorsCY < 0;
                const anyNeg = sdNeg || scNeg;

                const meritSDC = `Balance Sheet verification shows Sundry Debtors at ${fmtSDC(sundryDebtorsCY)} and Sundry Creditors at ${fmtSDC(sundryCreditorsCY)}, both with positive closing balances consistent with their receivable/payable nature. This reflects correct postings under Section 55-A of the APCS Act, 1964 and the CAS Manual. The CEO is advised to keep these heads under active reconciliation.`;
                const demeritSDC = `Balance Sheet shows negative balance(s) under Sundry Debtors (${fmtSDC(sundryDebtorsCY)}) and/or Sundry Creditors (${fmtSDC(sundryCreditorsCY)}). A negative Sundry Debtors balance suggests wrong contra-postings or double recoveries; a negative Sundry Creditors balance suggests excess payments or wrong debit entries. Both breach Section 55-A of the APCS Act, 1964 and Paragraph 6.12.2 of the Audit Manual for PACS. The CEO shall undertake party-wise reconciliation, reverse erroneous postings and produce the rectified Balance Sheet at the next audit; surcharge under Section 60 may be examined where loss is established.`;

                narrativesAccum.push({
                  key: 'sundryDebtorsCreditors',
                  fileName: entryName,
                  title:
                    'Balance Sheet · Sundry Debtors & Sundry Creditors',
                  metricLabel: 'Debtors · Creditors (CY)',
                  metricValue: `${fmtSDC(sundryDebtorsCY)} · ${fmtSDC(sundryCreditorsCY)}`,
                  status: anyNeg ? 'demerit' : 'merit',
                  narrative: anyNeg ? demeritSDC : meritSDC,
                });
              }
            }

            // === Schedule-9 — Provisions on NPA, Overdue Interest, Bad & Doubtful Debtors ===
            if (/schedule[\s\-]*9(?![0-9a-g])/i.test(entryName)) {
              const docS9 = await getEntryDoc();

              const amtRe9 =
                /-?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|-?\d+\.\d{2}/g;

              const findings = {
                subStandard: null,
                doubtful: null,
                loss: null,
                overdueInterest: null,
                badDoubtfulSundry: null,
              };

              for (let p = 1; p <= docS9.numPages; p++) {
                const page = await docS9.getPage(p);
                const tc = await page.getTextContent();
                const rowsMap = {};
                tc.items.forEach((it) => {
                  const y = Math.round(it.transform[5]);
                  if (!rowsMap[y]) rowsMap[y] = [];
                  rowsMap[y].push({
                    text: it.str,
                    x: it.transform[4],
                  });
                });
                const ys = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                // Group consecutive Y values within 12px to handle
                // wrapped multi-line row labels.
                const groups = [];
                let current = [];
                let prevY = null;
                for (const y of ys) {
                  if (prevY === null || prevY - y <= 14) {
                    current.push(y);
                  } else {
                    if (current.length) groups.push(current);
                    current = [y];
                  }
                  prevY = y;
                }
                if (current.length) groups.push(current);

                for (const group of groups) {
                  let combined = '';
                  for (const y of group) {
                    combined +=
                      ' ' +
                      rowsMap[y]
                        .slice()
                        .sort((a, b) => a.x - b.x)
                        .map((e) => e.text)
                        .join(' ');
                  }
                  combined = combined.replace(/\s+/g, ' ').trim();
                  const lower = combined.toLowerCase();

                  const matches =
                    combined.match(amtRe9) || [];
                  const parsed = matches
                    .map((s) => parseFloat(s.replace(/,/g, '')))
                    .filter((v) => !Number.isNaN(v));
                  // Closing Balance is the LAST amount in the row
                  const closing =
                    parsed.length > 0
                      ? parsed[parsed.length - 1]
                      : null;

                  if (closing === null) continue;

                  if (
                    lower.includes('npa') &&
                    lower.includes('sub-standard') &&
                    findings.subStandard === null
                  ) {
                    findings.subStandard = closing;
                  } else if (
                    lower.includes('npa') &&
                    lower.includes('doubtful') &&
                    findings.doubtful === null
                  ) {
                    findings.doubtful = closing;
                  } else if (
                    lower.includes('npa') &&
                    lower.includes('loss') &&
                    findings.loss === null
                  ) {
                    findings.loss = closing;
                  } else if (
                    lower.includes('overdue interest') &&
                    !lower.includes('total') &&
                    findings.overdueInterest === null
                  ) {
                    findings.overdueInterest = closing;
                  } else if (
                    lower.includes('bad') &&
                    lower.includes('doubtful') &&
                    lower.includes('sundry') &&
                    !lower.includes('total') &&
                    findings.badDoubtfulSundry === null
                  ) {
                    findings.badDoubtfulSundry = closing;
                  }
                }
              }

              const fmtRupee = (v) =>
                v === null
                  ? '—'
                  : `₹${v.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;

              const anyNegative = Object.values(findings).some(
                (v) => v !== null && v < 0
              );
              const allZeroProvisions =
                findings.subStandard === 0 &&
                findings.doubtful === 0 &&
                findings.loss === 0;

              const isMeritS9 = !anyNegative && !allZeroProvisions;

              const narrativeS9 = anyNegative
                ? `Schedule-9 (Provisions) shows negative closing balance(s) — NPA Sub-Standard ${fmtRupee(findings.subStandard)}, NPA Doubtful ${fmtRupee(findings.doubtful)}, NPA Loss ${fmtRupee(findings.loss)}, Overdue Interest Provision ${fmtRupee(findings.overdueInterest)}, and Bad & Doubtful Sundry Debtors ${fmtRupee(findings.badDoubtfulSundry)}. A negative provision balance is contrary to the CAS Manual and NABARD IRAC norms, and indicates excessive reversal or wrong debit postings. The CEO shall reconcile the provision ledgers, restore correct balances and produce the rectified Schedule-9 at the next audit; failure attracts direction under Section 54 of the APCS Act, 1964.`
                : allZeroProvisions
                ? `Schedule-9 reveals the Society has not created any provision for Non-Performing Assets — NPA Sub-Standard, Doubtful and Loss closing balances are all NIL. This is a serious breach of NABARD's IRAC prudential norms, which mandate graded provisioning, and overstates the realisable value of loans. The Managing Committee shall undertake immediate provisioning; failure attracts action under Section 54 of the APCS Act, 1964.`
                : `Schedule-9 confirms the Society has duly created provisions in compliance with NABARD IRAC norms and Section 55-A of the APCS Act, 1964: NPA Sub-Standard ${fmtRupee(findings.subStandard)}, NPA Doubtful ${fmtRupee(findings.doubtful)}, NPA Loss ${fmtRupee(findings.loss)}, Overdue Interest ${fmtRupee(findings.overdueInterest)}, and Bad & Doubtful Sundry Debtors ${fmtRupee(findings.badDoubtfulSundry)}. The graded provisioning reflects sound risk management and prudent credit-risk recognition; the Managing Committee is commended for IRAC discipline.`;

              narrativesAccum.push({
                key: 'schedule9',
                fileName: entryName,
                title:
                  'Schedule-9 · Provisions on NPAs / Overdue Interest / Sundry Debtors',
                metricLabel: 'NPA Sub-Std · Doubtful · Loss',
                metricValue: `${fmtRupee(findings.subStandard)} · ${fmtRupee(findings.doubtful)} · ${fmtRupee(findings.loss)}`,
                status: anyNegative
                  ? 'demerit'
                  : isMeritS9
                  ? 'merit'
                  : 'demerit',
                narrative: narrativeS9,
              });
            }

            // === Schedule-16B — Sundry Debtors audit (Due > 3 years) ===
            if (/schedule[\s\-]*16[\s\-]*b\b/i.test(entryName)) {
              const docS16B = await getEntryDoc();

              const amtRe16 =
                /^(?:\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{1,2})$/;

              let totalAbove3Yrs = 0;
              let accountsAbove3Yrs = 0;
              let totalClosingBalance = 0;
              let pagesProcessed = 0;
              let summaryAbove3 = 0;

              for (
                let pn = 1;
                pn <= docS16B.numPages;
                pn++
              ) {
                const page = await docS16B.getPage(pn);
                const tc = await page.getTextContent();
                const items = tc.items
                  .map((it) => ({
                    x: it.transform[4],
                    y: it.transform[5],
                    text: it.str.trim(),
                  }))
                  .filter((it) => it.text);

                // (A) Classification SUMMARY total for the ">3yr / No scope /
                // 100%" bucket. On the schedule's summary page this bucket total
                // sits on the label line, while the per-account detail column is
                // often entirely 0.00. Robust to the label text being split
                // across PDF items (e.g. "Due from above 3" + "years(₹)/No scope").
                const noScopeYs = items
                  .filter(
                    (it) =>
                      it.x < 170 &&
                      /(100\s*%|no\s*scope|for\s*realization|realisation)/i.test(
                        it.text
                      )
                  )
                  .map((it) => it.y);
                if (noScopeYs.length) {
                  const sAmts = items
                    .filter(
                      (it) =>
                        it.x > 150 &&
                        amtRe16.test(it.text) &&
                        noScopeYs.some(
                          (ay) => Math.abs(it.y - ay) <= 16
                        )
                    )
                    .map((it) => parseFloat(it.text.replace(/,/g, '')))
                    .filter((v) => !Number.isNaN(v) && v > 0);
                  if (sAmts.length)
                    summaryAbove3 = Math.max(summaryAbove3, ...sAmts);
                }

                // (B) Per-account detail (for schedules that itemise the column).
                // Match on "above 3" — the full phrase is split across items.
                const aboveLabel = items.find(
                  (it) => /above\s*3/i.test(it.text) && it.x < 250
                );
                // Find the label "Closing Balance"
                const closingLabel = items.find(
                  (it) =>
                    /closing\s*balance/i.test(it.text) &&
                    it.x < 250
                );

                if (aboveLabel) {
                  pagesProcessed += 1;

                // Values are BELOW the label in PDF coords (smaller y)
                // Look for amount items within 35 units below the label
                const aboveValues = items.filter(
                  (it) =>
                    it.y < aboveLabel.y &&
                    aboveLabel.y - it.y <= 35 &&
                    it.x >= 140 &&
                    amtRe16.test(it.text)
                );
                // Group by Y (rounded) and take the most populous Y as the value row
                const yCounts = {};
                aboveValues.forEach((it) => {
                  const y = Math.round(it.y);
                  yCounts[y] = (yCounts[y] || 0) + 1;
                });
                const sortedYs = Object.entries(yCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([y]) => parseInt(y, 10));
                const valueY = sortedYs[0];

                if (valueY !== undefined) {
                  const rowValues = items
                    .filter(
                      (it) =>
                        Math.abs(it.y - valueY) <= 1.5 &&
                        it.x >= 140 &&
                        amtRe16.test(it.text)
                    )
                    .map((it) =>
                      parseFloat(it.text.replace(/,/g, ''))
                    )
                    .filter((v) => !Number.isNaN(v));

                  for (const v of rowValues) {
                    if (v > 0) {
                      accountsAbove3Yrs += 1;
                      totalAbove3Yrs += v;
                    }
                  }
                }
                } // end if (aboveLabel) — per-account detail

                // Also sum closing balance for context
                if (closingLabel) {
                  const cbValues = items.filter(
                    (it) =>
                      it.y < closingLabel.y &&
                      closingLabel.y - it.y <= 70 &&
                      it.x >= 155 &&
                      amtRe16.test(it.text)
                  );
                  const cbYCounts = {};
                  cbValues.forEach((it) => {
                    const y = Math.round(it.y);
                    cbYCounts[y] = (cbYCounts[y] || 0) + 1;
                  });
                  const cbSortedYs = Object.entries(cbYCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([y]) => parseInt(y, 10));
                  const cbValueY = cbSortedYs[0];
                  if (cbValueY !== undefined) {
                    const cbRowValues = items
                      .filter(
                        (it) =>
                          Math.abs(it.y - cbValueY) <= 1.5 &&
                          it.x >= 155 &&
                          amtRe16.test(it.text)
                      )
                      .map((it) =>
                        parseFloat(it.text.replace(/,/g, ''))
                      )
                      .filter((v) => !Number.isNaN(v));
                    cbRowValues.forEach((v) => {
                      if (v > 0) totalClosingBalance += v;
                    });
                  }
                }
              }

              // Pull the provision figure from Schedule-9 narrative if
              // available (the badDoubtfulSundry closing balance).
              const sched9N = narrativesAccum.find(
                (n) => n.key === 'schedule9'
              );
              // We can't access sched9 raw data here easily; expose it
              // implicitly via the narrative status. For provisioning
              // adequacy, the narrative will refer to "the provision in
              // Schedule-9".

              const fmt16 = (v) =>
                `₹${v.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;

              // Prefer the larger of the itemised per-account sum and the
              // classification summary total (the summary carries the figure
              // when the detail column is not itemised, as in eAudit exports).
              totalAbove3Yrs = Math.max(totalAbove3Yrs, summaryAbove3);
              const isMerit16 = totalAbove3Yrs <= 0;

              const merit16 = `Verification of Schedule-16B (Sundry Debtors) of the Society confirms that there are no accounts with dues outstanding for more than three (3) years; all Sundry Debtor balances aggregating to ${fmt16(totalClosingBalance)} are within the recoverable age-bracket. This reflects diligent monitoring of receivables by the Managing Committee in discharge of its duty under Section 30(xxii) of the Andhra Pradesh Cooperative Societies Act, 1964 (review of overdues and defaulters), and timely action by the Chief Executive Officer in compliance with Rule 41(C)(6) of the APCS Rules, 1964 (declaration of overdue debtors once every quarter). The Sundry Debtors ageing posture conforms to the NABARD IRAC norms read with the Manual on Chart of Accounts (CAS) for PACS and is commended from an audit standpoint.`;

              const demerit16 = `Verification of Schedule-16B (Sundry Debtors) of the Society reveals that ${accountsAbove3Yrs} account(s) have outstanding dues exceeding three (3) years aggregating to ${fmt16(totalAbove3Yrs)} against a total Sundry Debtors closing balance of ${fmt16(totalClosingBalance)}. As per the Manual on Chart of Accounts (CAS) for PACS read with the NABARD Income Recognition, Asset Classification and Provisioning (IRAC) norms, such dues — being classified under "No scope for realization" — require 100% provision in the books, and the Schedule-9 (Provisions) of the Society shall demonstrate adequate provisioning to that effect. The non-recovery of these long-aged Sundry Debtors constitutes a material audit defect under Section 30(xxii) of the Andhra Pradesh Cooperative Societies Act, 1964 — which casts a duty on the Managing Committee to conduct a periodical review of all overdues and defaulters — read with Rule 41(C)(6) of the APCS Rules, 1964 — which mandates declaration of overdue debtors once every quarter — and Section 55-A of the Act read with Rules 58 and 59 (correct maintenance and authentication of accounts and provisions). In exercise of the directions under Section 54 of the Act (Rectification of defects), the Chief Executive Officer is hereby directed to (a) initiate immediate legal action or recovery proceedings on these long-overdue Sundry Debtor accounts, (b) ensure that 100% provision is created in the books in accordance with the IRAC norms and reflected in Schedule-9, (c) place the matter before the Managing Committee for resolution and obtain its approval for write-off where realization is established to be impossible, and (d) report the corrective action at the next monthly audit. Persistent failure shall be reported to the Registrar for direction under Section 54 of the Act and the CEO and Managing Committee shall be held responsible for any loss to the Society arising from time-barred Sundry Debtor claims.`;

              narrativesAccum.push({
                key: 'schedule16b',
                fileName: entryName,
                title:
                  'Schedule-16B · Sundry Debtors (Above 3 Years)',
                metricLabel: 'Accts > 3 yrs · Total',
                metricValue:
                  accountsAbove3Yrs > 0
                    ? `${accountsAbove3Yrs} acct(s) · ${fmt16(totalAbove3Yrs)}`
                    : fmt16(totalAbove3Yrs),
                above3Total: fmt16(totalAbove3Yrs),
                status: isMerit16 ? 'merit' : 'demerit',
                narrative: isMerit16 ? merit16 : demerit16,
              });
            }

            // === Annexure-5 — Calculation of Imbalance audit ===
            if (/annexure[\s\-]*5(?![0-9])/i.test(entryName)) {
              const docA5 = await getEntryDoc();

              const amtReA5 =
                /-?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|-?\d+\.\d{2}/g;

              let aTotal = null;
              let bTotal = null;
              let imbalanceVal = null;
              let foundA = false;
              let foundB = false;

              for (let p = 1; p <= docA5.numPages; p++) {
                const page = await docA5.getPage(p);
                const tc = await page.getTextContent();
                const rowsMap = {};
                tc.items.forEach((it) => {
                  const y = Math.round(it.transform[5]);
                  if (!rowsMap[y]) rowsMap[y] = [];
                  rowsMap[y].push({
                    text: it.str,
                    x: it.transform[4],
                  });
                });
                const ys = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                for (const y of ys) {
                  const text = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((e) => e.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  const lower = text.toLowerCase();

                  if (lower.startsWith('a.') || lower.includes('amounts pending for payment')) {
                    foundA = true;
                    foundB = false;
                    continue;
                  }
                  if (lower.startsWith('b.') || lower.includes('amounts pending for recovery')) {
                    foundB = true;
                    foundA = false;
                    continue;
                  }

                  const matches = text.match(amtReA5) || [];
                  const parsed = matches
                    .map((s) => parseFloat(s.replace(/,/g, '')))
                    .filter((v) => !Number.isNaN(v));

                  if (
                    lower.includes('imbalance') &&
                    lower.includes('a-b')
                  ) {
                    if (parsed.length > 0) {
                      imbalanceVal = parsed[parsed.length - 1];
                    }
                  } else if (lower.startsWith('total') && parsed.length > 0) {
                    if (foundA && aTotal === null) {
                      aTotal = parsed[parsed.length - 1];
                    } else if (foundB && bTotal === null) {
                      bTotal = parsed[parsed.length - 1];
                    }
                  }
                }
              }

              const computed =
                aTotal !== null && bTotal !== null
                  ? Math.max(0, aTotal - bTotal)
                  : null;
              const finalImbalance =
                imbalanceVal !== null ? imbalanceVal : computed;

              const fmt2 = (v) =>
                v === null
                  ? '—'
                  : `₹${v.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;

              const isMeritA5 =
                finalImbalance !== null && finalImbalance <= 0.01;

              const meritA5 = `Annexure-5 confirms there is no Financial Imbalance as on the audit date. Amounts Pending for Payment (A: ${fmt2(aTotal)}) are fully covered by Amounts Pending for Recovery (B: ${fmt2(bTotal)}), yielding an Imbalance of ${fmt2(finalImbalance)}. This reflects sound asset-liability matching and prudent treasury management under the cooperative principles of the APCS Act, 1964.`;
              const demeritA5 = `Annexure-5 reveals a Financial Imbalance of ${fmt2(finalImbalance)} — Amounts Pending for Payment (A: ${fmt2(aTotal)}) exceed Amounts Pending for Recovery (B: ${fmt2(bTotal)}). This typically arises from excess interest paid to the financing bank, expenses beyond NABARD norms, and non-recovery of overdues. The Managing Committee shall pursue legal action under Section 30(xxii) read with Rule 41(C)(6) of the APCS Rules, 1964, rationalise expenditure under Section 115-D, and report rectification at the next monthly audit; persistent imbalance attracts direction under Section 54.`;

              narrativesAccum.push({
                key: 'annexure5',
                fileName: entryName,
                title: 'Annexure-5 · Calculation of Imbalance',
                metricLabel: 'Imbalance (A − B)',
                metricValue: fmt2(finalImbalance),
                status: isMeritA5 ? 'merit' : 'demerit',
                narrative: isMeritA5 ? meritA5 : demeritA5,
              });
            }

            // === Annexure-8 — Total Income (Previous Year) audit ===
            if (/annexure[\s\-]*8(?![0-9])/i.test(entryName)) {
              const pdfDocument = await getEntryDoc();

              const annexAmountRegex =
                /-?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|-?\d+\.\d{1,2}/g;

              let totalIncomePrevYear = null;

              outer: for (
                let pageNumber = 1;
                pageNumber <= pdfDocument.numPages;
                pageNumber++
              ) {
                const page = await pdfDocument.getPage(pageNumber);
                const tc = await page.getTextContent();

                const rowsMap = {};
                tc.items.forEach((it) => {
                  const y = Math.round(it.transform[5]);
                  if (!rowsMap[y]) rowsMap[y] = [];
                  rowsMap[y].push({
                    text: it.str,
                    x: it.transform[4],
                  });
                });

                const sortedYs = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                for (const y of sortedYs) {
                  const rowText = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((e) => e.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  const lower = rowText.toLowerCase();

                  // Only the "Total Income" data row.
                  // Skip section headings and percentage rows.
                  if (!lower.includes('total income')) continue;
                  if (lower.includes('computation')) continue;
                  if (lower.includes('percentage')) continue;
                  if (lower.includes('of total income')) continue;

                  const matches = rowText.match(annexAmountRegex) || [];
                  const parsed = matches
                    .map((s) => parseFloat(s.replace(/,/g, '')))
                    .filter((v) => !Number.isNaN(v));

                  // Layout: "Total Income  <PrevYear>  <CurrYear>"
                  if (parsed.length >= 1) {
                    totalIncomePrevYear = parsed[0];
                    break outer;
                  }
                }
              }

              if (totalIncomePrevYear !== null) {
                const isMerit = totalIncomePrevYear > 0;
                const formatted = totalIncomePrevYear.toLocaleString(
                  'en-IN',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                );
                const com50 = (
                  totalIncomePrevYear * 0.5
                ).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const staff30 = (
                  totalIncomePrevYear * 0.3
                ).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

                const meritNarrative = `Annexure-8 verification shows the Society generated a positive Total Income of ₹${formatted} in the previous year, which provides a valid base for the Section 115-D ceilings of the APCS Act, 1964 read with NABARD norms — Cost of Management capped at 50% (₹${com50}) and Staff Cost at 30% (₹${staff30}) of Total Income. The Managing Committee and Chief Executive Officer are commended for positive revenue generation; eligibility against the said ceilings is separately assessed from the Staff Cost % / COM % ratios in Annexure-8.`;
                const demeritNarrative = `Annexure-8 shows the Society's Total Income for the previous year at ₹${formatted}, which is at or below zero. With a negative income base, the Section 115-D ceilings — Cost of Management (50%) and Staff Cost (30%) — become inoperative, rendering the Society ineligible to incur such expenses to that extent and exposing the CEO (under Section 55-A) and Managing Committee to joint responsibility. The CEO is directed to augment interest income, pursue overdue recovery under Section 30(xxii) read with Rule 41(C)(6), and rationalise expenditure; persistent non-compliance attracts direction under Section 54 of the Act.`;

                narrativesAccum.push({
                  key: 'annexure8',
                  fileName: entryName,
                  title: 'Annexure-8 · Computation of Total Income',
                  metricLabel: 'Total Income · Prev. Year',
                  metricValue: `₹${formatted}`,
                  status: isMerit ? 'merit' : 'demerit',
                  narrative: isMerit
                    ? meritNarrative
                    : demeritNarrative,
                });
              } else {
                narrativesAccum.push({
                  key: 'annexure8',
                  fileName: entryName,
                  title: 'Annexure-8 · Computation of Total Income',
                  metricLabel: 'Total Income · Prev. Year',
                  metricValue: '—',
                  status: 'unread',
                  narrative:
                    'Unable to identify the "Total Income" row in Annexure-8 — the file format may differ from the expected layout. Manual verification recommended.',
                });
              }

              // === Annexure-8 — Percentage of Staff Cost / COM to Total Income ===
              let staffCostPct = null;
              let comPct = null;

              for (let pn = 1; pn <= pdfDocument.numPages; pn++) {
                const page = await pdfDocument.getPage(pn);
                const tc = await page.getTextContent();
                const rowsMap = {};
                tc.items.forEach((it) => {
                  const y = Math.round(it.transform[5]);
                  if (!rowsMap[y]) rowsMap[y] = [];
                  rowsMap[y].push({
                    text: it.str,
                    x: it.transform[4],
                  });
                });
                const ys = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);
                for (const y of ys) {
                  const rowText = rowsMap[y]
                    .slice()
                    .sort((a, b) => a.x - b.x)
                    .map((e) => e.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  const lower = rowText.toLowerCase();
                  const matches = rowText.match(annexAmountRegex) || [];
                  const parsed = matches
                    .map((s) => parseFloat(s.replace(/,/g, '')))
                    .filter((v) => !Number.isNaN(v));
                  if (parsed.length === 0) continue;

                  if (
                    lower.includes('percentage of staff cost') &&
                    staffCostPct === null
                  ) {
                    staffCostPct = parsed[parsed.length - 1];
                  } else if (
                    lower.includes('percentage of com') &&
                    comPct === null
                  ) {
                    comPct = parsed[parsed.length - 1];
                  }
                }
              }

              if (staffCostPct !== null || comPct !== null) {
                const sc = staffCostPct;
                const cm = comPct;
                const scFmt =
                  sc === null
                    ? '—'
                    : `${sc.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })}%`;
                const cmFmt =
                  cm === null
                    ? '—'
                    : `${cm.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })}%`;

                // Section 115-D eligibility ceilings: Staff Cost ≤ 30% and
                // Cost of Management ≤ 50% of Total Income. A ratio is a
                // demerit if it EXCEEDS its ceiling, or is negative (which
                // arises only on a negative income base).
                const STAFF_LIMIT = 30;
                const COM_LIMIT = 50;
                const negativeStaff = sc !== null && sc < 0;
                const negativeCOM = cm !== null && cm < 0;
                const exceedsStaff = sc !== null && sc > STAFF_LIMIT;
                const exceedsCOM = cm !== null && cm > COM_LIMIT;
                const isDemeritPct =
                  negativeStaff ||
                  negativeCOM ||
                  exceedsStaff ||
                  exceedsCOM;

                // Precise description of each ceiling breach.
                const breaches = [];
                if (exceedsStaff)
                  breaches.push(
                    `the Staff Cost ratio at ${scFmt} exceeds the prescribed ceiling of 30% of Total Income`
                  );
                else if (negativeStaff)
                  breaches.push(
                    `the Staff Cost ratio is negative (${scFmt}), which arises only on a negative income base`
                  );
                if (exceedsCOM)
                  breaches.push(
                    `the Cost of Management ratio at ${cmFmt} exceeds the prescribed ceiling of 50% of Total Income`
                  );
                else if (negativeCOM)
                  breaches.push(
                    `the Cost of Management ratio is negative (${cmFmt}), which arises only on a negative income base`
                  );
                const breachText = breaches.join('; and ');
                const hasNegative = negativeStaff || negativeCOM;

                // Concrete eligibility figures, when the income base is known.
                const hasIncomeBase =
                  typeof totalIncomePrevYear === 'number' &&
                  totalIncomePrevYear > 0;
                const fmtAmt = (v) =>
                  `₹${v.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                const eligCtx = hasIncomeBase
                  ? ` On a Total Income of ${fmtAmt(
                      totalIncomePrevYear
                    )}, the Section 115-D eligibility limits are ${fmtAmt(
                      totalIncomePrevYear * 0.3
                    )} (30%) for Staff Cost and ${fmtAmt(
                      totalIncomePrevYear * 0.5
                    )} (50%) for Cost of Management.`
                  : '';

                const meritPct = `Annexure-8 shows Staff Cost at ${scFmt} (ceiling 30%) and Cost of Management at ${cmFmt} (ceiling 50%) of Total Income — both within the eligibility limits prescribed under Section 115-D of the APCS Act, 1964 read with NABARD norms. The Managing Committee and CEO are commended for keeping establishment and management costs within the permissible ratios.`;
                const demeritPct = `Annexure-8 discloses that ${breachText}, in breach of the Section 115-D eligibility ceilings of the APCS Act, 1964 read with NABARD norms (Staff Cost 30% and Cost of Management 50% of Total Income).${eligCtx} ${
                  hasNegative
                    ? 'A negative ratio indicates expenditure has outstripped income for the period, rendering the ceilings inoperative and the Society ineligible to incur the said costs to that extent. '
                    : 'The expenditure in excess of the prescribed ceiling is irregular to that extent. '
                }The Managing Committee and CEO shall pursue augmentation of interest income, overdue recovery under Section 30(xxii) read with Rule 41(C)(6) and rigorous expense control to bring the ratios within the prescribed limits; persistent breach attracts direction under Section 54 and surcharge under Section 60.`;

                narrativesAccum.push({
                  key: 'annexure8Pct',
                  fileName: entryName,
                  title:
                    'Annexure-8 · Staff Cost % & COM % to Total Income',
                  metricLabel: 'Staff Cost % · COM %',
                  metricValue: `${scFmt} · ${cmFmt}`,
                  status: isDemeritPct ? 'demerit' : 'merit',
                  narrative: isDemeritPct ? demeritPct : meritPct,
                });
              }
            }

            // === Annexure-11 — Legal Action coverage on Loans audit ===
            if (/annexure[\s\-]*11(?![0-9])/i.test(entryName)) {
              // Look for distinct large numeric values in the PDF;
              // an Annexure-11 with real overdue/legal-action data
              // will contain multiple amounts. An empty/clean form
              // contains only zeros → no overdues → merit.
              const healed11 = pdfText.replace(
                /(\d)\s*,\s*(?=\d)/g,
                '$1,'
              );
              const annex11Pattern =
                /\b\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\b\d{5,12}(?:\.\d{1,2})?|\b\d{4,12}\.\d{1,2}/g;
              const raw11 = healed11.match(annex11Pattern) || [];
              const v11 = raw11
                .map((s) => parseFloat(s.replace(/,/g, '')))
                .filter(
                  (v) =>
                    !Number.isNaN(v) && v >= 10000 && v <= 1e12
                );
              const uniqueOverdue = new Set(v11);
              const totalOverdueAmt = Array.from(uniqueOverdue)
                .slice(0, 10)
                .reduce((s, v) => s + v, 0);

              const hasOverdues = uniqueOverdue.size >= 3;

              const overdueDisplay = totalOverdueAmt.toLocaleString(
                'en-IN',
                { maximumFractionDigits: 2 }
              );

              const merit11 = `Annexure-11 verification confirms the Society has either no outstanding overdues or has initiated appropriate legal proceedings on all overdue accounts. The Managing Committee has discharged its duty under Section 30(xxii) of the APCS Act, 1964 and the CEO has complied with Rule 41(C)(6) by declaring overdue debtors quarterly. This proactive recovery posture safeguards member capital and is commendable.`;
              const demerit11 = `Overdue loans of approximately ₹${overdueDisplay} remain unrecovered, with legal action not adequately initiated. This breaches Section 30(xxii) of the APCS Act, 1964 (Managing Committee's duty to review overdues) read with Rule 41(C)(6) of the Rules. The Managing Committee shall take stringent steps including Section 71 recovery certificates, decree filing and execution petitions; failure exposes the Society to time-barred loans and the CEO/Managing Committee to personal responsibility, surcharge under Section 60, and direction by the Registrar under Section 54.`;

              narrativesAccum.push({
                key: 'annexure11',
                fileName: entryName,
                title:
                  'Annexure-11 · Legal Action on Loans & Advances',
                metricLabel: 'Aggregate Overdue Amount',
                metricValue: hasOverdues
                  ? `₹${overdueDisplay}`
                  : 'Nil',
                status: hasOverdues ? 'demerit' : 'merit',
                narrative: hasOverdues ? demerit11 : merit11,
              });
            }

            // === Schedule-16B — Sundry Debtors aged > 3 years (No scope for realization) ===
            if (/schedule[\s\-]*16[\s\-]*b/i.test(entryName)) {
              const docS16B = await getEntryDoc();

              const amtRe16B =
                /-?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|-?\d+\.\d{1,2}/g;

              let total3plus = 0;
              const allAbove3Vals = [];

              for (let pn = 1; pn <= docS16B.numPages; pn++) {
                const page = await docS16B.getPage(pn);
                const tc = await page.getTextContent();

                // Group items by y
                const rowsMap = {};
                tc.items.forEach((it) => {
                  const y = Math.round(it.transform[5]);
                  if (!rowsMap[y]) rowsMap[y] = [];
                  rowsMap[y].push({
                    text: it.str,
                    x: it.transform[4],
                  });
                });

                // Find the "above 3 years" header y
                const ys = Object.keys(rowsMap)
                  .map(Number)
                  .sort((a, b) => b - a);

                let headerY = null;
                for (const y of ys) {
                  const t = rowsMap[y]
                    .map((e) => e.text)
                    .join(' ')
                    .toLowerCase();
                  if (
                    t.includes('above 3 year') ||
                    t.includes('no scope for realization') ||
                    t.includes('no scope for realisation')
                  ) {
                    headerY = y;
                    break;
                  }
                }
                if (headerY === null) continue;

                // The data row for the "above 3 years" column sits a
                // few lines BELOW the header (lower y value). In the
                // landscape/transposed layout we observed, the data
                // row is typically the next y-band below the header
                // within ~40 pts that contains comma-formatted
                // amounts.
                const candidateYs = ys.filter(
                  (y) => y < headerY && y >= headerY - 50
                );
                for (const y of candidateYs) {
                  const text = rowsMap[y]
                    .map((e) => e.text)
                    .join(' ');
                  // skip the header-continuation line "(₹) for realization"
                  const lower = text.toLowerCase();
                  if (
                    lower.includes('for realiz') ||
                    lower.includes('100%') ||
                    lower.includes('years')
                  )
                    continue;
                  const amts = (text.match(amtRe16B) || [])
                    .map((s) =>
                      parseFloat(s.replace(/,/g, ''))
                    )
                    .filter(
                      (v) =>
                        !Number.isNaN(v) && v >= 0 && v < 1e12
                    );
                  for (const v of amts) {
                    allAbove3Vals.push(v);
                    total3plus += v;
                  }
                }
              }

              const fmt16B = (v) =>
                `₹${v.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;

              // Threshold: treat anything ≥ ₹10,000 in the
              // above-3-years column as a material non-realisable
              // debtor balance requiring write-off consideration.
              if (total3plus >= 10000) {
                narrativesAccum.push({
                  key: 'schedule16b',
                  fileName: entryName,
                  title:
                    'Schedule-16B · Sundry Debtors Aged > 3 Years (Non-Realisable)',
                  metricLabel: 'Aged > 3 Years · 100% Provision Required',
                  metricValue: fmt16B(total3plus),
                  above3Total: fmt16B(total3plus),
                  status: 'demerit',
                  narrative: `Schedule-16B discloses Sundry Debtors of ${fmt16B(total3plus)} classified as "Due from above 3 years — No scope for realisation (100%)". Continued retention of these aged balances without full 100% provisioning or write-off breaches Section 55-A of the APCS Act, 1964, the NABARD IRAC norms and the CAS Manual, and overstates net realisable assets. The CEO shall (i) prepare a party-wise ageing schedule for the Managing Committee, (ii) make full 100% provisioning in the books, (iii) issue Section 71 recovery notices where still maintainable, and (iv) move a write-off resolution before the General Body for irrecoverable items; failure attracts direction under Section 54 and surcharge consideration under Section 60.`,
                });
              }
            }

            setProcessedCount((c) => c + 1);
          }
        } catch (fileError) {
          console.error('PDF Processing Error:', entryName, fileError);
        }
      }

      setCurrentStage('Compiling audit report…');
      setCurrentProcessingFile('');

      // === Trail Balance narrative — uses the audit-tally result ===
      const trailBalanceResult = results.find(
        (r) => r.statementType === 'Trail Balance'
      );
      if (trailBalanceResult) {
        const a1 = trailBalanceResult.amount1.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const a2 = trailBalanceResult.amount2.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const diff = trailBalanceResult.difference.toLocaleString(
          'en-IN',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        );

        const tbMerit = `The Trail Balance stands tallied for the audit period, with the 1st Page Grand Total of ₹${a1} matching the 2nd Page Grand Total of ₹${a2}. The accounting books are mathematically balanced and the ERP ledger reflects accurate double-entry posting under Section 55-A of the APCS Act, 1964 and the CAS Manual. The CEO and accounting staff are commended for record integrity that supports downstream financial statements.`;
        const tbDemerit = `The Trail Balance shows a discrepancy of ₹${diff} between the 1st Page Grand Total (₹${a1}) and 2nd Page Grand Total (₹${a2}). This non-tallying indicates errors in posting, classification or reconciliation in the ERP module, contrary to Section 55-A of the APCS Act, 1964 and the CAS Manual, and undermines the reliability of downstream statements. The CEO is directed under Section 54 to reconcile the account heads and submit a corrected Trail Balance at the next monthly audit; persistent imbalance may attract surcharge under Section 60.`;

        narrativesAccum.push({
          key: 'trailBalance',
          fileName: trailBalanceResult.fileName,
          title: 'Trail Balance · Tally Verification',
          metricLabel: trailBalanceResult.tallied
            ? 'Tallied Grand Total'
            : 'Difference Detected',
          metricValue: trailBalanceResult.tallied
            ? `₹${a1}`
            : `₹${diff}`,
          status: trailBalanceResult.tallied ? 'merit' : 'demerit',
          narrative: trailBalanceResult.tallied ? tbMerit : tbDemerit,
        });
      }

      // Sort so demerits surface first, then merits, then unread
      const statusOrder = { demerit: 0, merit: 1, unread: 2 };
      narrativesAccum.sort(
        (a, b) =>
          (statusOrder[a.status] ?? 9) -
          (statusOrder[b.status] ?? 9)
      );

      setAuditNarratives(narrativesAccum);
      setFileTableData(fileTableDataMap);
      setDetectedFiles([...uploadedPdfFiles]);

      const statementOrder = [
        'Receipts and Payments',
        'Trail Balance',
        'Trading Account',
        'Profit and Loss Account',
        'Profit and Loss Appropriation',
        'Balance Sheet',
      ];

      const orderedResults = [...results].sort((a, b) => {
        const ai = statementOrder.indexOf(a.statementType);
        const bi = statementOrder.indexOf(b.statementType);
        return (
          (ai === -1 ? statementOrder.length : ai) -
          (bi === -1 ? statementOrder.length : bi)
        );
      });

      setAuditResults(orderedResults);

      const missingCoreFiles = computeMissingRequired(uploadedPdfFiles);

      setMissingFiles(missingCoreFiles);

      if (missingCoreFiles.length === 0) {
        setAllFilesUploaded(true);
        setUploadStatusMessage(
          'All files are uploaded Successfully'
        );
      } else {
        setAllFilesUploaded(false);
        setUploadStatusMessage('');
      }
    } catch (error) {
      alert(`ZIP Processing Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Validates that a File object is (a) a PDF and (b) contains
  // tabular financial data (≥2 distinct Indian-format amounts).
  async function validatePdfReport(file) {
    const isPdfExt = /\.pdf$/i.test(file.name);
    const isPdfMime =
      file.type === 'application/pdf' ||
      file.type === 'application/x-pdf' ||
      file.type === '';

    if (!isPdfExt || !isPdfMime) {
      return {
        ok: false,
        reason: 'Not a PDF file',
        fileName: file.name,
      };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const pdfDocument = await PDFJS.getDocument({ data }).promise;

      let pdfText = '';
      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        pdfText +=
          textContent.items.map((item) => item.str).join(' ') + '\n';
      }

      const healed = pdfText.replace(/(\d)\s*,\s*(?=\d)/g, '$1,');
      const pattern =
        /\b\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\b\d{5,12}(?:\.\d{1,2})?|\b\d{4,12}\.\d{1,2}/g;
      const raw = healed.match(pattern) || [];
      const numeric = raw
        .map((s) => parseFloat(s.replace(/,/g, '')))
        .filter(
          (v) => !Number.isNaN(v) && v >= 1000 && v <= 1e12
        );
      const unique = new Set(numeric);

      if (unique.size < 2) {
        return {
          ok: false,
          reason: 'No financial table data detected',
          fileName: file.name,
          pages: pdfDocument.numPages,
        };
      }

      return {
        ok: true,
        fileName: file.name,
        pages: pdfDocument.numPages,
        distinctAmounts: unique.size,
        sizeKB: Math.round(file.size / 1024),
      };
    } catch (e) {
      return {
        ok: false,
        reason: 'Could not read PDF',
        fileName: file.name,
      };
    }
  }

  // Extract daily closing-balance rows from a cash-book PDF.
  // Format: <Sl> <DD-MM-YYYY> <OB> <Dr> <Cr> <CB>  (CB = last amount on the row)
  async function extractCashBookRows(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFJS.getDocument({ data }).promise;
    const dateRe = /\b(\d{2})[-\/](\d{2})[-\/](\d{4})\b/;
    const amtRe =
      /-?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|-?\d+\.\d{1,2}/g;
    const rows = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const rowsMap = {};
      tc.items.forEach((it) => {
        const y = Math.round(it.transform[5]);
        if (!rowsMap[y]) rowsMap[y] = [];
        rowsMap[y].push({ text: it.str, x: it.transform[4] });
      });
      const ys = Object.keys(rowsMap)
        .map(Number)
        .sort((a, b) => b - a);
      for (const y of ys) {
        const rowText = rowsMap[y]
          .slice()
          .sort((a, b) => a.x - b.x)
          .map((e) => e.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const dateMatch = rowText.match(dateRe);
        if (!dateMatch) continue;
        // skip header rows that include "From Date" or "To Date"
        if (/from\s*date|to\s*date|printed\s*on/i.test(rowText))
          continue;
        const rawAmts = rowText.match(amtRe) || [];
        const amts = rawAmts
          .map((s) => parseFloat(s.replace(/,/g, '')))
          .filter((v) => !Number.isNaN(v));
        if (amts.length < 1) continue;
        // For cashbook layout (OB, Dr, Cr, CB) the closing balance
        // is the LAST amount on the row.
        const closing = amts[amts.length - 1];
        rows.push({
          date: dateMatch[0],
          closingBalance: closing,
        });
      }
    }
    return rows;
  }

  function analyzeCashBook(rows, threshold) {
    let totalInterest = 0;
    let nonCompliantDays = 0;
    let highestCB = 0;
    let highestDate = '';
    const analyzed = rows.map((r, idx) => {
      const excess = Math.max(0, r.closingBalance - threshold);
      const isCompliant = r.closingBalance <= threshold;
      const interest = isCompliant ? 0 : excess * 0.12;
      if (!isCompliant) nonCompliantDays += 1;
      if (r.closingBalance > highestCB) {
        highestCB = r.closingBalance;
        highestDate = r.date;
      }
      totalInterest += interest;
      return {
        slNo: idx + 1,
        date: r.date,
        closingBalance: r.closingBalance,
        excess,
        status: isCompliant ? 'Compliant' : 'Non-Compliant',
        interest,
      };
    });
    return {
      rows: analyzed,
      totalDays: rows.length,
      nonCompliantDays,
      totalInterest,
      threshold,
      highestCB,
      highestDate,
    };
  }

  // ── Concurrent Audit / Periodical Inspection — PDF upload & analysis ──
  async function handleConcurrentUpload(file) {
    if (!file) return;
    setConcurrentProcessing(true);
    setConcurrentError('');
    setConcurrentDetected([]);
    setConcurrentMeta(null);
    setConcurrentFileName(file.name || '');
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parsePdfArrayBufferToPages(buffer, file.name);
      const fullText = parsed.pages.map((p) => p.text).join('\n');
      if (!fullText.trim()) {
        setConcurrentError(
          'No readable text could be extracted from the PDF. It may be a scanned image — please upload a text-based statement.'
        );
        setConcurrentProcessing(false);
        return;
      }
      const meta = extractConcurrentMeta(fullText, file.name);
      const detected = analyzeConcurrentAudit(fullText);
      setConcurrentMeta(meta);
      setConcurrentDetected(detected);
    } catch (e) {
      console.error('Concurrent audit parse error:', e);
      setConcurrentError(
        'Could not read the PDF. Please ensure it is a valid, text-based statement and try again.'
      );
    }
    setConcurrentProcessing(false);
  }

  // Derived concurrent defect sheet: auto-detected + user-added, with the
  // uniform opening phrase and abbreviation expansion applied (same style as
  // the Audit Defects sheet).
  const concurrentSheet = useMemo(() => {
    const all = [
      ...concurrentDetected,
      ...concurrentCustom.map((d) => ({
        category: d.category,
        title: d.title,
        narrative: d.narrative,
        source: 'custom',
      })),
    ];
    if (all.length === 0) return null;
    const demerits = all.map((d) => ({
      category: d.category,
      title: d.title,
      narrative: caExpandAbbr(caPrependObservation(d.narrative)),
      source: d.source,
    }));
    const today = new Date();
    const inspDate = `${String(today.getDate()).padStart(2, '0')}-${String(
      today.getMonth() + 1
    ).padStart(2, '0')}-${today.getFullYear()}`;
    return {
      societyName: (concurrentMeta && concurrentMeta.societyName) || 'Society',
      period: (concurrentMeta && concurrentMeta.period) || '',
      branch: (concurrentMeta && concurrentMeta.branch) || '',
      inspDate,
      demerits,
    };
  }, [concurrentDetected, concurrentCustom, concurrentMeta]);

  // Print / download the concurrent inspection defect sheet (plain document).
  function printConcurrentSheet() {
    if (!concurrentSheet || concurrentSheet.demerits.length === 0) {
      alert('No defects to print. Upload a statement and analyse it first.');
      return;
    }
    const escapeHtml = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const categories = [
      { key: 'financial', label: 'B.1 · FINANCIAL IRREGULARITIES' },
      { key: 'accounting', label: 'B.2 · ACCOUNTING IRREGULARITIES' },
      { key: 'administrative', label: 'B.3 · ADMINISTRATIVE IRREGULARITIES' },
    ];
    let runningNo = 0;
    const body = categories
      .map((c) => {
        const items = concurrentSheet.demerits.filter(
          (d) => d.category === c.key
        );
        if (items.length === 0) return '';
        return `
          <h3 class="subhead">${escapeHtml(c.label)}</h3>
          <ol class="items" start="${runningNo + 1}">
            ${items
              .map((d) => {
                runningNo += 1;
                return `<li><div class="item-title">${escapeHtml(
                  d.title
                )}</div><p class="item-narrative">${escapeHtml(
                  d.narrative
                )}</p></li>`;
              })
              .join('')}
          </ol>`;
      })
      .join('');
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<title>CONCURRENT AUDIT — ${escapeHtml(concurrentSheet.societyName)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Times New Roman',Times,serif;color:#000;background:#fff;margin:0;padding:28px 36px 60px;font-size:12pt;line-height:1.55}
  .doc-header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}
  .society{font-size:14pt;font-weight:700;margin:0 0 4px}
  .doc-title{font-size:15pt;font-weight:800;letter-spacing:.06em;margin:4px 0 0}
  .meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:10.5pt;margin:8px 0 14px}
  .subhead{font-size:12pt;font-weight:800;margin:16px 0 6px;border-bottom:1px solid #000;padding-bottom:3px}
  ol.items{margin:0 0 8px;padding-left:26px}
  ol.items li{margin-bottom:10px}
  .item-title{font-weight:700}
  .item-narrative{margin:2px 0 0;text-align:justify}
  .doc-footer{margin-top:22px;border-top:1px solid #000;padding-top:8px;font-size:10pt;text-align:center}
  .actions{position:fixed;top:10px;right:14px;display:flex;gap:6px}
  .actions button{background:#111;color:#fff;border:0;padding:8px 14px;font-weight:700;cursor:pointer;border-radius:4px}
  @page{size:A4 portrait;margin:14mm}
  @media print{.actions{display:none}body{padding:0}}
</style></head><body>
<div class="actions">
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()">✕ Close</button>
</div>
<div class="doc-header">
  <p class="society">${escapeHtml(concurrentSheet.societyName)} — Primary Agricultural Cooperative Credit Society Ltd.</p>
  <p class="doc-title">CONCURRENT AUDIT / PERIODICAL INSPECTION — DEFECT SHEET</p>
</div>
<div class="meta">
  ${concurrentSheet.period ? `<div><b>Period :</b> ${escapeHtml(concurrentSheet.period)}</div>` : ''}
  ${concurrentSheet.branch ? `<div><b>Branch :</b> ${escapeHtml(concurrentSheet.branch)}</div>` : ''}
  <div><b>Inspection Date :</b> ${escapeHtml(concurrentSheet.inspDate)}</div>
</div>
<div><h2 style="font-size:13pt;margin:0 0 4px">DEFECTS &amp; IRREGULARITIES</h2></div>
${body}
<div class="doc-footer">This is System Generated AI Report - Verify before use<br/>Generated by COOP·AUDIT·AI — ${escapeHtml(
      concurrentSheet.inspDate
    )}</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  async function handleCashBookUpload(file) {
    if (!file) return;
    setCashBookProcessing(true);
    setCashBookError('');
    setCashBookReport(null);
    setCashBookAnalysis(null);
    setCashBookIncludeInDefects(false);

    const result = await validatePdfReport(file);

    if (!result.ok) {
      setCashBookError(
        'Uploaded file is not in required format please upload once again'
      );
      setCashBookReport({ ...result, ok: false });
      setCashBookProcessing(false);
      return;
    }

    setCashBookReport(result);

    try {
      const threshold = parseFloat(cashBalanceThreshold) || 500;
      const rows = await extractCashBookRows(file);
      const analysis = analyzeCashBook(rows, threshold);
      setCashBookAnalysis(analysis);
    } catch (e) {
      console.error('Cash book parse error:', e);
    }
    setCashBookProcessing(false);
  }

  // Re-run analysis when threshold changes (without re-validating PDF).
  // The user can edit the threshold AFTER uploading the file.
  useEffect(() => {
    if (!cashBookReport || !cashBookReport.ok) return;
    // We don't have the raw File reference any more; recompute from
    // the previously-parsed rows if we cached them.
    if (!cashBookAnalysis || !cashBookAnalysis.rows) return;
    const threshold = parseFloat(cashBalanceThreshold) || 500;
    if (threshold === cashBookAnalysis.threshold) return;
    const rawRows = cashBookAnalysis.rows.map((r) => ({
      date: r.date,
      closingBalance: r.closingBalance,
    }));
    setCashBookAnalysis(analyzeCashBook(rawRows, threshold));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashBalanceThreshold]);

  // Lazy-load the bundled legal reference corpus the first time the
  // user opens AI Legal Chat. Already-loaded docs are not re-fetched.
  useEffect(() => {
    if (activeView !== 'aichat') return;
    if (corpusStatus === 'loading' || corpusStatus === 'ready') return;
    let cancelled = false;
    (async () => {
      setCorpusStatus('loading');
      setCorpusProgress({ done: 0, total: BUNDLED_LEGAL_REFS.length });
      const loaded = [];
      for (let i = 0; i < BUNDLED_LEGAL_REFS.length; i++) {
        const ref = BUNDLED_LEGAL_REFS[i];
        try {
          const resp = await fetch(ref.url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buffer = await resp.arrayBuffer();
          const parsed = await parsePdfArrayBufferToPages(
            buffer,
            ref.name
          );
          if (cancelled) return;
          loaded.push({
            id: ref.id,
            name: ref.name,
            pages: parsed.pages,
            source: 'bundled',
          });
          setCorpusProgress({
            done: i + 1,
            total: BUNDLED_LEGAL_REFS.length,
          });
        } catch (e) {
          console.error('Failed to load ref', ref.name, e);
        }
      }
      if (!cancelled) {
  setCorpus(loaded);
  setCorpusStatus(loaded.length > 0 ? 'ready' : 'empty');
}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  async function handleAddUserReference(file) {
    if (!file || !/\.pdf$/i.test(file.name)) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parsePdfArrayBufferToPages(
        buffer,
        file.name
      );
      setCorpus((prev) => [
        ...prev,
        {
          id: 'user-' + Date.now(),
          name: file.name,
          pages: parsed.pages,
          source: 'user',
        },
      ]);
    } catch (e) {
      console.error('Failed to parse user reference', e);
      alert(
        `Could not parse "${file.name}" as a PDF. Please upload a valid PDF file.`
      );
    }
  }

  function handleRemoveUserReference(id) {
    setCorpus((prev) => prev.filter((d) => d.id !== id));
  }

  // Compose an AI-narrated answer from corpus matches + the static
  // knowledge base. If we have indexed references and find matches,
  // we craft a narrative quoting top excerpts with citations.
  function answerWithCorpus(query) {
    if (corpus.length === 0) {
      // Fallback to static KB
      return {
        text: answerLegalQuery(query),
        citations: [],
      };
    }
    const hits = searchLegalCorpus(corpus, query, 4);
    if (hits.length === 0) {
      return {
        text:
          'No relevant excerpts were found in the bundled reference documents (APCS Act 1964, APCS Rules 1964, Audit Manual for PACS, Handbook on Statutory Functions, Handbook on Cooperative Laws). ' +
          answerLegalQuery(query),
        citations: [],
      };
    }
    // Build narrative
    const lead = `Based on a search of the ${corpus.length} reference document(s) indexed (${corpus
      .map((d) => d.name)
      .join('; ')}), the following passages are most relevant to your query:`;
    const citations = hits.map((h) => ({
      doc: h.doc.name,
      page: h.page.n,
      snippet: buildSnippet(h.page.text, query, 360),
      score: Math.round(h.score),
    }));
    // Concise synthesised narrative on top
    const synth = answerLegalQuery(query);
    return {
      text:
        lead +
        '\n\n— Synthesised narrative —\n' +
        synth,
      citations,
    };
  }

  // Column-aware parser for PACS Loan Recoveries Report.
  // Layout: PDF is rotated 90° (landscape). Each x-position is a separate
  // voucher/transaction. Each y-position is a column (Loan No, GL No,
  // Member, Total, Interest, Penal Interest, IOD, Principal Collected,
  // ROI, Due Date, Disbursal Date, Collection Date, etc.).
  // Loans span multiple consecutive vouchers (transactions). The Loan No
  // row defines loan boundaries; transactions falling between boundaries
  // belong to that loan.
  async function extractLoanRecoveryRows(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFJS.getDocument({ data }).promise;

    const allRecords = [];
    let runningSerial = 0;

    const parseDDMMYYYY = (s) => {
      if (!s) return null;
      const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) return null;
      return new Date(
        parseInt(m[3], 10),
        parseInt(m[2], 10) - 1,
        parseInt(m[1], 10)
      );
    };

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items
        .map((it) => ({
          x: it.transform[4],
          y: it.transform[5],
          text: it.str.trim(),
        }))
        .filter((it) => it.text);

      // PATTERN-BASED column-Y detection (more reliable than labels for
      // this rotated layout where multi-line labels confuse label-y matching).
      // We identify the Y of each column by finding items with the
      // expected text pattern, then taking the dominant Y (most common
      // rounded Y value across matching items at x>=155).

      const dataItems = items.filter((it) => it.x >= 155);

      const dominantY = (filtered) => {
        if (filtered.length === 0) return null;
        const counts = {};
        for (const it of filtered) {
          const y = Math.round(it.y);
          counts[y] = (counts[y] || 0) + 1;
        }
        let bestY = null;
        let bestCount = 0;
        for (const [y, c] of Object.entries(counts)) {
          if (c > bestCount) {
            bestCount = c;
            bestY = parseInt(y, 10);
          }
        }
        return bestY;
      };

      // Long digit strings = loan numbers
      const loanNoCandidates = dataItems.filter((it) =>
        /^\d{14,20}$/.test(it.text)
      );
      const yLoanNo = dominantY(loanNoCandidates);
      if (yLoanNo === null) continue;

      // Get items at a given y (with tolerance) and x >= 155
      const itemsAtY = (y, tol = 4) =>
        y === null
          ? []
          : dataItems.filter(
              (it) => Math.abs(it.y - y) <= tol
            );

      const loanNoItems = itemsAtY(yLoanNo, 4).sort(
        (a, b) => a.x - b.x
      );
      if (loanNoItems.length === 0) continue;

      // Detect Y for all date columns (DD/MM/YYYY)
      const allDateItems = dataItems.filter((it) =>
        /^\d{2}\/\d{2}\/\d{4}$/.test(it.text)
      );
      const dateYCounts = {};
      allDateItems.forEach((it) => {
        const y = Math.round(it.y);
        dateYCounts[y] = (dateYCounts[y] || 0) + 1;
      });
      const dateYs = Object.entries(dateYCounts)
        .filter(([, c]) => c >= 3)
        .map(([y]) => parseInt(y, 10))
        .sort((a, b) => b - a); // top to bottom in PDF
      const yDueDate = dateYs[0] || null;
      const yDisbursal = dateYs[1] || null;
      const yCollection = dateYs[2] || null;

      // Detect Y for ROI (small decimal like 12.50, 7.50)
      const roiCandidates = dataItems.filter((it) =>
        /^\d{1,2}\.\d{2}$/.test(it.text)
      );
      const yROI = dominantY(roiCandidates);

      // Detect Y for amount columns — matches comma-formatted
      // amounts (1,000.00) OR pure decimal amounts including zero (0.00)
      const amountRe =
        /^(?:\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?|\d+\.\d{2})$/;
      const amountCandidates = dataItems.filter((it) =>
        amountRe.test(it.text)
      );
      const amountYCounts = {};
      amountCandidates.forEach((it) => {
        const y = Math.round(it.y);
        amountYCounts[y] = (amountYCounts[y] || 0) + 1;
      });
      const amountYs = Object.entries(amountYCounts)
        .filter(([, c]) => c >= 1)
        .map(([y]) => parseInt(y, 10))
        .sort((a, b) => b - a); // top to bottom in PDF

      // Find left-margin column labels to disambiguate columns where
      // SANCTIONED-PRINCIPAL and PRINCIPAL-COLLECTED sit at nearby Ys.
      const labelAtX = (re) => {
        const m = items.find(
          (it) => it.x < 160 && re.test(it.text.toLowerCase())
        );
        return m ? m.y : null;
      };

      // Principal Collected — labels "Collected" (y=610) and "Principal" (y=611)
      const yPrincipalLabelText =
        labelAtX(/^collected$/) || labelAtX(/^principal$/);

      // Total — label "Total (₹)" at y=857
      const yTotalLabelText = labelAtX(/^total\s*\(₹\)$/) || labelAtX(/^total$/);

      // Helper: pick a "values Y" near a label, preferring the Y with
      // the MOST item count (per-voucher columns have more items than
      // per-loan summary columns at nearby Ys).
      const pickValuesY = (labelY, maxOffset = 30) => {
        if (labelY === null) return null;
        const candidates = amountYs.filter(
          (y) => y > labelY && y - labelY <= maxOffset
        );
        if (candidates.length === 0) return null;
        // Sort by item count desc; ties broken by closer-to-label first
        candidates.sort((a, b) => {
          const dc = amountYCounts[b] - amountYCounts[a];
          if (dc !== 0) return dc;
          return Math.abs(a - labelY) - Math.abs(b - labelY);
        });
        return candidates[0];
      };

      const yTotal =
        pickValuesY(yTotalLabelText, 30) || amountYs[0] || null;
      const yPrincipalLabel =
        pickValuesY(yPrincipalLabelText, 30) ||
        (yROI !== null
          ? amountYs.filter((y) => y > yROI).sort((a, b) => a - b)[0]
          : null);

      // Label-range based detection for Interest, Penal Interest, IOD,
      // Others — each column gets a y-RANGE [label_y + 1, midpoint_to_next_label_up]
      const yInterestLabel = labelAtX(/^interest\s*\(₹\)$/);
      const yPenalLabelRaw = labelAtX(/^penal$/);
      const yIODLabel = labelAtX(/^iod\s*\(₹\)?$|^iod/);
      const yOthersLabel = labelAtX(/^others\s*\(₹\)?$|^others/);

      // Build a sorted list of all amount-column labels (asc by y) so we
      // can derive each column's value y-range as (label.y, midpoint-to-next-label-up).
      const labelList = [
        { name: 'principal', y: yPrincipalLabelText },
        { name: 'interest', y: yInterestLabel },
        { name: 'penal', y: yPenalLabelRaw },
        { name: 'iod', y: yIODLabel },
        { name: 'others', y: yOthersLabel },
        { name: 'total', y: yTotalLabelText },
      ]
        .filter((l) => l.y !== null)
        .sort((a, b) => a.y - b.y);

      const colYRanges = {};
      for (let i = 0; i < labelList.length; i++) {
        const cur = labelList[i];
        const next = labelList[i + 1];
        const upper = next ? (cur.y + next.y) / 2 : cur.y + 60;
        colYRanges[cur.name] = { lower: cur.y + 1, upper };
      }

      // GL No: 3-5 digit numeric (not a date) at a y above member name
      const glCandidates = dataItems.filter((it) =>
        /^\d{3,5}$/.test(it.text)
      );
      const yGlNo = dominantY(glCandidates);

      // Member name area: find the "Member" label position at the
      // left margin (x<155) and use a narrow ±12 band around it.
      const memberLabel = items.find(
        (it) => it.x < 155 && /^member$/i.test(it.text)
      );
      const yMemberBand = memberLabel ? memberLabel.y : null;

      // Build loan boundaries. Each loan number sits over a cluster of
      // voucher columns; vouchers immediately around the loan number
      // (within ~6-8 units) belong to that loan. We use an ASYMMETRIC
      // boundary so a voucher past 40% of the gap to the next loan is
      // assigned to the NEXT loan rather than the current one — which
      // matches the visual grouping in PACS Loan Recovery reports where
      // each loan number caps its voucher cluster tightly. Cap the
      // half-band at 15 units so very wide gaps don't allow a loan to
      // claim distant vouchers.
      const HALF_BAND_CAP = 15;
      const loanGroups = loanNoItems.map((ln, idx) => {
        const prevX =
          idx > 0 ? loanNoItems[idx - 1].x : -Infinity;
        const nextX =
          idx + 1 < loanNoItems.length
            ? loanNoItems[idx + 1].x
            : Infinity;
        const leftGap =
          prevX === -Infinity ? Infinity : ln.x - prevX;
        const rightGap =
          nextX === Infinity ? Infinity : nextX - ln.x;
        // Claim 60% of left gap (more permissive looking left) and
        // 40% of right gap (tighter looking right toward next loan).
        const leftClaim =
          leftGap === Infinity
            ? Infinity
            : Math.min(leftGap * 0.6, HALF_BAND_CAP + 10);
        const rightClaim =
          rightGap === Infinity
            ? Infinity
            : Math.min(rightGap * 0.4, HALF_BAND_CAP);
        const xLow =
          leftClaim === Infinity ? -Infinity : ln.x - leftClaim;
        const xHigh =
          rightClaim === Infinity ? Infinity : ln.x + rightClaim;
        return { loanNo: ln.text, xLow, xHigh };
      });

      // Use tighter tolerance for amount columns — sanctioned-principal
      // and principal-collected can sit only 2 units apart in y, so a
      // tolerance of 1.5 is required to avoid cross-contamination.
      const sumColInRange = (y, xLow, xHigh) => {
        return itemsAtY(y, 1.5)
          .filter((it) => it.x >= xLow && it.x < xHigh)
          .map((it) => parseFloat(it.text.replace(/,/g, '')))
          .filter((v) => !Number.isNaN(v))
          .reduce((s, v) => s + v, 0);
      };

      const firstInRange = (y, xLow, xHigh, tol = 4) => {
        const arr = itemsAtY(y, tol)
          .filter((it) => it.x >= xLow && it.x < xHigh)
          .sort((a, b) => a.x - b.x);
        return arr.length > 0 ? arr[0].text : null;
      };

      const allInRangeYBand = (yCenter, tol, xLow, xHigh) => {
        if (yCenter === null) return '';
        return items
          .filter(
            (it) =>
              Math.abs(it.y - yCenter) <= tol &&
              it.x >= xLow &&
              it.x < xHigh &&
              it.text.trim().length > 0
          )
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((it) => it.text.trim())
          .join(' ');
      };

      // Collection date in range — take LATEST date
      const latestDateInRange = (y, xLow, xHigh) => {
        const arr = itemsAtY(y, 4)
          .filter((it) => it.x >= xLow && it.x < xHigh)
          .map((it) => ({
            text: it.text,
            d: parseDDMMYYYY(it.text),
          }))
          .filter((o) => o.d);
        if (arr.length === 0) return null;
        arr.sort((a, b) => b.d.getTime() - a.d.getTime());
        return arr[0];
      };

      // Disbursal date in range — take EARLIEST
      const earliestDateInRange = (y, xLow, xHigh) => {
        const arr = itemsAtY(y, 4)
          .filter((it) => it.x >= xLow && it.x < xHigh)
          .map((it) => ({
            text: it.text,
            d: parseDDMMYYYY(it.text),
          }))
          .filter((o) => o.d);
        if (arr.length === 0) return null;
        arr.sort((a, b) => a.d.getTime() - b.d.getTime());
        return arr[0];
      };

      // Sum all amount items in a Y RANGE within the loan x-band
      const sumValuesInYRange = (range, xLow, xHigh) => {
        if (!range) return 0;
        return items
          .filter(
            (it) =>
              it.y > range.lower &&
              it.y < range.upper &&
              it.x >= xLow &&
              it.x < xHigh &&
              amountRe.test(it.text)
          )
          .map((it) => parseFloat(it.text.replace(/,/g, '')))
          .filter((v) => !Number.isNaN(v))
          .reduce((s, v) => s + v, 0);
      };

      // Sanctioned Principal Y is detected as: just below (label_y) and
      // contains values like 1,08,000 / 2,70,000 / 3,00,000 (per-loan
      // values shown once at the loan-number x position or one of its
      // voucher positions). Looking at ASAO sample, sanctioned values
      // sit at y≈612 (label at 610-611, just below it in PDF coords).
      const ySanctioned =
        yPrincipalLabelText !== null
          ? amountYs
              .filter(
                (y) =>
                  y > yPrincipalLabelText - 1 &&
                  y < yPrincipalLabelText + 4
              )
              .sort((a, b) => Math.abs(a - yPrincipalLabelText) - Math.abs(b - yPrincipalLabelText))[0]
          : null;

      for (const grp of loanGroups) {
        // Principal Collected: sum tightly around yPrincipalLabel (y=618)
        const principal = sumColInRange(
          yPrincipalLabel,
          grp.xLow,
          grp.xHigh
        );
        // Sanctioned Principal — separate column (loan amount)
        const sanctionedPrincipal =
          ySanctioned !== null
            ? sumColInRange(ySanctioned, grp.xLow, grp.xHigh)
            : 0;
        const total = sumColInRange(yTotal, grp.xLow, grp.xHigh);

        // Sum Interest / Penal Interest / IOD / Others from their
        // respective label-bounded Y ranges (rather than a single y).
        // Falls back to (Total - Principal) only if no Interest range
        // is detected.
        const interest = colYRanges.interest
          ? sumValuesInYRange(colYRanges.interest, grp.xLow, grp.xHigh)
          : 0;
        const penalInterest = colYRanges.penal
          ? sumValuesInYRange(colYRanges.penal, grp.xLow, grp.xHigh)
          : 0;
        const iod = colYRanges.iod
          ? sumValuesInYRange(colYRanges.iod, grp.xLow, grp.xHigh)
          : 0;
        const others = colYRanges.others
          ? sumValuesInYRange(colYRanges.others, grp.xLow, grp.xHigh)
          : 0;

        // Total Interest Received = Interest + Penal Interest + IOD
        // (per user spec; excludes "Others")
        const totalInterestReceived =
          colYRanges.interest
            ? interest + penalInterest + iod
            : Math.max(0, total - principal);

        // ROI is constant per loan — take first value
        const roiStr = firstInRange(yROI, grp.xLow, grp.xHigh, 6);
        const baseROI = roiStr
          ? parseFloat(roiStr.replace(/,/g, '')) || 0
          : 0;

        // GL No
        const glNoStr = firstInRange(yGlNo, grp.xLow, grp.xHigh, 6);

        // Member name — narrow ±12 band around the "Member" label
        const memberCandidates =
          yMemberBand !== null
            ? items.filter(
                (it) =>
                  it.x >= grp.xLow &&
                  it.x < grp.xHigh &&
                  /^[A-Za-z][A-Za-z\s.()\-]+$/.test(it.text) &&
                  it.text.length > 1 &&
                  Math.abs(it.y - yMemberBand) <= 12
              )
            : [];
        memberCandidates.sort(
          (a, b) => b.y - a.y || a.x - b.x
        );
        const memberFull = memberCandidates
          .map((it) => it.text.trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        const dueDateObj = firstInRange(
          yDueDate,
          grp.xLow,
          grp.xHigh,
          6
        );
        const dueDateParsed = parseDDMMYYYY(dueDateObj);
        const disbursalObj = earliestDateInRange(
          yDisbursal,
          grp.xLow,
          grp.xHigh
        );
        const collectionObj = latestDateInRange(
          yCollection,
          grp.xLow,
          grp.xHigh
        );

        const disbursalDate = disbursalObj?.d || null;
        const collectionDate = collectionObj?.d || null;

        const activeDays =
          disbursalDate && collectionDate
            ? Math.max(
                1,
                Math.round(
                  (collectionDate.getTime() -
                    disbursalDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0;

        const isOverdue =
          dueDateParsed && collectionDate
            ? collectionDate.getTime() > dueDateParsed.getTime()
            : false;

        // Split-day interest calculation:
        //   * Normal days (Disbursal → Due Date) at base ROI
        //   * Overdue days (Due Date → Collection Date) at base ROI + 2%
        // If not overdue, all days run at base ROI.
        let normalDays = activeDays;
        let overdueDays = 0;
        if (
          isOverdue &&
          dueDateParsed &&
          disbursalDate &&
          collectionDate
        ) {
          const dayMs = 1000 * 60 * 60 * 24;
          normalDays = Math.max(
            0,
            Math.round(
              (dueDateParsed.getTime() - disbursalDate.getTime()) /
                dayMs
            )
          );
          overdueDays = Math.max(
            0,
            Math.round(
              (collectionDate.getTime() -
                dueDateParsed.getTime()) /
                dayMs
            )
          );
        }

        const effectiveROI = isOverdue ? baseROI + 2 : baseROI;

        // Use Sanctioned Principal as the basis for Expected Interest
        // when Principal Collected is zero (interest-only collection).
        const interestBase =
          principal > 0 ? principal : sanctionedPrincipal;

        const expectedInterest =
          interestBase > 0
            ? (interestBase * baseROI * normalDays) / 36500 +
              (interestBase *
                (baseROI + 2) *
                overdueDays) /
                36500
            : 0;

        const difference =
          totalInterestReceived - expectedInterest;

        let remark = 'Within tolerance';
        if (principal === 0 && totalInterestReceived === 0) {
          remark = 'No recovery in audit period';
        } else if (principal === 0) {
          remark =
            'Interest-only recovery — principal not collected this period';
        } else if (isOverdue && Math.abs(difference) < 1) {
          remark =
            'OVERDUE — settled past due date; effective ROI elevated by 2% (penal applied)';
        } else if (isOverdue && difference > 1) {
          remark =
            'OVERDUE — actual exceeds expected even after 2% penal; verify additional charges';
        } else if (isOverdue && difference < -1) {
          remark =
            'OVERDUE — actual SHORT of expected (incl. 2% penal); under-recovery';
        } else if (difference > 1) {
          remark =
            'EXCESS — actual > baseline; verify hidden penal / IOD charge';
        } else if (difference < -1) {
          remark =
            'SHORTAGE — actual < baseline; recheck postings';
        }

        runningSerial += 1;
        allRecords.push({
          slNo: runningSerial,
          loanNo: grp.loanNo,
          glNo: glNoStr || '—',
          member: memberFull || '—',
          dueDate: dueDateObj || '—',
          disbursalDate: disbursalObj?.text || '—',
          collectionDate: collectionObj?.text || '—',
          principal,
          sanctionedPrincipal,
          interestBase,
          interest,
          penalInterest,
          iod,
          others,
          total,
          totalInterestReceived,
          roi: baseROI,
          effectiveROI,
          isOverdue,
          activeDays,
          normalDays,
          overdueDays,
          expectedInterest,
          actualInterest: totalInterestReceived,
          difference,
          remark,
        });
      }
    }

    let totalPrincipal = 0;
    let totalExpected = 0;
    let totalActual = 0;
    for (const r of allRecords) {
      totalPrincipal += r.principal;
      totalExpected += r.expectedInterest;
      totalActual += r.actualInterest;
    }

    const avgROI =
      allRecords.length > 0
        ? allRecords.reduce((s, r) => s + r.roi, 0) /
          allRecords.length
        : 0;

    return {
      records: allRecords,
      detectedROI: parseFloat(avgROI.toFixed(2)) || 0,
      totalPrincipal,
      totalExpected,
      totalActual,
      netDiscrepancy: totalActual - totalExpected,
      extractedNote:
        allRecords.length === 0
          ? 'Could not extract loan records — column labels (Loan No / GL No / Member) not found. Manual verification recommended.'
          : `${allRecords.length} loan(s) extracted. ROI read from the "ROI (% P.A.)" column. Overdue loans (Collection Date > Due Date) have effective ROI auto-incremented by 2% as penal interest. Total Interest = Interest + Penal Interest + IOD.`,
    };
  }

  async function handleLoanRecoveryUpload(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    if (files.length > 12) {
      setLoanRecoveryError(
        `You selected ${files.length} files. Maximum allowed is 12 PDF files at a time. Please try again with fewer files.`
      );
      return;
    }

    setLoanRecoveryProcessing(true);
    setLoanRecoveryError('');
    setLoanRecoveryReports([]);
    setLoanRecoveryAnalyses([]);
    setLoanRecoveryIncludeMap({});

    const results = [];
    const analyses = [];
    let anyInvalid = false;
    for (const file of files) {
      const r = await validatePdfReport(file);
      results.push(r);
      if (!r.ok) {
        anyInvalid = true;
        continue;
      }
      try {
        const a = await extractLoanRecoveryRows(file);
        analyses.push({ fileName: file.name, ...a });
      } catch (e) {
        console.error('Loan parse error', file.name, e);
      }
    }

    setLoanRecoveryReports(results);
    setLoanRecoveryAnalyses(analyses);
    if (anyInvalid) {
      setLoanRecoveryError(
        'Uploaded file is not in required format please upload once again'
      );
    }
    setLoanRecoveryProcessing(false);
  }

  // ─── CSV helpers ──────────────────────────────────────────────────
  function escapeCsvCell(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Wrap in quotes if it contains commas/quotes/newlines
    if (/[",\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function rowsToCsv(rows) {
    return rows
      .map((r) => r.map((c) => escapeCsvCell(c)).join(','))
      .join('\r\n');
  }

  function downloadBlob(content, filename, mimeType) {
    // Prefix with BOM so Excel opens UTF-8 CSV with correct ₹ glyph
    const bom = '﻿';
    const blob = new Blob([bom + content], {
      type: mimeType + ';charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── Cash Book downloads ──────────────────────────────────────────
  function downloadCashBookCSV() {
    if (!cashBookAnalysis || cashBookAnalysis.rows.length === 0) return;
    const header = [
      'Sl.No.',
      'Date',
      'Closing Balance (Rs.)',
      'Excess Amount (Rs.)',
      'Compliance Status',
      'Daily Interest @ 12% (Rs.)',
    ];
    const rows = cashBookAnalysis.rows.map((r) => [
      r.slNo,
      r.date,
      r.closingBalance.toFixed(2),
      r.excess.toFixed(2),
      r.status,
      r.interest.toFixed(2),
    ]);
    rows.push([]);
    rows.push([
      '',
      '',
      '',
      'Total Days Audited',
      cashBookAnalysis.totalDays,
      '',
    ]);
    rows.push([
      '',
      '',
      '',
      'Non-Compliant Days',
      cashBookAnalysis.nonCompliantDays,
      '',
    ]);
    rows.push([
      '',
      '',
      '',
      'Threshold (Rs.)',
      cashBookAnalysis.threshold,
      '',
    ]);
    rows.push([
      '',
      '',
      '',
      'GRAND TOTAL INTEREST @ 12% (Rs.)',
      '',
      cashBookAnalysis.totalInterest.toFixed(2),
    ]);
    const csv = rowsToCsv([header, ...rows]);
    const safeName = (societyName || 'Society').replace(
      /[^a-z0-9_-]/gi,
      '_'
    );
    downloadBlob(
      csv,
      `${safeName}_CashBook_InterestPenalty.csv`,
      'text/csv'
    );
  }

  function downloadCashBookPDF() {
    if (!cashBookAnalysis || cashBookAnalysis.rows.length === 0) return;
    const escapeHtml = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const today = new Date().toLocaleDateString('en-IN');
    const rowsHtml = cashBookAnalysis.rows
      .map(
        (r) => `
        <tr class="${r.status === 'Non-Compliant' ? 'breach' : ''}">
          <td>${r.slNo}</td>
          <td>${escapeHtml(r.date)}</td>
          <td class="num">${r.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="num">${r.excess > 0 ? r.excess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
          <td class="ctr">${r.status}</td>
          <td class="num">${r.interest > 0 ? r.interest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Cash Book Interest Penalty Analysis — ${escapeHtml(societyName || 'Society')}</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Times New Roman', serif; color: #000; margin: 0; padding: 24px 28px 50px; font-size: 11pt; line-height: 1.45; }
.h { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
.h h1 { font-size: 14pt; margin: 0; }
.h h2 { font-size: 16pt; margin: 4px 0 0 0; letter-spacing: 0.06em; }
.meta { display: flex; justify-content: space-between; font-size: 10pt; margin: 6px 0 12px; }
.tcap { background: #f0f0f0; padding: 6px 8px; border-left: 4px solid #000; font-weight: 700; margin-bottom: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 10pt; }
th, td { border: 1px solid #444; padding: 4px 6px; }
th { background: #2c2c2c; color: #fff; text-align: center; font-weight: 700; }
td.num { text-align: right; font-family: 'Consolas', monospace; }
td.ctr { text-align: center; }
tr.breach { background: #fff0f0; }
tr.breach td.ctr { color: #b00; font-weight: 700; }
tr.total td { background: #fff7d6; font-weight: 800; border-top: 2px solid #000; }
.summary { margin-top: 14px; padding: 10px; border: 1px solid #444; background: #fafafa; }
.actions { position: fixed; top: 10px; right: 14px; display: flex; gap: 6px; }
.actions button { background: #111; color: #fff; border: 0; padding: 8px 14px; font-weight: 700; cursor: pointer; border-radius: 4px; }
@page { size: A4 landscape; margin: 12mm; }
@media print { .actions { display: none; } body { padding: 0; } }
</style></head><body>
<div class="actions">
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()">✕ Close</button>
</div>
<div class="h">
  <h1>${escapeHtml(societyName || 'Society')} — Primary Agricultural Cooperative Credit Society Ltd.</h1>
  <h2>CASH BOOK · INTEREST PENALTY ANALYSIS</h2>
  <p style="margin:4px 0;font-size:10pt;">An Initiative of Ministry of Cooperation, Govt. of India &amp; NABARD</p>
</div>
<div class="meta">
  <div><b>Bye-law Cash Retention Limit:</b> ₹${cashBookAnalysis.threshold.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per day</div>
  <div><b>Penalty Rate:</b> 12% p.a.</div>
  <div><b>Generated On:</b> ${escapeHtml(today)}</div>
</div>
<div class="tcap">Daily Compliance Check</div>
<table>
<thead><tr>
<th>Sl.No.</th><th>Date</th><th>Closing Balance (₹)</th><th>Excess Amount (₹)</th><th>Compliance Status</th><th>Daily Interest @ 12% (₹)</th>
</tr></thead>
<tbody>
${rowsHtml}
<tr class="total"><td colspan="5" style="text-align:right;">GRAND TOTAL · DAILY INTEREST @ 12% (₹)</td><td class="num">${cashBookAnalysis.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
</tbody>
</table>
<div class="summary">
  <b>Summary:</b> Out of <b>${cashBookAnalysis.totalDays}</b> day(s) audited, <b>${cashBookAnalysis.nonCompliantDays}</b> day(s) breached the bye-law cash retention limit of ₹${cashBookAnalysis.threshold.toLocaleString('en-IN')}. The aggregate notional interest penalty at 12% per annum aggregates to <b>₹${cashBookAnalysis.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>. Peak closing balance: ₹${cashBookAnalysis.highestCB.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on ${escapeHtml(cashBookAnalysis.highestDate)}.
</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=1100,height=900');
    if (!w) {
      alert('Pop-up blocked. Please allow pop-ups to download as PDF.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // ─── Loan Recovery downloads (per file) ───────────────────────────
  function downloadLoanRecoveryCSV(analysis) {
    if (!analysis || analysis.records.length === 0) return;
    const header = [
      'Sl No',
      'GL No',
      'Loan Number',
      'Member Name',
      'Due Date',
      'Disbursal Date (Earliest)',
      'Collection Date (Latest)',
      'Active Days',
      'Normal Days',
      'Overdue Days',
      'Base ROI (%)',
      'Effective ROI (%)',
      'Overdue (Y/N)',
      'Sanctioned Principal (Rs.)',
      'Principal Collected (Rs.)',
      'Interest Base for Calc (Rs.)',
      'Interest (Rs.)',
      'Penal Interest (Rs.)',
      'IOD (Rs.)',
      'Total Interest Received = I + PI + IOD (Rs.)',
      'Expected Interest (A) (Rs.)',
      'Actual Interest Collected (B) (Rs.)',
      'Difference (B - A) (Rs.)',
      'Audit Remarks',
    ];
    const rows = analysis.records.map((r) => [
      r.slNo,
      r.glNo,
      r.loanNo,
      r.member,
      r.dueDate,
      r.disbursalDate,
      r.collectionDate,
      r.activeDays,
      r.normalDays,
      r.overdueDays,
      r.roi.toFixed(2),
      r.effectiveROI.toFixed(2),
      r.isOverdue ? 'YES' : 'NO',
      r.sanctionedPrincipal.toFixed(2),
      r.principal.toFixed(2),
      r.interestBase.toFixed(2),
      r.interest.toFixed(2),
      r.penalInterest.toFixed(2),
      r.iod.toFixed(2),
      r.totalInterestReceived.toFixed(2),
      r.expectedInterest.toFixed(2),
      r.actualInterest.toFixed(2),
      r.difference.toFixed(2),
      r.remark,
    ]);
    rows.push([]);
    const padToWidth = (label, value) => {
      const arr = new Array(header.length).fill('');
      arr[header.length - 2] = label;
      arr[header.length - 1] = value;
      return arr;
    };
    rows.push(padToWidth('Total Principal Verified (Rs.)', analysis.totalPrincipal.toFixed(2)));
    rows.push(padToWidth('Total Expected Baseline Interest (Rs.)', analysis.totalExpected.toFixed(2)));
    rows.push(padToWidth('Total Actual Interest Recovered (Rs.)', analysis.totalActual.toFixed(2)));
    rows.push(padToWidth('Net Discrepancy (Excess/Shortage) (Rs.)', analysis.netDiscrepancy.toFixed(2)));
    const csv = rowsToCsv([header, ...rows]);
    const safeFile = analysis.fileName.replace(/[^a-z0-9_-]/gi, '_').replace(/\.pdf$/i, '');
    downloadBlob(csv, `${safeFile}_LoanInterestRecon.csv`, 'text/csv');
  }

  function downloadLoanRecoveryPDF(analysis) {
    if (!analysis || analysis.records.length === 0) return;
    const escapeHtml = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const today = new Date().toLocaleDateString('en-IN');
    const fmtIN = (v) =>
      v.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const rowsHtml = analysis.records
      .map(
        (r) => `
        <tr class="${r.isOverdue ? 'overdue' : ''}">
          <td class="ctr">${r.slNo}</td>
          <td>${escapeHtml(r.glNo)}</td>
          <td>${escapeHtml(r.loanNo)}</td>
          <td>${escapeHtml(r.member)}</td>
          <td class="num">${r.sanctionedPrincipal > 0 ? fmtIN(r.sanctionedPrincipal) : '—'}</td>
          <td class="num">${fmtIN(r.principal)}</td>
          <td class="ctr">${r.isOverdue ? `${r.normalDays}+${r.overdueDays}` : r.activeDays}</td>
          <td class="ctr ${r.isOverdue ? 'pos' : ''}">${r.roi.toFixed(2)}${r.isOverdue ? `/${(r.roi + 2).toFixed(2)}` : ''}</td>
          <td class="num">${fmtIN(r.interest)}</td>
          <td class="num">${fmtIN(r.penalInterest)}</td>
          <td class="num">${fmtIN(r.iod)}</td>
          <td class="num">${fmtIN(r.expectedInterest)}</td>
          <td class="num">${fmtIN(r.actualInterest)}</td>
          <td class="num ${r.difference > 1 ? 'pos' : r.difference < -1 ? 'neg' : ''}">${fmtIN(r.difference)}</td>
          <td>${escapeHtml(r.remark)}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Loan Recovery Reconciliation — ${escapeHtml(analysis.fileName)}</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Times New Roman', serif; color: #000; margin: 0; padding: 22px 26px 46px; font-size: 10.5pt; line-height: 1.45; }
.h { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
.h h1 { font-size: 13pt; margin: 0; }
.h h2 { font-size: 15pt; margin: 4px 0 0 0; letter-spacing: 0.04em; }
.h .fn { font-size: 10pt; font-style: italic; margin-top: 3px; }
.meta { display: flex; justify-content: space-between; font-size: 9.5pt; margin: 4px 0 10px; }
.tcap { background: #f0f0f0; padding: 5px 8px; border-left: 4px solid #000; font-weight: 700; margin-bottom: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th, td { border: 1px solid #555; padding: 3px 5px; }
th { background: #2c2c2c; color: #fff; text-align: center; font-weight: 700; font-size: 9pt; }
td.num { text-align: right; font-family: 'Consolas', monospace; }
td.ctr { text-align: center; }
td.pos { color: #a00; font-weight: 700; }
td.neg { color: #c70; font-weight: 700; }
tr.overdue { background: #fff0f0; }
.summary { margin-top: 12px; padding: 8px 10px; border: 1px solid #444; background: #fafafa; }
.summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.summary-grid div { padding: 4px 6px; border: 1px solid #ddd; background: #fff; font-size: 10pt; }
.actions { position: fixed; top: 10px; right: 14px; display: flex; gap: 6px; }
.actions button { background: #111; color: #fff; border: 0; padding: 8px 14px; font-weight: 700; cursor: pointer; border-radius: 4px; }
@page { size: A4 landscape; margin: 11mm; }
@media print { .actions { display: none; } body { padding: 0; } }
</style></head><body>
<div class="actions">
  <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()">✕ Close</button>
</div>
<div class="h">
  <h1>${escapeHtml(societyName || 'Society')} — Primary Agricultural Cooperative Credit Society Ltd.</h1>
  <h2>LOAN RECOVERIES · INTEREST RECONCILIATION REPORT</h2>
  <div class="fn">Source File: <b>${escapeHtml(analysis.fileName)}</b></div>
</div>
<div class="meta">
  <div><b>Formula:</b> Interest = (Principal × ROI × Active Days) / 36500</div>
  <div><b>ROI Applied:</b> ${analysis.detectedROI}%</div>
  <div><b>Records:</b> ${analysis.records.length}</div>
  <div><b>Generated On:</b> ${escapeHtml(today)}</div>
</div>
<div class="tcap">Per-Loan Interest Reconciliation</div>
<table>
<thead><tr>
<th>Sl</th><th>GL No</th><th>Loan No</th><th>Member Name</th><th>Sanctioned‡ (₹)</th><th>Principal Coll. (₹)</th><th>Days</th><th>ROI %</th><th>Interest (₹)</th><th>Penal (₹)</th><th>IOD (₹)</th><th>Expected (A) (₹)</th><th>Actual* (B) (₹)</th><th>Diff (B−A) (₹)</th><th>Audit Remark</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
<div style="margin-top:4px;font-size:9pt;font-style:italic;color:#444;">
  * <b>Actual (B)</b> = Interest + Penal Interest + IOD (summed across all vouchers for the loan).<br/>
  ‡ <b>Sanctioned</b> = original loan amount disbursed; used as Expected-interest base when Principal Collected is zero (interest-only recovery).<br/>
  Days for overdue rows shown as normal_days+overdue_days; ROI shown as base/base+2% (penal applied only to overdue days).
</div>
<div class="summary">
  <b>Summary Totals</b>
  <div class="summary-grid" style="margin-top:6px;">
    <div><b>Total Principal Verified:</b> ₹${fmtIN(analysis.totalPrincipal)}</div>
    <div><b>Total Expected Baseline Interest:</b> ₹${fmtIN(analysis.totalExpected)}</div>
    <div><b>Total Actual Interest Recovered:</b> ₹${fmtIN(analysis.totalActual)}</div>
    <div><b>Net Discrepancy (Excess/Shortage):</b> ₹${fmtIN(analysis.netDiscrepancy)}</div>
  </div>
  <p style="margin-top:8px;font-size:9.5pt;font-style:italic;color:#444;">${escapeHtml(analysis.extractedNote)}</p>
</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=1100,height=900');
    if (!w) {
      alert('Pop-up blocked. Please allow pop-ups to download as PDF.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
    ]);
    setChatInput('');
    setChatTyping(true);
    // Simulate brief processing delay so the typing indicator shows
    setTimeout(() => {
      const reply = answerLegalQuery(text);
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', content: reply },
      ]);
      setChatTyping(false);
    }, 400);
  }

  function addCustomDefect() {
    const { category, title, narrative } = customDefectDraft;
    if (!title.trim() || !narrative.trim()) {
      alert('Please provide both a Title and a Narrative.');
      return;
    }
    setCustomDefects((prev) => [
      ...prev,
      {
        category,
        title: title.trim(),
        narrative: narrative.trim(),
        custom: true,
      },
    ]);
    setCustomDefectDraft({
      category: 'financial',
      title: '',
      narrative: '',
    });
  }

  function removeCustomDefect(idx) {
    setCustomDefects((prev) => prev.filter((_, i) => i !== idx));
  }

  function printDefectSheet() {
    if (
      defectSheet.merits.length === 0 &&
      defectSheet.demerits.length === 0
    ) {
      alert('No defect sheet content to print. Upload a ZIP first.');
      return;
    }

    const today = new Date()
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

    const categories = [
      {
        key: 'financial',
        label: 'B.1 · FINANCIAL IRREGULARITIES',
      },
      {
        key: 'accounting',
        label: 'B.2 · ACCOUNTING IRREGULARITIES',
      },
      {
        key: 'administrative',
        label: 'B.3 · ADMINISTRATIVE IRREGULARITIES',
      },
    ];

    const escapeHtml = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    let runningNo = 0;
    const demeritsByCategory = categories
      .map((c) => {
        const items = defectSheet.demerits.filter(
          (d) => d.category === c.key
        );
        if (items.length === 0) return '';
        return `
          <h3 class="subhead">${escapeHtml(c.label)}</h3>
          <ol class="items" start="${runningNo + 1}">
            ${items
              .map((d) => {
                runningNo += 1;
                return `
              <li>
                <div class="item-title">${escapeHtml(d.title)}</div>
                <p class="item-narrative">${escapeHtml(
                  d.narrative
                )}</p>
              </li>`;
              })
              .join('')}
          </ol>`;
      })
      .join('');

    const meritsHtml =
      defectSheet.merits.length === 0
        ? '<p class="empty">No specific merit observations were recorded for the audit period.</p>'
        : `<ol class="items">
            ${defectSheet.merits
              .map(
                (m) => `
              <li>
                <div class="item-title">${escapeHtml(m.title)}</div>
                <p class="item-narrative">${escapeHtml(
                  m.narrative
                )}</p>
              </li>`
              )
              .join('')}
          </ol>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>AUDIT DEFECTS — ${escapeHtml(defectSheet.societyName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, Cambria, serif;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 28px 36px 60px 36px;
    font-size: 12pt;
    line-height: 1.55;
  }
  .doc-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 18px;
  }
  .society {
    font-size: 14pt;
    font-weight: 700;
    margin: 0 0 4px 0;
  }
  .doc-title {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    margin: 4px 0 0 0;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 10.5pt;
    margin: 8px 0 14px 0;
  }
  .meta div { padding: 0 6px; }
  .section {
    margin: 14px 0 6px 0;
    border-bottom: 1px solid #000;
    padding-bottom: 3px;
  }
  .section h2 {
    font-size: 13pt;
    font-weight: 800;
    margin: 0;
    letter-spacing: 0.04em;
  }
  .subhead {
    font-size: 11pt;
    font-weight: 700;
    margin: 16px 0 6px 0;
    color: #000;
    border-left: 4px solid #000;
    padding: 2px 0 2px 8px;
    background: #f4f4f4;
  }
  .items {
    padding-left: 22px;
    margin: 6px 0 14px 0;
  }
  .items li {
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .item-title {
    font-weight: 700;
    margin-bottom: 4px;
  }
  .item-narrative {
    margin: 0;
    text-align: justify;
    text-justify: inter-word;
  }
  .empty {
    font-style: italic;
    color: #555;
    border-left: 3px solid #aaa;
    padding-left: 10px;
    margin: 6px 0 14px 0;
  }
  .doc-footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #000;
    font-size: 9.5pt;
    text-align: center;
    color: #333;
  }
  .actions {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 50;
    display: flex;
    gap: 8px;
  }
  .actions button {
    background: #0f172a;
    color: #fff;
    border: 1px solid #0f172a;
    padding: 8px 14px;
    font-family: inherit;
    font-size: 11pt;
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
  }
  .actions button:hover { background: #1e293b; }
  @page {
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
  }
  @media print {
    .actions { display: none; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()">✕ Close</button>
  </div>

  <div class="doc-header">
    <p class="society">${escapeHtml(
      defectSheet.societyName
    )} — Primary Agricultural Cooperative Credit Society Ltd.</p>
    <p class="doc-title">AUDITOR'S OBSERVATION / DEFECT SHEET</p>
  </div>

  <div class="section"><h2>PART A — MERITS (Compliance &amp; Strengths)</h2></div>
  ${meritsHtml}

  <div class="section"><h2>PART B — DEMERITS (Defects &amp; Irregularities)</h2></div>
  ${
    demeritsByCategory ||
    '<p class="empty">No material defects were noticed during the audit verification.</p>'
  }

  <div class="doc-footer">
    This is System Generated AI Report - Verify before use<br/>
    Generated by COOP·AUDIT·AI &mdash; ${escapeHtml(
      today
    )}
  </div>

<script>
  window.addEventListener('load', function() {
    // Auto-open print dialog shortly after load
    setTimeout(function() { window.print(); }, 500);
  });
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      alert(
        'Pop-up blocked. Please allow pop-ups for this site to print the defect sheet.'
      );
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // ---- Login gate: block the whole app until admin signs in ----
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative font-sans overflow-y-auto">
        <form
          onSubmit={handleLogin}
          className="glossy-border-box w-full max-w-sm p-6 text-center relative z-10 my-auto"
        >
          {/* Brand mark — VIBGYOR rainbow ring; height scales to viewport so the card always fits */}
          <div className="flex justify-center mb-2">
            <div className="relative overflow-hidden rounded-[28px] shadow-[0_0_40px_rgba(52,211,153,0.4)] backdrop-blur-xl">
              <img
                src={logoImage}
                alt="COOP - AUDIT AI Logo"
                className="block rounded-[28px] w-auto h-auto max-h-[18vh] max-w-[170px]"
              />
            </div>
          </div>

          <h1 className="font-display text-xl sm:text-2xl font-black tracking-[0.12em] whitespace-nowrap leading-none">
            <span style={{ color: '#10b981' }}>COOP</span>
            <span className="text-slate-400">·</span>
            <span style={{ color: '#1e3a8a' }}>AUDIT</span>
            <span className="text-slate-400">·</span>
            <span style={{ color: '#7c3aed' }}>AI</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-mono-techy mt-1 mb-4">
            Admin Login
          </p>

          <div className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono-techy font-bold mb-1">
                Username
              </label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                autoFocus
                placeholder="Enter username"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none vibgyor-input-focus"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono-techy font-bold mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none vibgyor-input-focus"
              />
            </div>
          </div>

          {loginError && (
            <p className="mt-3 text-xs font-bold text-rose-600">{loginError}</p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-bold tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:bg-slate-800 transition-all duration-200"
            >
              Login
            </button>
            <button
              type="button"
              onClick={handleLoginReset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-bold tracking-wide border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-violet-300 hover:text-violet-600 transition-all duration-200"
            >
              Reset
            </button>
          </div>

          <p className="mt-5 text-[9px] uppercase tracking-[0.3em] text-slate-400 font-mono-techy">
            Authorized admin access only
          </p>
        </form>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Shared state/handlers handed to every menu view via <AuditContext.Provider>.
  // Each view under src/views/ destructures what it needs from useAudit().
  // When adding state used by a view, remember to add it here too.
  // ---------------------------------------------------------------------------
  const auditCtx = {
    // ----- core upload / processing state -----
    loading, setLoading,
    detectedFiles, setDetectedFiles,
    auditResults, setAuditResults,
    societyName, setSocietyName,
    uploadStatusMessage, setUploadStatusMessage,
    allFilesUploaded, setAllFilesUploaded,
    currentProcessingFile, setCurrentProcessingFile,
    processedCount, setProcessedCount,
    totalCount, setTotalCount,
    currentStage, setCurrentStage,
    activeView, setActiveView,
    missingFiles, setMissingFiles,
    fileTableData, setFileTableData,
    isDragging, setIsDragging,
    auditNarratives, setAuditNarratives,
    // ----- report analysis: cash book -----
    cashBookReport, setCashBookReport,
    cashBookError, setCashBookError,
    cashBookProcessing, setCashBookProcessing,
    cashBalanceThreshold, setCashBalanceThreshold,
    cashBookAnalysis, setCashBookAnalysis,
    cashBookIncludeInDefects, setCashBookIncludeInDefects,
    // ----- report analysis: loan recoveries -----
    loanRecoveryReports, setLoanRecoveryReports,
    loanRecoveryError, setLoanRecoveryError,
    loanRecoveryProcessing, setLoanRecoveryProcessing,
    loanRecoveryAnalyses, setLoanRecoveryAnalyses,
    loanRecoveryIncludeMap, setLoanRecoveryIncludeMap,
    // ----- AI legal chat -----
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    chatTyping, setChatTyping,
    aiKey, setAiKey,
    showKeyPanel, setShowKeyPanel,
    aiKeyDraft, setAiKeyDraft,
    aiTestRunning, setAiTestRunning,
    aiTestResult, setAiTestResult,
    aiTestQuestion, setAiTestQuestion,
    // ----- defect sheet generator -----
    customDefects, setCustomDefects,
    customDefectDraft, setCustomDefectDraft,
    defectPreview, setDefectPreview,
    // ----- concurrent audit / periodical inspection -----
    concurrentFileName,
    concurrentMeta,
    concurrentDetected,
    concurrentCustom, setConcurrentCustom,
    concurrentProcessing,
    concurrentError,
    concurrentDraft, setConcurrentDraft,
    concurrentPreview, setConcurrentPreview,
    concurrentSheet,
    handleConcurrentUpload,
    printConcurrentSheet,
    // ----- legal corpus -----
    corpus, setCorpus,
    corpusStatus, setCorpusStatus,
    corpusProgress, setCorpusProgress,
    // ----- derived (useMemo) -----
    financials,
    statementRows,
    defectSheet,
    documentRows,
    availableCount,
    talliedCount,
    // ----- handlers -----
    runAiKeyTest,
    saveAiKey,
    clearAiKey,
    processZIP,
    handleCashBookUpload,
    handleAddUserReference,
    handleRemoveUserReference,
    answerWithCorpus,
    handleLoanRecoveryUpload,
    downloadCashBookCSV,
    downloadCashBookPDF,
    downloadLoanRecoveryCSV,
    downloadLoanRecoveryPDF,
    printDefectSheet,
    // ----- module-level helpers used inside views -----
    hasGeminiKey,
    buildCaseLawReferences,
    generateDefectNarrative,
    generateLegalAgentAnswer,
  };

  return (
    <AuditContext.Provider value={auditCtx}>
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#031b1a] to-emerald-950 flex overflow-hidden text-white relative font-sans">
      <aside className="w-[320px] min-h-screen bg-slate-950/60 backdrop-blur-2xl text-white flex flex-col border-r border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-60 h-60 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <div className="relative p-8 border-b border-white/10">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="group relative">
              {/* attraction glow */}
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-emerald-400/40 via-violet-400/35 to-fuchsia-400/40 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none animate-pulse" />
              <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/40 shadow-[0_12px_34px_rgba(91,33,182,0.30)] transition-transform duration-500 group-hover:scale-[1.05]">
                {/* blend the logo's white backing into the page background */}
                <img
                  src={auditLogo}
                  alt="Audit Management System logo"
                  className="w-28 h-28 object-contain mix-blend-multiply"
                />
                {/* glossy sheen */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/55 via-white/10 to-transparent" />
                <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none bg-gradient-to-b from-white/35 to-transparent" />
                {/* moving highlight on hover */}
                <div className="absolute -inset-y-2 -left-1/2 w-1/2 -skew-x-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[300%] transition-all duration-700 pointer-events-none" />
              </div>
            </div>
            <div className="text-center w-full">
              <h1 className="font-display text-[clamp(1.25rem,5.5vw,1.75rem)] font-black tracking-[0.08em] whitespace-nowrap leading-none">
                <span style={{ color: '#10b981' }}>COOP</span>
                <span className="text-slate-400">·</span>
                <span style={{ color: '#1e3a8a' }}>AUDIT</span>
                <span className="text-slate-400">·</span>
                <span style={{ color: '#7c3aed' }}>AI</span>
              </h1>
              <div className="mt-2 text-[9px] uppercase tracking-[0.35em] font-mono-techy whitespace-nowrap">
                <span style={{ color: '#10b981' }}>Cooperative</span>
                <span className="text-slate-400"> · </span>
                <span style={{ color: '#1e3a8a' }}>Audit</span>
                <span className="text-slate-400"> · </span>
                <span style={{ color: '#7c3aed' }}>Intelligence</span>
              </div>

              {societyName && (
                <div className="relative mt-4 px-4 py-3 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-violet-500/15 border border-emerald-400/40 backdrop-blur-md anim-slide-up overflow-hidden shadow-[0_0_25px_rgba(52,211,153,0.25)]">
                  <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

                  <div className="relative">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/90 mb-2 font-mono-techy font-bold flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      Uploaded File
                    </div>

                    <div className="font-display font-black text-sm tracking-wide break-words leading-tight gradient-text-fire">
                      {societyName}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="relative flex-1 px-5 py-10 space-y-3">
          {[
            ['Dashboard', LayoutDashboard, 'emerald', 'dashboard'],
            ['Upload Documents', Upload, 'cyan', 'documents'],
            ['Report Analysis', FileCheck2, 'amber', 'reports'],
            ['Audit Defects', ScrollText, 'violet', 'defects'],
            ['AI Legal Chat', MessagesSquare, 'fuchsia', 'aichat'],
            ['Defect Sheet Generator', FilePlus2, 'lime', 'generator'],
            ['Concurrent Audit / Inspection', ClipboardCheck, 'cyan', 'concurrent'],
          ].map(([label, Icon, accent, view], idx) => {
            const isActive = activeView === view;
            return (
              <button
                key={label}
                onClick={() => setActiveView(view)}
                className={`group relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 overflow-hidden anim-row text-left ${
                  isActive
                    ? `border-${accent}-400/60 bg-${accent}-400/10 shadow-[0_0_25px_rgba(52,211,153,0.15)]`
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                }`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 bg-${accent}-400 shadow-[0_0_15px_currentColor] text-${accent}-400 transition-opacity ${
                    isActive
                      ? 'opacity-100'
                      : 'opacity-60 group-hover:opacity-100'
                  }`}
                />
                <Icon className={`w-5 h-5 text-${accent}-300 ml-1`} />
                <span
                  className={`font-semibold tracking-[0.15em] text-sm font-display ${
                    isActive ? 'text-white' : 'text-white/85'
                  }`}
                >
                  {label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="relative px-5 pb-5">
          <div className="text-[9px] uppercase tracking-[0.35em] text-cyan-200/40 font-mono-techy text-center">
            {APP_VERSION} · Neural Verifier
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-2xl rounded-[32px] border border-emerald-400/20 p-6 shadow-[0_0_80px_rgba(52,211,153,0.15)] anim-slide-up">
            <div className="absolute inset-0 cyber-grid opacity-60 pointer-events-none" />
            <div className="absolute -top-32 -right-24 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-24 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="relative overflow-hidden rounded-[28px] shadow-[0_0_40px_rgba(52,211,153,0.4)] backdrop-blur-xl">
                    <img
                      src={logoImage}
                      alt="COOP - AUDIT AI Logo"
                      className="block rounded-[28px] w-auto h-auto max-w-[120px] lg:max-w-[140px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/80 font-mono-techy font-bold">
                      AI · NEURAL · VERIFICATION
                    </div>
                  </div>
                  <h2 className="font-display font-black leading-[1.05] tracking-[0.02em] text-[clamp(1.1rem,2.6vw,2.25rem)] whitespace-nowrap">
                    <span className="gradient-text">COOPERATIVE</span>{' '}
                    <span className="text-white">AUDIT</span>
                    <br />
                    <span className="gradient-text-fire">PDF</span>{' '}
                    <span className="text-white">FILE ANALYZER</span>
                  </h2>
                </div>
              </div>

            </div>
          </div>

          {/* SUCCESS banner — all required files present */}
          {!loading && allFilesUploaded && uploadStatusMessage && (
            <div className="relative overflow-hidden rounded-[28px] border-2 border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-emerald-500/20 backdrop-blur-xl p-6 anim-success-glow anim-slide-up">
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

              <div className="relative flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-60 animate-pulse" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.7)]">
                    <CheckCircle2
                      className="w-8 h-8 text-slate-950"
                      strokeWidth={2.8}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.45em] text-emerald-300/80 font-mono-techy font-bold mb-1">
                    Verification Complete
                  </div>
                  <div className="font-display text-2xl lg:text-3xl font-black gradient-text leading-tight">
                    ALL FILES ARE UPLOADED SUCCESSFULLY
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <Sparkles className="w-5 h-5 text-yellow-300 anim-float" />
                  <Sparkles className="w-4 h-4 text-emerald-300 anim-float" style={{ animationDelay: '0.3s' }} />
                  <Sparkles className="w-3 h-3 text-cyan-300 anim-float" style={{ animationDelay: '0.6s' }} />
                </div>
              </div>
            </div>
          )}

          {/* MISSING banner — list of missing files in blinking style */}
          {!loading && missingFiles.length > 0 && (activeView === 'dashboard' || activeView === 'documents') && (
            <div className="relative overflow-hidden rounded-[28px] border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-rose-50 p-6 shadow-[0_2px_16px_rgba(225,29,72,0.08)] anim-slide-up">
              <div className="relative flex items-start gap-5">
                <div className="relative shrink-0">
                  <div className="relative w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center border border-rose-200">
                    <XCircle
                      className="w-8 h-8 text-rose-500"
                      strokeWidth={2.8}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-[10px] uppercase tracking-[0.45em] text-rose-500 font-mono-techy font-bold">
                      Files Missing
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-600 font-display text-[10px] font-bold tracking-[0.2em]">
                      {missingFiles.length} MISSING
                    </span>
                  </div>
                  <div className="font-display text-lg lg:text-xl font-black text-rose-700 mb-3 tracking-wide">
                    The following required files are missing from the ZIP
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingFiles.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-600 font-mono-techy text-[11px] font-bold tracking-wide"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-violet-200 rounded-[32px] p-8 shadow-[0_4px_24px_rgba(124,58,237,0.08)] anim-slide-up">
              {/* scan line */}
              <div
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent pointer-events-none"
                style={{
                  top: 0,
                  animation: 'scanline 2.6s linear infinite',
                }}
              />
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute -top-32 -right-24 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

              <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
                <div className="relative w-44 h-40 flex items-center justify-center">
                  {/* outer glow halo */}
                  <div className="absolute w-36 h-36 rounded-full bg-emerald-400/15 blur-2xl animate-pulse" />

                  {/* back pages (stacked offset) */}
                  <div
                    className="absolute w-24 h-28 rounded-lg border border-violet-200 bg-white shadow-[0_2px_12px_rgba(124,58,237,0.08)]"
                    style={{ transform: 'translate(14px, 8px) rotate(7deg)' }}
                  />
                  <div
                    className="absolute w-24 h-28 rounded-lg border border-violet-200 bg-white shadow-[0_2px_12px_rgba(124,58,237,0.1)]"
                    style={{ transform: 'translate(7px, 4px) rotate(3.5deg)' }}
                  />

                  {/* main scanning page */}
                  <div className="relative w-24 h-28 rounded-lg border-2 border-violet-400/50 bg-white overflow-hidden shadow-[0_4px_24px_rgba(124,58,237,0.15)]">
                    {/* PDF badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[3px] text-[7px] font-mono-techy font-bold bg-violet-600 text-white tracking-[0.15em] shadow">
                      PDF
                    </div>

                    {/* document text lines */}
                    <div className="absolute inset-x-2 top-7 bottom-2 flex flex-col gap-1.5">
                      <div className="h-[3px] bg-indigo-200 rounded-sm" />
                      <div className="h-[3px] bg-cyan-200 rounded-sm w-5/6" />
                      <div className="h-[3px] bg-indigo-200 rounded-sm w-3/4" />
                      <div className="h-[3px] bg-cyan-200 rounded-sm" />
                      <div className="h-[3px] bg-indigo-200 rounded-sm w-2/3" />
                      <div className="h-[3px] bg-cyan-200 rounded-sm w-4/5" />
                      <div className="h-[3px] bg-indigo-200 rounded-sm w-1/2" />
                    </div>

                    {/* horizontal scan beam */}
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent shadow-[0_0_14px_3px_rgba(124,58,237,0.5)] pointer-events-none anim-page-scan" />

                    {/* soft scan glow tracking the beam */}
                    <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-violet-400/20 via-violet-300/5 to-transparent pointer-events-none anim-page-scan-trail" />
                  </div>

                  {/* corner brackets framing the scan area */}
                  <div className="absolute w-32 h-32 pointer-events-none">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-violet-500" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-violet-500" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-violet-500" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-violet-500" />
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                    <div className="text-[10px] uppercase tracking-[0.45em] text-violet-600 font-mono-techy font-bold">
                      AI Neural Engine · Live Scan
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] uppercase tracking-[0.3em] text-indigo-500 font-mono-techy font-semibold">
                      {currentStage || 'Initializing…'}
                    </div>
                    <div className="font-display text-xl md:text-2xl font-black gradient-text break-all leading-snug">
                      {currentProcessingFile || 'Awaiting first PDF…'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono-techy uppercase tracking-[0.25em] text-slate-900 font-bold">
                      <span>
                        File {Math.min(processedCount + 1, totalCount || 1)} / {totalCount || 1}
                      </span>
                      <span className="text-black font-black text-xs">
                        {Math.round(
                          (processedCount / (totalCount || 1)) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2.5 bg-violet-100 rounded-full overflow-hidden border border-violet-200 relative">
                      <div
                        className="h-full bg-black transition-all duration-500 shadow-[0_0_16px_rgba(0,0,0,0.45)]"
                        style={{
                          width: `${Math.min(100, (processedCount / (totalCount || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Extract', 'Reconstruct', 'Verify', 'Tally'].map(
                      (step, i) => {
                        const active =
                          processedCount > 0 ||
                          currentStage.toLowerCase().includes(step.toLowerCase());
                        return (
                          <span
                            key={step}
                            className={`px-3 py-1 rounded-full border text-[9px] font-display font-bold tracking-[0.25em] uppercase ${
                              active
                                ? 'border-violet-400 bg-violet-50 text-violet-600 shadow-[0_2px_8px_rgba(124,58,237,0.15)]'
                                : 'border-slate-200 text-slate-400 bg-white'
                            }`}
                            style={{
                              animation: active
                                ? `float 2.${i}s ease-in-out infinite`
                                : 'none',
                            }}
                          >
                            {step}
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && !loading && <DashboardView />}

          {activeView === 'documents' && !loading && <UploadDocumentsView />}

          {activeView === 'reports' && !loading && <ReportAnalysisView />}

          {activeView === 'aichat' && !loading && <LegalChatView />}

          {activeView === 'generator' && !loading && <DefectSheetGeneratorView />}

          {activeView === 'defects' && !loading && <AuditDefectsView />}

          {activeView === 'concurrent' && !loading && <ConcurrentAuditView />}

        </div>
      </main>
    </div>
    </AuditContext.Provider>
  );
}

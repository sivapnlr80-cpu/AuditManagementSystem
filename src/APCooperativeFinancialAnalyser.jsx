import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import * as PDFJS from 'pdfjs-dist';
import {
  Receipt,
  Table2,
  Scale,
  Landmark,
  LayoutDashboard,
  Upload,
  ScrollText,
  FileArchive,
  ShieldCheck,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  ListChecks,
  Building2,
  FileCheck2,
  BadgeCheck,
  Award,
  MessagesSquare,
  FilePlus2,
  Send,
  Trash2,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import logoImage from './assets/logo.png';
import epacsLogo from './assets/epacs.png';

PDFJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.mjs`;

async function extractPDFText(zipEntry) {
  const pdfData = await zipEntry.async('uint8array');

  const pdfDocument = await PDFJS.getDocument({
    data: pdfData,
  }).promise;

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

function answerLegalQuery(query) {
  if (!query || !query.trim())
    return 'Please type a question about a specific Section, Rule, Annexure, Schedule, or Paragraph of the Audit Manual.';
  const q = query.toLowerCase().trim();
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

function classifyDocument(fileName) {
  const norm = normalizeFileName(fileName);
  for (const doc of DOCUMENT_TYPES) {
    if (norm.includes(doc.key)) {
      return { type: doc.type, hasFinancialTable: doc.hasFinancialTable };
    }
  }
  return { type: 'Other / Unclassified', hasFinancialTable: false };
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
        "Welcome to COOP·AUDIT·AI Legal Chat. Ask me about any section of the APCS Act 1964, APCS Rules 1964, NABARD norms, or paragraphs of the Audit Manual for PACS. Try: 'What is Section 54?' or 'Explain Rule 41(C)(6)'.",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const [customDefects, setCustomDefects] = useState([]);
  const [customDefectDraft, setCustomDefectDraft] = useState({
    category: 'financial',
    title: '',
    narrative: '',
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
          'Complete Submission of Statutory Records & Schedules',
        narrative: `The Society has produced the entire prescribed set of statutory financial statements, schedules and annexures for verification. This demonstrates compliance with Section 55-A of the APCS Act, 1964 read with Rules 58 and 59, under which the CEO and President are jointly responsible for maintenance and production of accounts. The diligent record-keeping is commended.`,
      });
    } else if (missingFiles.length > 0) {
      demerits.push({
        category: 'accounting',
        title:
          'Incomplete System-Generated Reports — Paragraph 7.1, Audit Manual for PACS',
        narrative: `The audit ZIP shows ${missingFiles.length} prescribed system-generated report(s) were not produced from the ERP module. Paragraph 7.1 of the Audit Manual for PACS requires the Trial Balance and all financial reports to be generated for the full set of accounts, authenticated by the Secretary, and preserved for seven years; Section 55-A of the APCS Act, 1964 makes the CEO and President jointly responsible for production of accounts. The CEO is directed to review ERP configuration, ensure Secretary authentication of each report, preserve all reports in soft and hard form, and produce the complete set at the next monthly audit; persistent failure attracts direction under Section 54.`,
      });
    }

    // 2) MATERIAL ACCURACY OF FINANCIAL STATEMENTS — Section 50 + 55-A
    const mismatched = auditResults.filter((r) => !r.tallied);
    if (auditResults.length > 0 && mismatched.length === 0) {
      merits.push({
        title:
          'Material Accuracy & Mathematical Integrity of Financial Statements',
        narrative: `All primary financial statements — Receipts & Payments, Trail Balance, Trading Account, P&L Account, P&L Appropriation and Balance Sheet — are correctly tallied with matching debit/credit and asset/liability totals. This conforms to double-entry principles under the CAS Manual and the books-of-account obligations under Section 55-A of the APCS Act, 1964. The CEO and accounting staff are commended for the integrity of the ERP-maintained ledger.`,
      });
    }

    // 3) Per-statement mismatch demerits — Section 50 + 55-A + CAS Manual
    mismatched.forEach((r) => {
      demerits.push({
        category: 'accounting',
        title: `${r.statementType} — Non-Tallying of Material Grand Totals`,
        narrative: `The ${r.statementType} shows a discrepancy of ₹${fmt(r.difference)} between ${r.label1} (₹${fmt(r.amount1)}) and ${r.label2} (₹${fmt(r.amount2)}). This non-tallying breaches the double-entry principles of the CAS Manual and Section 55-A of the APCS Act, 1964, and undermines the reliability of consequent statements. The CEO is directed under Section 54 to reconcile the account heads and submit the corrected statement at the next monthly audit; failure may be reported to the Registrar.`,
      });
    });

    // 4) ANNEXURE-8 (Total Income / Cost of Management) — Section 115-D
    const annex8 = auditNarratives.find((n) => n.key === 'annexure8');
    if (annex8 && annex8.status === 'merit') {
      merits.push({
        title:
          'Sound Operational Performance — Compliance with Section 115-D & NABARD Norms',
        narrative: annex8.narrative,
      });
    } else if (annex8 && annex8.status === 'demerit') {
      demerits.push({
        category: 'financial',
        title:
          'Cost of Management & Manpower Norms — Non-Compliance with Section 115-D',
        narrative: annex8.narrative,
      });
    }

    // 5) ANNEXURE-11 (Legal Action Coverage) — Section 30(xxii) + Rule 41(C)(6)
    const annex11 = auditNarratives.find((n) => n.key === 'annexure11');
    if (annex11 && annex11.status === 'merit') {
      merits.push({
        title:
          'Diligent Recovery & Legal Action Coverage on Overdue Loans',
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

    // 5b) ANNEXURE-8 PERCENTAGE — Staff Cost % / COM %
    const annex8Pct = auditNarratives.find(
      (n) => n.key === 'annexure8Pct'
    );
    if (annex8Pct && annex8Pct.status === 'merit') {
      merits.push({
        title:
          'Positive Staff Cost % and COM % Ratios — Annexure-8',
        narrative: annex8Pct.narrative,
      });
    } else if (annex8Pct && annex8Pct.status === 'demerit') {
      demerits.push({
        category: 'financial',
        title:
          'Negative Staff Cost % / COM % to Total Income — Section 115-D',
        narrative: annex8Pct.narrative,
      });
    }

    // 5c) ANNEXURE-5 — Financial Imbalance (A − B)
    const annex5 = auditNarratives.find((n) => n.key === 'annexure5');
    if (annex5 && annex5.status === 'merit') {
      merits.push({
        title:
          'No Financial Imbalance — Annexure-5 (Sound Asset-Liability Matching)',
        narrative: annex5.narrative,
      });
    } else if (annex5 && annex5.status === 'demerit') {
      demerits.push({
        category: 'financial',
        title:
          'Financial Imbalance Detected — Annexure-5 (A − B Calculation)',
        narrative: annex5.narrative,
      });
    }

    // 5d) SCHEDULE-9 — Provisions on NPAs, Overdue Interest, Bad & Doubtful Sundry Debtors
    const sched9 = auditNarratives.find((n) => n.key === 'schedule9');
    if (sched9 && sched9.status === 'merit') {
      merits.push({
        title:
          'Adequate Provisioning under NABARD IRAC Norms — Schedule-9',
        narrative: sched9.narrative,
      });
    } else if (sched9 && sched9.status === 'demerit') {
      demerits.push({
        category: 'accounting',
        title:
          'Provisioning Defects under Schedule-9 — NABARD IRAC Non-Compliance',
        narrative: sched9.narrative,
      });
    }

    // 5e1) SCHEDULE 16B — Sundry Debtors aged > 3 years (non-realisable)
    const sched16b = auditNarratives.find(
      (n) => n.key === 'schedule16b'
    );
    if (sched16b && sched16b.status === 'demerit') {
      demerits.push({
        category: 'financial',
        title:
          'Sundry Debtors Aged > 3 Years (Non-Realisable) — Schedule-16B · NABARD IRAC Non-Compliance',
        narrative: sched16b.narrative,
      });
    }

    // 5e) BALANCE SHEET — Sundry Debtors & Sundry Creditors closing balance integrity
    const sdc = auditNarratives.find(
      (n) => n.key === 'sundryDebtorsCreditors'
    );
    if (sdc && sdc.status === 'merit') {
      merits.push({
        title:
          'Sundry Debtors & Sundry Creditors — Clean Closing Balances',
        narrative: sdc.narrative,
      });
    } else if (sdc && sdc.status === 'demerit') {
      demerits.push({
        category: 'accounting',
        title:
          'Negative Closing Balance under Sundry Debtors / Creditors — Section 55-A',
        narrative: sdc.narrative,
      });
    }

    // 5e-bis) SCHEDULE-16B — Sundry Debtors aged > 3 years
    const sch16b = auditNarratives.find(
      (n) => n.key === 'schedule16b'
    );
    if (sch16b && sch16b.status === 'merit') {
      merits.push({
        title:
          'Sundry Debtors Ageing — No Dues Outstanding Beyond 3 Years (Schedule-16B)',
        narrative: sch16b.narrative,
      });
    } else if (sch16b && sch16b.status === 'demerit') {
      demerits.push({
        category: 'financial',
        title:
          'Sundry Debtors Aged Above 3 Years (Schedule-16B) — Section 30(xxii) r/w Rule 41(C)(6)',
        narrative: sch16b.narrative,
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
            'Cash on Hand — Compliance with Bye-law Retention Limit',
          narrative: `Cash Book verification shows the Cash on Hand closing balance remained within the bye-law limit of ${fmtR(cashBookAnalysis.threshold)} on all ${cashBookAnalysis.totalDays} day(s) audited. The Managing Committee and CEO are commended for cash-retention discipline, which mitigates risks of misappropriation and idle cash and safeguards member funds.`,
        });
      } else {
        demerits.push({
          category: 'financial',
          title:
            'Cash Balances Not Promptly Remitted into Bank Accounts — Interest Penalty @ 12% p.a.',
          narrative: `Cash on Hand closing balances exceeded the bye-law limit of ${fmtR(cashBookAnalysis.threshold)} on ${cashBookAnalysis.nonCompliantDays} of ${cashBookAnalysis.totalDays} day(s); peak balance ${fmtR(cashBookAnalysis.highestCB)} on ${cashBookAnalysis.highestDate}. Notional interest at 12% p.a. on the excess aggregates to ${fmtR(cashBookAnalysis.totalInterest)}. Retention of heavy cash balances breaches Para 6.12.1 of the Audit Manual for PACS and the Society's bye-laws, exposing it to misappropriation and idle-cash risks. The CEO shall remit excess cash to the financing DCC Bank on the same working day, strengthen internal controls, and report compliance at the next audit; surcharge under Section 60 may be examined.`,
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
            title: `Loan Recoveries — ${a.fileName} — Interest Tally with Simple Interest Baseline`,
            narrative: `Loan Recoveries verification of "${a.fileName}" against the simple-interest baseline [P × R × Days ÷ 36500] shows actual interest tallies with expected. Across ${a.records.length} record(s), Expected ${fmtR2(a.totalExpected)} vs Actual ${fmtR2(a.totalActual)}, net discrepancy ${fmtR2(a.netDiscrepancy)}. The banking software is configured correctly in conformity with the CAS Manual; the CEO is commended for ledger discipline on this batch.`,
          });
        } else {
          demerits.push({
            category: 'financial',
            title: `Loan Recoveries — ${a.fileName} — Interest Recovery Discrepancy / Hidden Penal Charges`,
            narrative: `Loan Recoveries verification of "${a.fileName}" against the simple-interest baseline [P × R × Days ÷ 36500] reveals a net discrepancy of ${fmtR2(a.netDiscrepancy)} across ${a.records.length} record(s) — Expected ${fmtR2(a.totalExpected)} vs Actual ${fmtR2(a.totalActual)}. ${a.netDiscrepancy > 0 ? 'The excess suggests hidden penal/overdue interest applied on accounts settled past due date.' : 'The shortfall suggests under-recovery or missed interest accruals.'} This breaches the income-recognition principles of the CAS Manual and Section 55-A of the APCS Act, 1964. The CEO shall reconcile postings on the affected accounts, restore correct entries with member consent for any genuine penal element, and report rectification at the next monthly audit; persistent non-compliance attracts direction under Section 54.`,
          });
        }
      });
    }

    // 5h) Custom defects added via Defect Sheet Generator view
    customDefects.forEach((d) => {
      demerits.push({
        category: d.category,
        title: d.title,
        narrative: d.narrative,
      });
    });

    // 6) STANDARD RECURRING DEMERITS (per Audit Manual & APCS Act)

    // 6-zero MERGED) AUDITOR'S SCOPE RESERVATION — Sections 50, 51, 52, 54, 55-A, 60 + Audit Manual
    demerits.push({
      category: 'administrative',
      title:
        "Auditor's Scope Reservation — Non-Production of Records & Society's Sole Responsibility (Sections 50, 51, 52, 54, 55-A, 60 APCS Act, 1964)",
      narrative: `The present audit has been conducted under Section 50 of the APCS Act, 1964 on the basis of records made available and submitted by the Society for verification. Certain issues remain not fully discernible owing to (a) non-availability / non-production of primary records, (b) suppression of material facts, and (c) absence of supporting vouchers and documents at the time of audit. Accordingly, any irregularities that may subsequently come to light are not attributable to any lapse on the part of the auditor. The responsibility for maintaining proper books of account, registers, vouchers and primary documents — and for producing the same before the auditor — rests solely on the Managing Committee, the Chief Executive Officer and the staff of the Society under Section 55-A of the APCS Act, 1964 read with Rules 58 and 59 of the Rules, the CAS Manual, and Paragraphs 6.12.2, 6.12.3 and 7.1 of the Audit Manual for PACS. Should any subsequent inquiry under Section 51 or inspection under Section 52 reveal misappropriation, fraud or loss for this audit period, the CEO and Managing Committee shall be held responsible and liable to surcharge under Section 60, in addition to disciplinary, criminal and other action under the APCS Act, IPC and CrPC; the Registrar may further issue rectification directions under Section 54.`,
    });

    // 6-pre) Scope limitation on interest verification — Para 7.4 & 7.5, Audit Manual + §60 APCS Act
    demerits.push({
      category: 'administrative',
      title:
        'Limitation of Audit Scope on Interest Collection — Editable Interest Component (Para 7.4 & 7.5, Audit Manual for PACS)',
      narrative: `Interest collection on loans and advances could not be verified with full assurance because (a) the interest component in the loans module is editable by users beyond the Secretary / System Administrator, contrary to Paragraph 7.4 of the Audit Manual for PACS, and (b) the audit-trail log of interest-rate changes required under Paragraph 7.5 was not produced. Should any misappropriation or irregularity in the interest component subsequently come to light for this audit period, the Chief Executive Officer shall be held personally responsible for the resulting loss and liable to surcharge under Section 60 of the APCS Act, 1964, in addition to disciplinary and criminal action under the APCS Act, IPC and CrPC. The Managing Committee shall (i) restrict interest-component editing to the Secretary / System Administrator under Para 7.4, (ii) configure a tamper-proof audit-trail log of interest changes, and (iii) produce the corrected access matrix and audit log at the next monthly audit.`,
    });

    // 6a) GB discussion of accounts and audit reports — Section 30, Rule 22
    demerits.push({
      category: 'administrative',
      title:
        'Audit Reports & Annual Accounts Not Placed Before General Body — Section 30(2) r/w Rule 22',
      narrative: `The annual accounts, audit reports and defaulters' list have not been demonstrated as placed before, and discussed by, the General Body as required under Section 30(2) of the APCS Act, 1964 read with Rule 22 of the Rules. The General Body is the supreme democratic forum of the cooperative; non-placement undermines member accountability and corrective action on audit defects. The Managing Committee shall convene the General Body, record formal resolutions on each defect, and produce the minute book at the next monthly audit; failure attracts the cessation provisions of Section 50(5).`,
    });

    // 6c+6d MERGED) Managing Committee governance failures — BDP + Budget + Defect Rectification Register
    demerits.push({
      category: 'administrative',
      title:
        'Managing Committee Governance — Absence of Business Development Plan, Annual Budget & Defect Rectification Register (Sections 30, 54 APCS Act, 1964)',
      narrative: `The Society has failed in two material governance duties of the Managing Committee. First, neither a Business Development Plan for sustainable growth nor an annual budget approved by the General Body has been prepared, contrary to Section 30 of the APCS Act, 1964 and NABARD's viability guidance for PACS — expenditure incurred during the period therefore lacks a duly approved financial framework. Second, the Defect Rectification Register documenting action taken on defects from previous audits has not been maintained, breaching Section 54 of the Act which requires the Society to act on defects within the time specified by the Registrar, and the procedural directions of the Audit Manual for PACS. The Managing Committee is directed to (i) prepare and place before the General Body a five-year Business Development Plan (covering credit growth, non-credit diversification, recovery strategy and CoM discipline under Section 115-D) and the annual budget for the ensuing year, and (ii) maintain the Defect Rectification Register in the prescribed form with documented action-taken-reports; both shall be produced at the next monthly audit.`,
    });

    // Compile audit date and society
    const today = new Date();
    const auditDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    return {
      societyName: societyName || 'Society',
      auditDate,
      merits,
      demerits,
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
            // small delay so each file flashes visibly in UI
            await new Promise((r) => setTimeout(r, 220));

            uploadedPdfFiles.push(entryName);

            const lowerName = entryName.toLowerCase();

            const pdfText = await extractPDFText(zipEntry);

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
              const pdfBytes = await zipEntry.async('uint8array');

              const pdfDocument = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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
              const pdfBytes = await zipEntry.async('uint8array');

              const pdfDocument = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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
              const pdfBytes = await zipEntry.async('uint8array');

              const pdfDocument = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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
              const pdfBytes = await zipEntry.async('uint8array');

              const pdfDocument = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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
              const pdfBytes = await zipEntry.async('uint8array');

              const pdfDocument = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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
              const bsTextRaw = await extractPDFText(zipEntry);
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
              const pdfBytesS9 = await zipEntry.async('uint8array');
              const docS9 = await PDFJS.getDocument({
                data: pdfBytesS9,
              }).promise;

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
              const pdfBytes16B = await zipEntry.async('uint8array');
              const docS16B = await PDFJS.getDocument({
                data: pdfBytes16B,
              }).promise;

              const amtRe16 =
                /^(?:\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{1,2})$/;

              let totalAbove3Yrs = 0;
              let accountsAbove3Yrs = 0;
              let totalClosingBalance = 0;
              let pagesProcessed = 0;

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

                // Find the label "above 3 years"
                const aboveLabel = items.find(
                  (it) =>
                    /above\s*3\s*years/i.test(it.text) &&
                    it.x < 250
                );
                // Find the label "Closing Balance"
                const closingLabel = items.find(
                  (it) =>
                    /closing\s*balance/i.test(it.text) &&
                    it.x < 250
                );

                if (!aboveLabel) continue;
                pagesProcessed += 1;

                // Values are BELOW the label in PDF coords (smaller y)
                // Look for amount items within 35 units below the label
                const aboveValues = items.filter(
                  (it) =>
                    it.y < aboveLabel.y &&
                    aboveLabel.y - it.y <= 35 &&
                    it.x >= 155 &&
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
                        it.x >= 155 &&
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

              const isMerit16 = accountsAbove3Yrs === 0;

              const merit16 = `Verification of Schedule-16B (Sundry Debtors) of the Society confirms that there are no accounts with dues outstanding for more than three (3) years; all Sundry Debtor balances aggregating to ${fmt16(totalClosingBalance)} are within the recoverable age-bracket. This reflects diligent monitoring of receivables by the Managing Committee in discharge of its duty under Section 30(xxii) of the Andhra Pradesh Cooperative Societies Act, 1964 (review of overdues and defaulters), and timely action by the Chief Executive Officer in compliance with Rule 41(C)(6) of the APCS Rules, 1964 (declaration of overdue debtors once every quarter). The Sundry Debtors ageing posture conforms to the NABARD IRAC norms read with the Manual on Chart of Accounts (CAS) for PACS and is commended from an audit standpoint.`;

              const demerit16 = `Verification of Schedule-16B (Sundry Debtors) of the Society reveals that ${accountsAbove3Yrs} account(s) have outstanding dues exceeding three (3) years aggregating to ${fmt16(totalAbove3Yrs)} against a total Sundry Debtors closing balance of ${fmt16(totalClosingBalance)}. As per the Manual on Chart of Accounts (CAS) for PACS read with the NABARD Income Recognition, Asset Classification and Provisioning (IRAC) norms, such dues — being classified under "No scope for realization" — require 100% provision in the books, and the Schedule-9 (Provisions) of the Society shall demonstrate adequate provisioning to that effect. The non-recovery of these long-aged Sundry Debtors constitutes a material audit defect under Section 30(xxii) of the Andhra Pradesh Cooperative Societies Act, 1964 — which casts a duty on the Managing Committee to conduct a periodical review of all overdues and defaulters — read with Rule 41(C)(6) of the APCS Rules, 1964 — which mandates declaration of overdue debtors once every quarter — and Section 55-A of the Act read with Rules 58 and 59 (correct maintenance and authentication of accounts and provisions). In exercise of the directions under Section 54 of the Act (Rectification of defects), the Chief Executive Officer is hereby directed to (a) initiate immediate legal action or recovery proceedings on these long-overdue Sundry Debtor accounts, (b) ensure that 100% provision is created in the books in accordance with the IRAC norms and reflected in Schedule-9, (c) place the matter before the Managing Committee for resolution and obtain its approval for write-off where realization is established to be impossible, and (d) report the corrective action at the next monthly audit. Persistent failure shall be reported to the Registrar for direction under Section 54 of the Act and the CEO and Managing Committee shall be held responsible for any loss to the Society arising from time-barred Sundry Debtor claims.`;

              narrativesAccum.push({
                key: 'schedule16b',
                fileName: entryName,
                title:
                  'Schedule-16B · Sundry Debtors (Above 3 Years)',
                metricLabel: 'Accts > 3 yrs · Total',
                metricValue: `${accountsAbove3Yrs} acct(s) · ${fmt16(totalAbove3Yrs)}`,
                status: isMerit16 ? 'merit' : 'demerit',
                narrative: isMerit16 ? merit16 : demerit16,
              });
            }

            // === Annexure-5 — Calculation of Imbalance audit ===
            if (/annexure[\s\-]*5(?![0-9])/i.test(entryName)) {
              const pdfBytesA5 = await zipEntry.async('uint8array');
              const docA5 = await PDFJS.getDocument({
                data: pdfBytesA5,
              }).promise;

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
              const pdfBytes = await zipEntry.async('uint8array');
              const pdfDocument = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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

                const meritNarrative = `Annexure-8 verification shows the Society generated a positive Total Income of ₹${formatted} in the previous year, supporting the prescribed ceilings under Section 115-D of the APCS Act, 1964 and NABARD norms — Cost of Management at 50% (₹${com50}) and Staff Cost at 30% (₹${staff30}). The Managing Committee and Chief Executive Officer are commended for sound revenue generation and prudent financial stewardship.`;
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

                const negativeStaff = sc !== null && sc < 0;
                const negativeCOM = cm !== null && cm < 0;
                const isDemeritPct = negativeStaff || negativeCOM;

                const meritPct = `Annexure-8 shows positive ratios — Staff Cost at ${scFmt} and Cost of Management at ${cmFmt} of Total Income. Computed on a positive income base, these ratios indicate a measurable foundation against which the Section 115-D ceilings (30% / 50%) may be tested. The Managing Committee is expected to consolidate this position and keep the ratios within the prescribed limits.`;
                const demeritPct = `Annexure-8 discloses a NEGATIVE Staff Cost percentage (${scFmt}) ${negativeCOM ? 'and NEGATIVE Cost of Management percentage (' + cmFmt + ') ' : '(COM at ' + cmFmt + ') '}of Total Income. A negative ratio arises only on a negative income base, meaning expenditures have outstripped income for the period. With a negative base, the Section 115-D ceilings become inoperative, rendering the Society ineligible to incur staff salaries and management expenses to that extent. The Managing Committee and CEO shall pursue augmentation of interest income, overdue recovery under Section 30(xxii) read with Rule 41(C)(6) and rigorous expense control; persistent breach attracts direction under Section 54.`;

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
              const pdfBytes = await zipEntry.async('uint8array');
              const docS16B = await PDFJS.getDocument({
                data: pdfBytes,
              }).promise;

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

      // brief pause so the final "Compiling…" stage is visible
      await new Promise((r) => setTimeout(r, 400));

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
    <p style="margin:4px 0 0 0; font-size:10pt;">An Initiative of Ministry of Cooperation, Govt. of India &amp; NABARD</p>
  </div>

  <div class="meta">
    <div><b>Society :</b> ${escapeHtml(
      defectSheet.societyName
    )}</div>
    <div><b>Audit Date :</b> ${escapeHtml(
      defectSheet.auditDate
    )}</div>
    <div><b>Printed On :</b> ${escapeHtml(today)}</div>
  </div>

  <div class="section"><h2>PART A — MERITS (Compliance &amp; Strengths)</h2></div>
  ${meritsHtml}

  <div class="section"><h2>PART B — DEMERITS (Defects &amp; Irregularities)</h2></div>
  <p style="font-size:10.5pt; font-style:italic; margin:4px 0 10px 0; border-left:3px solid #888; padding-left:8px;">
    During the course of audit, the auditors have identified the following irregularities and defects which, in the professional opinion of the Lead Statutory Auditor, require reporting to the Managing Committee and/or the General Body for necessary resolution. The defects are categorised into Financial, Accounting and Administrative Irregularities in accordance with the Audit Manual of PACS.
  </p>
  ${
    demeritsByCategory ||
    '<p class="empty">No material defects were noticed during the audit verification.</p>'
  }

  <div class="doc-footer">
    System Generated Report &mdash; Does Not Require Signature<br/>
    Generated by COOP·AUDIT·AI &mdash; Lead Statutory Auditor (AI-assisted) &mdash; ${escapeHtml(
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#031b1a] to-emerald-950 flex overflow-hidden text-white relative font-sans">
      <aside className="w-[320px] min-h-screen bg-slate-950/60 backdrop-blur-2xl text-white flex flex-col border-r border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-60 h-60 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <div className="relative p-8 border-b border-white/10">
          <div className="flex flex-col items-center text-center gap-5">
            <LogoMark />

            <div className="text-center w-full">
              {societyName && (
                <div className="relative mb-4 px-4 py-3 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-violet-500/15 border border-emerald-400/40 backdrop-blur-md anim-slide-up overflow-hidden shadow-[0_0_25px_rgba(52,211,153,0.25)]">
                  <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
                  <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-yellow-300/20 blur-2xl pointer-events-none animate-pulse" />

                  <div className="relative">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/90 mb-2 font-mono-techy font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Uploaded File Name
                    </div>

                    <div className="font-display font-black text-base tracking-wide break-words leading-tight gradient-text-fire">
                      {societyName}
                    </div>
                  </div>
                </div>
              )}

              <h1 className="font-display text-[clamp(1.25rem,5.5vw,1.75rem)] font-black tracking-[0.08em] gradient-text whitespace-nowrap leading-none">
                COOP·AUDIT·AI
              </h1>
              <div className="mt-2 text-[9px] uppercase tracking-[0.35em] text-cyan-300/50 font-mono-techy whitespace-nowrap">
                Cooperative · Audit · Intelligence
              </div>
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
            v1.0 · Neural Verifier
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-2xl rounded-[32px] border border-emerald-400/20 p-8 shadow-[0_0_80px_rgba(52,211,153,0.15)] anim-slide-up">
            <div className="absolute inset-0 cyber-grid opacity-60 pointer-events-none" />
            <div className="absolute -top-32 -right-24 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-24 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-5">
                <div className="relative anim-float">
                  <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-60" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-yellow-400 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.6)]">
                    <FileArchive className="w-8 h-8 text-slate-950" strokeWidth={2.5} />
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

              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="relative anim-float">
                  <div className="absolute inset-0 bg-orange-400/40 blur-2xl rounded-full" />
                  <div
                    className="relative rounded-full bg-white/95 p-1 shadow-[0_0_35px_rgba(251,146,60,0.5)] ring-2 ring-orange-400/50"
                    style={{
                      width: 'clamp(4.5rem, 6vw, 6rem)',
                      height: 'clamp(4.5rem, 6vw, 6rem)',
                    }}
                  >
                    <img
                      src={epacsLogo}
                      alt="e-PACS — ERP for Agriculture Cooperatives"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                </div>

                <div className="max-w-[280px] text-center">
                  <div className="font-display font-black text-[clamp(11px,1.35vw,15px)] tracking-[0.18em] uppercase gradient-text-fire leading-tight">
                    ERP for Agriculture
                  </div>
                  <div className="font-display font-black text-[clamp(11px,1.35vw,15px)] tracking-[0.18em] uppercase gradient-text-fire leading-tight">
                    Cooperatives
                  </div>
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
          {!loading && missingFiles.length > 0 && (
            <div className="relative overflow-hidden rounded-[28px] border-2 border-rose-400/60 bg-gradient-to-r from-rose-500/15 via-fuchsia-500/10 to-rose-500/15 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] anim-slide-up">
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />

              <div className="relative flex items-start gap-5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-rose-400 blur-2xl opacity-60 anim-blink" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 via-pink-400 to-fuchsia-400 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.7)]">
                    <XCircle
                      className="w-8 h-8 text-slate-950 anim-blink"
                      strokeWidth={2.8}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-[10px] uppercase tracking-[0.45em] text-rose-300/80 font-mono-techy font-bold">
                      Files Missing
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 font-display text-[10px] font-bold tracking-[0.2em] anim-blink">
                      {missingFiles.length} MISSING
                    </span>
                  </div>
                  <div className="font-display text-lg lg:text-xl font-black text-rose-200 mb-3 tracking-wide">
                    The following required files are missing from the ZIP
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingFiles.map((name) => (
                      <span
                        key={name}
                        className="anim-blink inline-flex items-center px-3 py-1.5 rounded-lg border border-rose-400/50 bg-rose-500/15 text-rose-200 font-mono-techy text-[11px] font-bold tracking-wide shadow-[0_0_15px_rgba(244,63,94,0.4)]"
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
            <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-2xl border border-emerald-400/30 rounded-[32px] p-8 shadow-[0_0_80px_rgba(52,211,153,0.25)] anim-slide-up">
              {/* scan line */}
              <div
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent pointer-events-none"
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
                    className="absolute w-24 h-28 rounded-lg border border-white/10 bg-slate-800/50 backdrop-blur-sm shadow-[0_4px_18px_rgba(0,0,0,0.5)]"
                    style={{ transform: 'translate(14px, 8px) rotate(7deg)' }}
                  />
                  <div
                    className="absolute w-24 h-28 rounded-lg border border-white/10 bg-slate-800/70 backdrop-blur-sm shadow-[0_4px_18px_rgba(0,0,0,0.5)]"
                    style={{ transform: 'translate(7px, 4px) rotate(3.5deg)' }}
                  />

                  {/* main scanning page */}
                  <div className="relative w-24 h-28 rounded-lg border border-emerald-400/50 bg-slate-950/85 overflow-hidden shadow-[0_0_32px_rgba(52,211,153,0.5)]">
                    {/* PDF badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[3px] text-[7px] font-mono-techy font-bold bg-rose-500/90 text-white tracking-[0.15em] shadow">
                      PDF
                    </div>

                    {/* document text lines */}
                    <div className="absolute inset-x-2 top-7 bottom-2 flex flex-col gap-1.5">
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm" />
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm w-5/6" />
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm w-3/4" />
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm" />
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm w-2/3" />
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm w-4/5" />
                      <div className="h-[3px] bg-cyan-300/40 rounded-sm w-1/2" />
                    </div>

                    {/* horizontal scan beam */}
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_18px_4px_rgba(52,211,153,0.75)] pointer-events-none anim-page-scan" />

                    {/* soft scan glow tracking the beam */}
                    <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-emerald-400/25 via-emerald-400/5 to-transparent pointer-events-none anim-page-scan-trail" />
                  </div>

                  {/* corner brackets framing the scan area */}
                  <div className="absolute w-32 h-32 pointer-events-none">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                    <div className="text-[10px] uppercase tracking-[0.45em] text-cyan-300/80 font-mono-techy font-bold">
                      AI Neural Engine · Live Scan
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] uppercase tracking-[0.3em] text-emerald-300/70 font-mono-techy">
                      {currentStage || 'Initializing…'}
                    </div>
                    <div className="font-display text-xl md:text-2xl font-black gradient-text break-all leading-snug">
                      {currentProcessingFile || 'Awaiting first PDF…'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono-techy uppercase tracking-[0.25em] text-cyan-200/70">
                      <span>
                        File {Math.min(processedCount + 1, totalCount || 1)} / {totalCount || 1}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {Math.round(
                          (processedCount / (totalCount || 1)) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 relative">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 via-violet-400 to-pink-400 transition-all duration-500 shadow-[0_0_25px_rgba(52,211,153,0.6)]"
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
                                ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                                : 'border-white/10 text-white/40'
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

          {/* Two-column layout: Statements TABLE (left) + Audit RESULTS panel (right) */}
          {activeView === 'dashboard' && !loading && (detectedFiles.length > 0 || auditResults.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* LEFT — Statements Table */}
              <div className="xl:col-span-6 relative overflow-hidden bg-slate-900/50 backdrop-blur-2xl rounded-[28px] border border-white/10 shadow-[0_0_60px_rgba(52,211,153,0.12)] anim-slide-up">
                <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

                <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-violet-500/10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-emerald-300" />
                      <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-300/80 font-mono-techy font-bold">
                        Step 02 · Detect
                      </div>
                    </div>
                    <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text">
                      FINANCIAL STATEMENTS
                    </h3>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-300/80 font-mono-techy">
                      Available
                    </div>
                    <div className="font-display text-xl font-black text-emerald-300 text-right leading-none">
                      {availableCount}/{statementRows.length}
                    </div>
                  </div>
                </div>

                <div className="relative overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 border-b border-white/10">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy">
                          Statement
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementRows.map((row, idx) => {
                        const available = row.status === 'Available';
                        const Icon = row.icon;
                        return (
                          <tr
                            key={row.key}
                            className="border-b border-white/5 hover:bg-white/[0.03] transition-colors anim-row"
                            style={{ animationDelay: `${idx * 0.09}s` }}
                          >
                            <td className="px-4 py-4 align-middle text-cyan-300/50 font-mono-techy text-sm">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                    available
                                      ? 'bg-white/5 border-white/10'
                                      : 'bg-rose-500/5 border-rose-400/20'
                                  }`}
                                >
                                  <Icon className={`w-4 h-4 ${row.iconColor}`} />
                                </div>
                                <div className="font-display font-bold tracking-[0.1em] text-white text-sm">
                                  {row.label.toUpperCase()}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center align-middle">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] tracking-[0.2em] font-display font-bold border ${
                                  available
                                    ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                                    : 'bg-rose-400/10 border-rose-400/30 text-rose-300'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    available ? 'bg-emerald-300' : 'bg-rose-300'
                                  } animate-pulse`}
                                />
                                {row.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT — Animated audit result cards */}
              <div className="xl:col-span-6 space-y-4">
                <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-2xl rounded-[28px] border border-white/10 px-6 py-5 shadow-[0_0_60px_rgba(168,85,247,0.12)] anim-slide-up">
                  <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-violet-400 blur-xl opacity-60 animate-pulse" />
                        <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-violet-400 via-pink-400 to-yellow-400 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                          <ShieldCheck className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Activity className="w-3 h-3 text-violet-300 animate-pulse" />
                          <div className="text-[10px] uppercase tracking-[0.4em] text-violet-300/80 font-mono-techy font-bold">
                            Step 03 · Verify
                          </div>
                        </div>
                        <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text-fire">
                          AUDIT RESULTS
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">
                          OK
                        </div>
                        <div className="font-display text-lg font-black text-emerald-300 leading-none">
                          {talliedCount}
                        </div>
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-rose-300/80 font-mono-techy">
                          Def
                        </div>
                        <div className="font-display text-lg font-black text-rose-300 leading-none">
                          {auditResults.length - talliedCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {auditResults.length === 0 && (
                  <div className="rounded-[28px] border border-white/10 bg-slate-900/40 backdrop-blur-2xl p-10 text-center">
                    <div className="text-5xl mb-3 anim-float">🔍</div>
                    <div className="font-display tracking-[0.15em] text-white/80 text-sm">
                      NO VERIFICATIONS YET
                    </div>
                    <div className="text-xs text-cyan-200/50 mt-1 font-mono-techy">
                      Required PDFs may be missing from the ZIP.
                    </div>
                  </div>
                )}

                {auditResults.map((result, index) => (
                  <div
                    key={index}
                    className={`relative overflow-hidden rounded-[24px] border backdrop-blur-2xl p-5 anim-row ${
                      result.tallied
                        ? 'bg-slate-900/50 border-emerald-400/30 shadow-[0_0_40px_rgba(52,211,153,0.15)]'
                        : 'bg-slate-900/50 border-rose-400/30 shadow-[0_0_40px_rgba(244,63,94,0.18)]'
                    }`}
                    style={{ animationDelay: `${index * 0.13}s` }}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        result.tallied
                          ? 'bg-gradient-to-b from-emerald-400 via-cyan-400 to-violet-400'
                          : 'bg-gradient-to-b from-rose-400 via-pink-400 to-fuchsia-400'
                      } shadow-[0_0_20px_currentColor]`}
                    />
                    <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-40 bg-gradient-to-br from-violet-400 to-emerald-400" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-black tracking-[0.15em] text-white text-sm uppercase">
                            {result.statementType}
                          </div>
                          <div className="text-[10px] text-cyan-200/60 break-all mt-1 font-mono-techy">
                            {result.fileName}
                          </div>
                        </div>
                        {result.tallied ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                            <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
                            Tallied
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/50 text-rose-300 font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(244,63,94,0.4)] anim-shake">
                            <XCircle className="w-3 h-3" strokeWidth={3} />
                            Mismatch
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-400/20 p-3">
                          <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-200/70 font-mono-techy font-bold mb-1.5 line-clamp-2">
                            {result.label1}
                          </div>
                          <div className="font-display font-black text-emerald-300 text-lg break-all leading-tight">
                            ₹{result.amount1.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-400/20 p-3">
                          <div className="text-[9px] uppercase tracking-[0.25em] text-violet-200/70 font-mono-techy font-bold mb-1.5 line-clamp-2">
                            {result.label2}
                          </div>
                          <div className="font-display font-black text-yellow-300 text-lg break-all leading-tight">
                            ₹{result.amount2.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {result.aiRemark && (
                        <div
                          className={`mt-3 text-[11px] italic px-3 py-2 rounded-lg border ${
                            result.tallied
                              ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-100/90'
                              : 'bg-rose-400/5 border-rose-400/20 text-rose-100/90'
                          }`}
                        >
                          <span className="font-mono-techy font-bold">
                            AI ▸
                          </span>{' '}
                          {result.aiRemark}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === UPLOAD DOCUMENTS VIEW — file listing with financial-data verification === */}
          {activeView === 'documents' && !loading && (
            <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-2xl rounded-[28px] border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.12)] anim-slide-up">
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

              <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-pink-500/10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Upload className="w-3 h-3 text-cyan-300" />
                    <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/80 font-mono-techy font-bold">
                      ZIP Inventory
                    </div>
                  </div>
                  <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text">
                    UPLOAD DOCUMENTS
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-cyan-300/80 font-mono-techy">
                      Files
                    </div>
                    <div className="font-display text-lg font-black text-cyan-300 leading-none text-right">
                      {documentRows.length}
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">
                      With Data
                    </div>
                    <div className="font-display text-lg font-black text-emerald-300 leading-none text-right">
                      {
                        documentRows.filter(
                          (r) =>
                            r.financialDataStatus === 'Available' ||
                            r.financialDataStatus === 'Verified'
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>

              {documentRows.length === 0 ? (
                <div className="relative p-12 text-center">
                  <div className="text-5xl mb-3 anim-float">📂</div>
                  <div className="font-display tracking-[0.15em] text-white/80 text-sm">
                    NO DOCUMENTS LOADED
                  </div>
                  <div className="text-xs text-cyan-200/50 mt-1 font-mono-techy">
                    Upload a ZIP file from the Dashboard to populate this list.
                  </div>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 border-b border-white/10">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy">
                          File Name
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy">
                          Document Type
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy">
                          Financial Table Data
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentRows.map((row, idx) => {
                        const pillClass =
                          row.financialDataStatus === 'Verified'
                            ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                            : row.financialDataStatus === 'Available'
                            ? 'bg-cyan-400/15 border-cyan-400/40 text-cyan-300'
                            : 'bg-white/5 border-white/15 text-white/50';
                        const dotClass =
                          row.financialDataStatus === 'Verified'
                            ? 'bg-emerald-300'
                            : row.financialDataStatus === 'Available'
                            ? 'bg-cyan-300'
                            : 'bg-white/40';
                        return (
                          <tr
                            key={row.fileName}
                            className="border-b border-white/5 hover:bg-white/[0.03] transition-colors anim-row"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                          >
                            <td className="px-4 py-3 align-middle text-cyan-300/50 font-mono-techy text-sm">
                              {Number.isFinite(row.serial)
                                ? String(row.serial).padStart(2, '0')
                                : '—'}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="font-mono-techy text-[12px] text-white/90 break-all">
                                {row.fileName}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span
                                className={`font-display tracking-[0.08em] text-[11px] ${
                                  row.type === 'Other / Unclassified'
                                    ? 'text-white/50 italic'
                                    : 'text-white/90'
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center align-middle">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] tracking-[0.2em] font-display font-bold border ${pillClass}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${dotClass} ${
                                    row.financialDataStatus !== 'N/A'
                                      ? 'animate-pulse'
                                      : ''
                                  }`}
                                />
                                {row.financialDataStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* === REPORT ANALYSIS VIEW — Cash Book & Loan Recoveries === */}
          {activeView === 'reports' && !loading && (
            <div className="space-y-6 anim-slide-up">
              {/* Header */}
              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/50 backdrop-blur-2xl px-6 py-5 shadow-[0_0_60px_rgba(251,191,36,0.15)]">
                <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <div className="relative flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-50 animate-pulse" />
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                      <FileCheck2
                        className="w-6 h-6 text-slate-950"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300/80 font-mono-techy font-bold">
                        Supplementary Reports
                      </div>
                    </div>
                    <h3 className="font-display text-xl lg:text-2xl font-black tracking-[0.15em] gradient-text-fire">
                      REPORT ANALYSIS
                    </h3>
                  </div>
                </div>
              </div>

              {/* SECTION 1 — Cash Book Report (single file) */}
              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/55 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(52,211,153,0.12)]">
                <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                    <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-300/80 font-mono-techy font-bold">
                      Section 1
                    </div>
                  </div>
                  <h4 className="font-display text-lg lg:text-xl font-black tracking-[0.12em] gradient-text mb-3">
                    UPLOAD CASH BOOK REPORT
                  </h4>
                  <p className="text-xs text-cyan-200/60 mb-4 font-mono-techy uppercase tracking-[0.12em]">
                    Single PDF file only · Must contain tabular
                    financial data
                  </p>

                  {/* Byelaw threshold input */}
                  <div className="mb-5 p-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/5">
                    <label className="block">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-mono-techy font-bold mb-2">
                        Enter Cash Balance Retention Permittable Per Day
                        (As per Byelaw)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-display text-emerald-300 font-black">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={cashBalanceThreshold}
                          onChange={(e) =>
                            setCashBalanceThreshold(e.target.value)
                          }
                          className="flex-1 bg-slate-950/70 border border-white/15 rounded-xl px-4 py-2.5 font-display text-lg font-bold text-white tracking-wide focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                          placeholder="500"
                        />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/60 font-mono-techy">
                          per day
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-200/50 mt-2 italic">
                        This is the maximum daily cash retention
                        allowed by the Society's bye-laws. Closing
                        balances exceeding this limit will attract a
                        12% per-day interest penalty.
                      </div>
                    </label>
                  </div>

                  <label
                    className={`block cursor-pointer relative overflow-hidden rounded-[20px] border-2 border-dashed backdrop-blur-2xl px-8 py-10 text-center transition-all duration-300 ${
                      cashBookReport && cashBookReport.ok
                        ? 'border-emerald-400/60 bg-emerald-500/10'
                        : cashBookError
                        ? 'border-rose-400/60 bg-rose-500/10'
                        : 'border-white/20 bg-slate-900/40 hover:border-emerald-400/40 hover:bg-slate-900/55'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={cashBookProcessing}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCashBookUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <div className="relative">
                      {cashBookProcessing ? (
                        <>
                          <div className="text-5xl mb-3 anim-float">⏳</div>
                          <div className="font-display tracking-[0.18em] text-white text-base">
                            VALIDATING…
                          </div>
                          <div className="text-[11px] text-cyan-200/60 mt-1 font-mono-techy uppercase tracking-[0.15em]">
                            Extracting PDF content
                          </div>
                        </>
                      ) : cashBookReport && cashBookReport.ok ? (
                        <>
                          <div className="text-5xl mb-3">✅</div>
                          <div className="font-display tracking-[0.18em] gradient-text text-base mb-1">
                            UPLOAD SUCCESSFUL
                          </div>
                          <div className="text-[12px] text-emerald-200 font-mono-techy break-all">
                            {cashBookReport.fileName}
                          </div>
                          <div className="text-[10px] text-emerald-200/70 mt-1 font-mono-techy uppercase tracking-[0.15em]">
                            {cashBookReport.pages} page
                            {cashBookReport.pages === 1 ? '' : 's'}{' '}
                            · {cashBookReport.distinctAmounts}{' '}
                            distinct financial values · {cashBookReport.sizeKB} KB
                          </div>
                          <div className="text-[10px] text-cyan-200/50 mt-3 italic">
                            Click to replace with another file
                          </div>
                        </>
                      ) : cashBookReport && !cashBookReport.ok ? (
                        <>
                          <div className="text-5xl mb-3 anim-blink">❌</div>
                          <div className="font-display tracking-[0.18em] gradient-text-fire text-base mb-1">
                            INVALID FILE
                          </div>
                          <div className="text-[12px] text-rose-200 font-mono-techy break-all">
                            {cashBookReport.fileName}
                          </div>
                          <div className="text-[10px] text-rose-300/80 mt-1 font-mono-techy uppercase tracking-[0.15em]">
                            Reason: {cashBookReport.reason}
                          </div>
                          <div className="text-[10px] text-cyan-200/60 mt-3 italic">
                            Click to upload again
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-3 anim-float">📄</div>
                          <div className="font-display tracking-[0.2em] gradient-text text-base mb-2">
                            CLICK TO UPLOAD CASH BOOK
                          </div>
                          <div className="text-[11px] text-cyan-200/60 font-mono-techy uppercase tracking-[0.15em]">
                            PDF · Single file only
                          </div>
                        </>
                      )}
                    </div>
                  </label>

                  {cashBookError && (
                    <div className="mt-4 rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 flex items-center gap-3 anim-blink">
                      <XCircle
                        className="w-5 h-5 text-rose-300 shrink-0"
                        strokeWidth={2.5}
                      />
                      <div className="font-display tracking-[0.08em] text-rose-200 text-sm">
                        {cashBookError}
                      </div>
                    </div>
                  )}

                  {/* Cash Book Analysis Table */}
                  {cashBookAnalysis && cashBookAnalysis.rows.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3 h-3 text-emerald-300" />
                          <div className="font-display tracking-[0.18em] text-sm text-white font-black">
                            INTEREST PENALTY ANALYSIS · 12% p.a.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/15">
                            <div className="text-[9px] uppercase tracking-[0.25em] text-cyan-200/60 font-mono-techy">
                              Total Days
                            </div>
                            <div className="font-display text-base font-black text-cyan-300 leading-none text-right">
                              {cashBookAnalysis.totalDays}
                            </div>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30">
                            <div className="text-[9px] uppercase tracking-[0.25em] text-rose-300/80 font-mono-techy">
                              Non-Compliant
                            </div>
                            <div className="font-display text-base font-black text-rose-300 leading-none text-right">
                              {cashBookAnalysis.nonCompliantDays}
                            </div>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
                            <div className="text-[9px] uppercase tracking-[0.25em] text-amber-300/80 font-mono-techy">
                              Total Interest
                            </div>
                            <div className="font-display text-base font-black text-amber-300 leading-none text-right">
                              ₹{cashBookAnalysis.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-slate-950 z-10">
                            <tr className="border-b border-white/15">
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">Sl.No.</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">Date</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">Closing Balance (₹)</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">Excess (₹)</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">Status</th>
                              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono-techy">Interest @ 12% (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono-techy text-[11px]">
                            {cashBookAnalysis.rows.map((r) => (
                              <tr
                                key={r.slNo}
                                className={`border-b border-white/5 ${
                                  r.status === 'Non-Compliant'
                                    ? 'bg-rose-500/5'
                                    : ''
                                }`}
                              >
                                <td className="px-3 py-1.5 text-cyan-200/60">{r.slNo}</td>
                                <td className="px-3 py-1.5 text-white/90">{r.date}</td>
                                <td className="px-3 py-1.5 text-right text-white">
                                  {r.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-1.5 text-right text-amber-300">
                                  {r.excess > 0 ? r.excess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-display font-bold border ${
                                      r.status === 'Compliant'
                                        ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                                        : 'bg-rose-400/15 border-rose-400/40 text-rose-300'
                                    }`}
                                  >
                                    {r.status === 'Compliant' ? 'OK' : 'BREACH'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-right text-rose-200">
                                  {r.interest > 0 ? r.interest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-amber-500/10 border-t-2 border-amber-400/40 sticky bottom-0">
                              <td colSpan={5} className="px-3 py-2 text-right font-display font-black tracking-[0.15em] uppercase text-amber-200 text-xs">
                                Grand Total · Interest @ 12%
                              </td>
                              <td className="px-3 py-2 text-right font-display font-black text-amber-300 text-base">
                                ₹{cashBookAnalysis.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {cashBookAnalysis.nonCompliantDays > 0 && (
                        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 px-4 py-3 text-[12px] text-amber-100/90 italic">
                          <b className="not-italic">Summary:</b> Out of {cashBookAnalysis.totalDays} day(s) audited, {cashBookAnalysis.nonCompliantDays} day(s) breached the bye-law cash retention limit of ₹{cashBookAnalysis.threshold.toLocaleString('en-IN')}. The aggregate notional interest penalty at 12% per annum on the excess balances aggregates to <b className="not-italic text-amber-300">₹{cashBookAnalysis.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>. Peak closing balance: ₹{cashBookAnalysis.highestCB.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on {cashBookAnalysis.highestDate}.
                        </div>
                      )}

                      {/* Download Excel / PDF */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/70 font-mono-techy font-bold mr-2">
                          Download Report :
                        </div>
                        <button
                          type="button"
                          onClick={downloadCashBookCSV}
                          className="group relative flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 transition-all duration-300"
                        >
                          <span className="text-base">📊</span>
                          <span className="font-display tracking-[0.15em] uppercase text-[10px] font-black text-emerald-200">
                            Excel (CSV)
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={downloadCashBookPDF}
                          className="group relative flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-400/40 bg-gradient-to-r from-rose-500/15 to-pink-500/15 hover:from-rose-500/25 hover:to-pink-500/25 transition-all duration-300"
                        >
                          <span className="text-base">📄</span>
                          <span className="font-display tracking-[0.15em] uppercase text-[10px] font-black text-rose-200">
                            PDF
                          </span>
                        </button>
                      </div>

                      {/* Opt-in toggle for Defect Sheet inclusion */}
                      <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5 p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              cashBookIncludeInDefects
                                ? 'bg-emerald-500/20 border border-emerald-400/50'
                                : 'bg-slate-900/60 border border-white/15'
                            }`}
                          >
                            {cashBookIncludeInDefects ? (
                              <CheckCircle2
                                className="w-5 h-5 text-emerald-300"
                                strokeWidth={2.5}
                              />
                            ) : (
                              <ScrollText
                                className="w-5 h-5 text-cyan-300"
                                strokeWidth={2}
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-display text-sm font-black text-white tracking-[0.08em]">
                              {cashBookIncludeInDefects
                                ? 'Included in Defect Sheet'
                                : 'Add this Cash Book finding to Auditor Defect Sheet?'}
                            </div>
                            <div className="text-[10px] text-cyan-200/60 font-mono-techy uppercase tracking-[0.15em] mt-0.5">
                              {cashBookIncludeInDefects
                                ? 'This finding will appear under B.1 · Financial Irregularities'
                                : 'Confirm to include this analysis in the official defect sheet'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCashBookIncludeInDefects(
                              (v) => !v
                            )
                          }
                          className={`shrink-0 px-5 py-2.5 rounded-xl font-display tracking-[0.15em] uppercase text-[11px] font-black border transition-all duration-300 ${
                            cashBookIncludeInDefects
                              ? 'border-rose-400/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                              : 'border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 text-emerald-200 hover:from-emerald-500/30 hover:via-cyan-500/30 hover:to-emerald-500/30 shadow-[0_0_25px_rgba(52,211,153,0.2)]'
                          }`}
                        >
                          {cashBookIncludeInDefects
                            ? '✕ Remove'
                            : '+ Add to Defects'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2 — Loan Recoveries Reports (up to 12) */}
              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/55 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(168,85,247,0.12)]">
                <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]" />
                    <div className="text-[10px] uppercase tracking-[0.4em] text-violet-300/80 font-mono-techy font-bold">
                      Section 2
                    </div>
                  </div>
                  <h4 className="font-display text-lg lg:text-xl font-black tracking-[0.12em] gradient-text-fire mb-3">
                    UPLOAD LOAN RECOVERIES REPORT
                  </h4>
                  <p className="text-xs text-violet-200/60 mb-4 font-mono-techy uppercase tracking-[0.12em]">
                    Maximum 12 PDF files at a time · Each must
                    contain tabular financial data
                  </p>

                  <label
                    className={`block cursor-pointer relative overflow-hidden rounded-[20px] border-2 border-dashed backdrop-blur-2xl px-8 py-10 text-center transition-all duration-300 ${
                      loanRecoveryReports.length > 0 &&
                      loanRecoveryReports.every((r) => r.ok)
                        ? 'border-emerald-400/60 bg-emerald-500/10'
                        : loanRecoveryError
                        ? 'border-rose-400/60 bg-rose-500/10'
                        : 'border-white/20 bg-slate-900/40 hover:border-violet-400/40 hover:bg-slate-900/55'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      className="hidden"
                      disabled={loanRecoveryProcessing}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleLoanRecoveryUpload(files);
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="relative">
                      {loanRecoveryProcessing ? (
                        <>
                          <div className="text-5xl mb-3 anim-float">⏳</div>
                          <div className="font-display tracking-[0.18em] text-white text-base">
                            VALIDATING FILES…
                          </div>
                          <div className="text-[11px] text-violet-200/60 mt-1 font-mono-techy uppercase tracking-[0.15em]">
                            Extracting PDF contents
                          </div>
                        </>
                      ) : loanRecoveryReports.length > 0 ? (
                        <>
                          <div className="text-5xl mb-3">
                            {loanRecoveryReports.every((r) => r.ok)
                              ? '✅'
                              : '⚠️'}
                          </div>
                          <div className="font-display tracking-[0.18em] gradient-text-fire text-base mb-1">
                            {loanRecoveryReports.length} FILE
                            {loanRecoveryReports.length === 1 ? '' : 'S'}{' '}
                            PROCESSED
                          </div>
                          <div className="text-[11px] text-violet-200/70 mt-1 font-mono-techy uppercase tracking-[0.15em]">
                            {
                              loanRecoveryReports.filter((r) => r.ok)
                                .length
                            }{' '}
                            valid ·{' '}
                            {
                              loanRecoveryReports.filter(
                                (r) => !r.ok
                              ).length
                            }{' '}
                            invalid
                          </div>
                          <div className="text-[10px] text-cyan-200/50 mt-3 italic">
                            Click to upload another batch
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-3 anim-float">📁</div>
                          <div className="font-display tracking-[0.2em] gradient-text-fire text-base mb-2">
                            CLICK TO UPLOAD LOAN REPORTS
                          </div>
                          <div className="text-[11px] text-violet-200/60 font-mono-techy uppercase tracking-[0.15em]">
                            PDF · Up to 12 files
                          </div>
                        </>
                      )}
                    </div>
                  </label>

                  {loanRecoveryError && (
                    <div className="mt-4 rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 flex items-center gap-3 anim-blink">
                      <XCircle
                        className="w-5 h-5 text-rose-300 shrink-0"
                        strokeWidth={2.5}
                      />
                      <div className="font-display tracking-[0.08em] text-rose-200 text-sm">
                        {loanRecoveryError}
                      </div>
                    </div>
                  )}

                  {/* Per-file status table */}
                  {loanRecoveryReports.length > 0 && (
                    <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/40">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-violet-300/80 font-mono-techy w-12">
                              #
                            </th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-violet-300/80 font-mono-techy">
                              File Name
                            </th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-violet-300/80 font-mono-techy">
                              Pages
                            </th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-violet-300/80 font-mono-techy">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {loanRecoveryReports.map((r, idx) => (
                            <tr
                              key={`${r.fileName}-${idx}`}
                              className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                            >
                              <td className="px-4 py-2.5 align-middle text-violet-300/50 font-mono-techy text-sm">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="px-4 py-2.5 align-middle">
                                <div className="font-mono-techy text-[12px] text-white/90 break-all">
                                  {r.fileName}
                                </div>
                                {!r.ok && (
                                  <div className="text-[10px] text-rose-300/80 mt-0.5 font-mono-techy">
                                    {r.reason}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center align-middle text-cyan-200/70 text-sm font-mono-techy">
                                {r.pages || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-center align-middle">
                                {r.ok ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.2em] font-display font-bold border bg-emerald-400/15 border-emerald-400/40 text-emerald-300">
                                    <CheckCircle2
                                      className="w-3 h-3"
                                      strokeWidth={3}
                                    />
                                    VALID
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.2em] font-display font-bold border bg-rose-400/15 border-rose-400/40 text-rose-300 anim-blink">
                                    <XCircle
                                      className="w-3 h-3"
                                      strokeWidth={3}
                                    />
                                    INVALID
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Per-file Loan Recovery Analysis Tables */}
                  {loanRecoveryAnalyses.length > 0 && (
                    <div className="mt-6 space-y-5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-violet-300" />
                        <div className="font-display tracking-[0.18em] text-sm text-white font-black">
                          INTEREST RECONCILIATION · PER-FILE ANALYSIS
                        </div>
                      </div>

                      {loanRecoveryAnalyses.map((analysis, fileIdx) => (
                        <div
                          key={`${analysis.fileName}-${fileIdx}`}
                          className="rounded-2xl border border-violet-400/25 bg-slate-900/50 backdrop-blur-md p-4"
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                            <div>
                              <div className="text-[9px] uppercase tracking-[0.3em] text-violet-300/70 font-mono-techy">
                                File {fileIdx + 1}
                              </div>
                              <div className="font-display text-sm font-bold text-white break-all">
                                {analysis.fileName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-white/15">
                                <div className="text-[9px] uppercase tracking-[0.2em] text-cyan-200/60 font-mono-techy">Records</div>
                                <div className="font-display text-sm font-black text-cyan-300 leading-none text-right">{analysis.records.length}</div>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-white/15">
                                <div className="text-[9px] uppercase tracking-[0.2em] text-violet-200/60 font-mono-techy">ROI</div>
                                <div className="font-display text-sm font-black text-violet-300 leading-none text-right">{analysis.detectedROI}%</div>
                              </div>
                            </div>
                          </div>

                          {analysis.records.length === 0 ? (
                            <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90 italic">
                              {analysis.extractedNote}
                            </div>
                          ) : (
                            <>
                              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-white/15 bg-slate-900/80">
                                      <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Sl</th>
                                      <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">GL No</th>
                                      <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Loan No</th>
                                      <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Member Name</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Sanctioned (₹)</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Principal Coll. (₹)</th>
                                      <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Days†</th>
                                      <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">ROI %</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Interest (₹)</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Penal (₹)</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">IOD (₹)</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Expected (A)</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Actual (B)*</th>
                                      <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Diff (B−A)</th>
                                      <th className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/80 font-mono-techy">Audit Remark</th>
                                    </tr>
                                  </thead>
                                  <tbody className="font-mono-techy text-[10.5px]">
                                    {analysis.records.map((r) => (
                                      <tr
                                        key={r.slNo}
                                        className={`border-b border-white/5 ${
                                          r.isOverdue
                                            ? 'bg-rose-500/5'
                                            : ''
                                        }`}
                                      >
                                        <td className="px-2 py-1.5 text-violet-200/60">{r.slNo}</td>
                                        <td className="px-2 py-1.5 text-cyan-200">{r.glNo}</td>
                                        <td className="px-2 py-1.5 text-white break-all">{r.loanNo}</td>
                                        <td className="px-2 py-1.5 text-white/85 break-words max-w-[140px]">{r.member}</td>
                                        <td className="px-2 py-1.5 text-right text-cyan-200/80">
                                          {r.sanctionedPrincipal > 0
                                            ? r.sanctionedPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                            : '—'}
                                        </td>
                                        <td className={`px-2 py-1.5 text-right ${r.principal > 0 ? 'text-emerald-200' : 'text-white/40'}`}>
                                          {r.principal > 0
                                            ? r.principal.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                            : '0.00'}
                                        </td>
                                        <td className="px-2 py-1.5 text-center text-cyan-200">
                                          {r.isOverdue
                                            ? `${r.normalDays}+${r.overdueDays}`
                                            : r.activeDays}
                                          {r.isOverdue && (
                                            <span className="text-[8px] block text-rose-300">norm+OD</span>
                                          )}
                                        </td>
                                        <td className={`px-2 py-1.5 text-center ${r.isOverdue ? 'text-rose-300 font-bold' : 'text-violet-200'}`}>
                                          {r.roi.toFixed(2)}
                                          {r.isOverdue && <span className="text-[8px] block">/{(r.roi + 2).toFixed(2)} OD</span>}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-yellow-200">
                                          {r.interest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-rose-200">
                                          {r.penalInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-orange-200">
                                          {r.iod.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-emerald-300">
                                          {r.expectedInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-yellow-300 font-bold">
                                          {r.actualInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-2 py-1.5 text-right ${r.difference > 1 ? 'text-rose-300' : r.difference < -1 ? 'text-amber-300' : 'text-cyan-200/60'}`}>
                                          {r.difference.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2 py-1.5 text-[10px] text-cyan-100/80 italic max-w-[200px]">{r.remark}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-1 text-[10px] text-cyan-200/50 italic space-y-0.5">
                                <div>* <b>Actual (B)</b> = Interest + Penal Interest + IOD (summed across all vouchers for the loan)</div>
                                <div>† <b>Days</b> for overdue loans = normal_days (Disbursal → Due) + overdue_days (Due → Collection); ROI shown as base/base+2% (penal applied only to overdue days)</div>
                                <div>‡ <b>Sanctioned (₹)</b> = original loan amount disbursed; used as Expected-interest base when Principal Collected is zero (interest-only recovery)</div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                                <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-white/15">
                                  <div className="text-[9px] uppercase tracking-[0.25em] text-cyan-200/60 font-mono-techy">Total Principal</div>
                                  <div className="font-display font-black text-cyan-300">₹{analysis.totalPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
                                  <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-300/80 font-mono-techy">Expected Interest</div>
                                  <div className="font-display font-black text-emerald-300">₹{analysis.totalExpected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-400/30">
                                  <div className="text-[9px] uppercase tracking-[0.25em] text-yellow-300/80 font-mono-techy">Actual Recovered</div>
                                  <div className="font-display font-black text-yellow-300">₹{analysis.totalActual.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                </div>
                                <div className={`px-3 py-2 rounded-lg border ${analysis.netDiscrepancy > 0 ? 'bg-rose-500/10 border-rose-400/30' : analysis.netDiscrepancy < 0 ? 'bg-amber-500/10 border-amber-400/30' : 'bg-slate-900/60 border-white/15'}`}>
                                  <div className="text-[9px] uppercase tracking-[0.25em] font-mono-techy opacity-80">Net Discrepancy</div>
                                  <div className={`font-display font-black ${analysis.netDiscrepancy > 0 ? 'text-rose-300' : analysis.netDiscrepancy < 0 ? 'text-amber-300' : 'text-cyan-300'}`}>₹{analysis.netDiscrepancy.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                </div>
                              </div>

                              <div className="mt-2 text-[10px] text-cyan-200/50 italic">
                                {analysis.extractedNote}
                              </div>

                              {/* Download Excel / PDF for this loan recovery file */}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <div className="text-[9px] uppercase tracking-[0.3em] text-violet-200/70 font-mono-techy font-bold mr-1">
                                  Download :
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadLoanRecoveryCSV(analysis)
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 transition-all duration-300"
                                >
                                  <span className="text-sm">📊</span>
                                  <span className="font-display tracking-[0.12em] uppercase text-[9px] font-black text-emerald-200">
                                    Excel (CSV)
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadLoanRecoveryPDF(analysis)
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-400/40 bg-gradient-to-r from-rose-500/15 to-pink-500/15 hover:from-rose-500/25 hover:to-pink-500/25 transition-all duration-300"
                                >
                                  <span className="text-sm">📄</span>
                                  <span className="font-display tracking-[0.12em] uppercase text-[9px] font-black text-rose-200">
                                    PDF
                                  </span>
                                </button>
                              </div>

                              {/* Per-file opt-in for Defect Sheet */}
                              <div className="mt-4 rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-violet-500/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      loanRecoveryIncludeMap[
                                        analysis.fileName
                                      ]
                                        ? 'bg-violet-500/20 border border-violet-400/50'
                                        : 'bg-slate-900/60 border border-white/15'
                                    }`}
                                  >
                                    {loanRecoveryIncludeMap[
                                      analysis.fileName
                                    ] ? (
                                      <CheckCircle2
                                        className="w-4 h-4 text-violet-300"
                                        strokeWidth={2.5}
                                      />
                                    ) : (
                                      <ScrollText
                                        className="w-4 h-4 text-violet-300"
                                        strokeWidth={2}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-display text-xs font-black text-white tracking-[0.06em]">
                                      {loanRecoveryIncludeMap[
                                        analysis.fileName
                                      ]
                                        ? `"${analysis.fileName}" added to Defect Sheet`
                                        : `Add "${analysis.fileName}" to Auditor Defect Sheet?`}
                                    </div>
                                    <div className="text-[9px] text-violet-200/60 font-mono-techy uppercase tracking-[0.15em] mt-0.5">
                                      {loanRecoveryIncludeMap[
                                        analysis.fileName
                                      ]
                                        ? 'File name will appear as the defect heading'
                                        : 'File name will be used as the defect heading if added'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLoanRecoveryIncludeMap(
                                      (m) => ({
                                        ...m,
                                        [analysis.fileName]:
                                          !m[analysis.fileName],
                                      })
                                    )
                                  }
                                  className={`shrink-0 px-4 py-2 rounded-lg font-display tracking-[0.12em] uppercase text-[10px] font-black border transition-all duration-300 ${
                                    loanRecoveryIncludeMap[
                                      analysis.fileName
                                    ]
                                      ? 'border-rose-400/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                      : 'border-violet-400/50 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-violet-500/20 text-violet-200 hover:from-violet-500/30 hover:via-fuchsia-500/30 hover:to-violet-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                  }`}
                                >
                                  {loanRecoveryIncludeMap[
                                    analysis.fileName
                                  ]
                                    ? '✕ Remove'
                                    : '+ Add to Defects'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === AI LEGAL CHAT VIEW === */}
          {activeView === 'aichat' && !loading && (
            <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_60px_rgba(217,70,239,0.15)] anim-slide-up">
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent" />

              <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-pink-500/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-fuchsia-400 blur-xl opacity-60 animate-pulse" />
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-400 via-pink-400 to-violet-400 flex items-center justify-center shadow-[0_0_25px_rgba(217,70,239,0.5)]">
                      <Bot
                        className="w-6 h-6 text-slate-950"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.4em] text-fuchsia-300/80 font-mono-techy font-bold">
                      APCS Act · Rules · NABARD · Audit Manual
                    </div>
                    <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text-fire">
                      AI LEGAL CHAT
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setChatMessages([
                      {
                        role: 'ai',
                        content:
                          "Chat cleared. Ask me about any section, rule, or paragraph of the APCS Act/Rules/Audit Manual.",
                      },
                    ])
                  }
                  className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-[0.2em] font-mono-techy font-bold text-cyan-200/80 transition-colors"
                >
                  Clear
                </button>
              </div>

              <div
                className="relative p-5 space-y-4 max-h-[55vh] overflow-y-auto"
                style={{ scrollbarGutter: 'stable' }}
              >
                {chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 anim-slide-up ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        m.role === 'user'
                          ? 'bg-cyan-500/20 border border-cyan-400/40'
                          : 'bg-fuchsia-500/20 border border-fuchsia-400/40'
                      }`}
                    >
                      {m.role === 'user' ? (
                        <UserIcon
                          className="w-4 h-4 text-cyan-300"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Bot
                          className="w-4 h-4 text-fuchsia-300"
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed border ${
                        m.role === 'user'
                          ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-50/95'
                          : 'bg-slate-900/60 border-white/15 text-white/90'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatTyping && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-fuchsia-500/20 border border-fuchsia-400/40">
                      <Bot
                        className="w-4 h-4 text-fuchsia-300"
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-slate-900/60 border border-white/15 text-white/60 italic text-[12px]">
                      Looking up the law…
                    </div>
                  </div>
                )}
              </div>

              <div className="relative border-t border-white/10 p-4 bg-slate-900/40">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = chatInput.trim();
                    if (!q) return;
                    setChatMessages((prev) => [
                      ...prev,
                      { role: 'user', content: q },
                    ]);
                    setChatInput('');
                    setChatTyping(true);
                    setTimeout(() => {
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          role: 'ai',
                          content: answerLegalQuery(q),
                        },
                      ]);
                      setChatTyping(false);
                    }, 380);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about Section 50, Rule 41(C)(6), Para 7.5, Annexure-8…"
                    className="flex-1 bg-slate-950/70 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-cyan-200/40 focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20"
                  />
                  <button
                    type="submit"
                    disabled={chatTyping || !chatInput.trim()}
                    className="group relative shrink-0 disabled:opacity-40"
                  >
                    <span className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-violet-400 rounded-xl blur opacity-50 group-hover:opacity-80 transition-opacity" />
                    <span className="relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white font-display tracking-[0.18em] uppercase text-[11px] font-black">
                      <Send className="w-4 h-4" strokeWidth={2.8} />
                      Send
                    </span>
                  </button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  {[
                    'Section 50',
                    'Section 55-A',
                    'Section 71',
                    'Section 115-D',
                    'Rule 41(C)(6)',
                    'Para 7.1',
                    'Para 7.5',
                    'IRAC norms',
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setChatInput(q)}
                      className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-fuchsia-500/15 hover:border-fuchsia-400/40 text-cyan-200/70 hover:text-fuchsia-200 transition-colors uppercase tracking-[0.18em] font-mono-techy font-bold"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === DEFECT SHEET GENERATOR VIEW === */}
          {activeView === 'generator' && !loading && (
            <div className="space-y-6 anim-slide-up">
              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_60px_rgba(132,204,22,0.15)]">
                <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent" />
                <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-lime-500/10 via-emerald-500/10 to-cyan-500/10 flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-lime-400 blur-xl opacity-60 animate-pulse" />
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-lime-400 via-emerald-400 to-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(132,204,22,0.5)]">
                      <FilePlus2
                        className="w-6 h-6 text-slate-950"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.4em] text-lime-300/80 font-mono-techy font-bold">
                      Compose Custom Defects
                    </div>
                    <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text">
                      DEFECT SHEET GENERATOR
                    </h3>
                  </div>
                </div>

                <div className="relative p-6 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-3">
                    <label>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
                        Category
                      </div>
                      <select
                        value={customDefectDraft.category}
                        onChange={(e) =>
                          setCustomDefectDraft((d) => ({
                            ...d,
                            category: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-950/70 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400/60"
                      >
                        <option value="financial">B.1 Financial</option>
                        <option value="accounting">B.2 Accounting</option>
                        <option value="administrative">B.3 Administrative</option>
                      </select>
                    </label>
                    <label>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
                        Defect Title
                      </div>
                      <input
                        type="text"
                        value={customDefectDraft.title}
                        onChange={(e) =>
                          setCustomDefectDraft((d) => ({
                            ...d,
                            title: e.target.value,
                          }))
                        }
                        placeholder="e.g. Loan Disbursement Without Proper Documentation"
                        className="w-full bg-slate-950/70 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-cyan-200/40 focus:outline-none focus:border-lime-400/60"
                      />
                    </label>
                  </div>

                  <label>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
                      Narrative
                    </div>
                    <textarea
                      value={customDefectDraft.narrative}
                      onChange={(e) =>
                        setCustomDefectDraft((d) => ({
                          ...d,
                          narrative: e.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Describe the defect, cite the relevant Section/Rule, set out the impact, and prescribe the corrective action…"
                      className="w-full bg-slate-950/70 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-cyan-200/40 focus:outline-none focus:border-lime-400/60 leading-relaxed"
                    />
                  </label>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[10px] text-cyan-200/60 italic">
                      Custom defects added here are appended to the
                      categorised Audit Defects sheet automatically.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !customDefectDraft.title.trim() ||
                          !customDefectDraft.narrative.trim()
                        )
                          return;
                        setCustomDefects((prev) => [
                          ...prev,
                          {
                            ...customDefectDraft,
                            title: customDefectDraft.title.trim(),
                            narrative:
                              customDefectDraft.narrative.trim(),
                            id: Date.now(),
                          },
                        ]);
                        setCustomDefectDraft({
                          category: 'financial',
                          title: '',
                          narrative: '',
                        });
                      }}
                      disabled={
                        !customDefectDraft.title.trim() ||
                        !customDefectDraft.narrative.trim()
                      }
                      className="group relative disabled:opacity-40"
                    >
                      <span className="absolute -inset-0.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 rounded-xl blur opacity-50 group-hover:opacity-80 transition-opacity" />
                      <span className="relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-lime-500 via-emerald-500 to-cyan-500 text-slate-950 font-display tracking-[0.18em] uppercase text-[11px] font-black">
                        <FilePlus2
                          className="w-4 h-4"
                          strokeWidth={2.8}
                        />
                        Add Defect
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing custom defects list */}
              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/55 backdrop-blur-2xl">
                <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
                <div className="relative px-6 py-5 border-b border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-lime-300" />
                    <div className="font-display tracking-[0.18em] text-sm text-white font-black">
                      CUSTOM DEFECTS
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-lime-500/10 border border-lime-400/30">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-lime-300/80 font-mono-techy">
                      Total
                    </div>
                    <div className="font-display text-lg font-black text-lime-300 leading-none text-right">
                      {customDefects.length}
                    </div>
                  </div>
                </div>

                <div className="relative p-5">
                  {customDefects.length === 0 ? (
                    <div className="text-center text-cyan-200/50 italic text-sm py-6">
                      No custom defects added yet. Use the form above to
                      compose an observation.
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {customDefects.map((d, idx) => (
                        <li
                          key={d.id}
                          className="relative rounded-2xl border border-white/10 bg-slate-900/50 p-4 anim-row"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-display font-bold border bg-lime-400/15 border-lime-400/40 text-lime-300 uppercase">
                                {d.category === 'financial'
                                  ? 'B.1 Financial'
                                  : d.category === 'accounting'
                                  ? 'B.2 Accounting'
                                  : 'B.3 Administrative'}
                              </span>
                              <span className="font-display font-black text-white text-sm tracking-[0.05em]">
                                {d.title}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomDefects((prev) =>
                                  prev.filter((x) => x.id !== d.id)
                                )
                              }
                              className="shrink-0 w-7 h-7 rounded-lg border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-center transition-colors"
                              title="Remove"
                            >
                              <Trash2
                                className="w-3.5 h-3.5"
                                strokeWidth={2.5}
                              />
                            </button>
                          </div>
                          <p
                            className="text-[12px] text-white/85 leading-relaxed text-justify"
                            style={{
                              fontFamily:
                                "'Space Grotesk', system-ui, sans-serif",
                            }}
                          >
                            {d.narrative}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === AUDIT DEFECTS VIEW — Auditor's Observation / Defect Sheet === */}
          {activeView === 'defects' && !loading && defectSheet && (
            <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_80px_rgba(168,85,247,0.18)] anim-slide-up mb-6">
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 via-violet-400/60 to-transparent" />

              {/* ── DOCUMENT HEADER ── */}
              <div className="relative px-8 py-6 border-b border-white/15 bg-gradient-to-r from-emerald-500/12 via-violet-500/8 to-rose-500/12">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-violet-400 blur-2xl opacity-60 animate-pulse" />
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-violet-400 to-rose-400 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.55)]">
                        <ScrollText
                          className="w-7 h-7 text-slate-950"
                          strokeWidth={2.5}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.45em] text-violet-300/80 font-mono-techy font-bold mb-1">
                        Auditor's Observation Document · System Generated
                      </div>
                      <h2 className="font-display text-2xl lg:text-3xl font-black tracking-[0.12em] gradient-text-fire">
                        AUDIT DEFECTS — OBSERVATION SHEET
                      </h2>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cyan-300/70 font-mono-techy">
                        An Initiative of Ministry of Cooperation, Govt. of India &amp; NABARD
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/15">
                      <div className="text-[9px] uppercase tracking-[0.25em] text-cyan-200/60 font-mono-techy">
                        Society
                      </div>
                      <div className="font-display text-sm font-bold text-white break-words leading-tight">
                        {defectSheet.societyName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                        <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-300/80 font-mono-techy">
                          Merits
                        </div>
                        <div className="font-display text-xl font-black text-emerald-300 leading-none">
                          {defectSheet.merits.length}
                        </div>
                      </div>
                      <div className="flex-1 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30">
                        <div className="text-[9px] uppercase tracking-[0.25em] text-rose-300/80 font-mono-techy">
                          Demerits
                        </div>
                        <div className="font-display text-xl font-black text-rose-300 leading-none">
                          {defectSheet.demerits.length}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/60 font-mono-techy text-right">
                      Audit Date · {defectSheet.auditDate}
                    </div>
                    <button
                      onClick={printDefectSheet}
                      type="button"
                      className="group relative mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-violet-500/15 hover:from-emerald-500/25 hover:via-cyan-500/25 hover:to-violet-500/25 transition-all duration-300 shadow-[0_0_25px_rgba(52,211,153,0.2)]"
                    >
                      <span className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />
                      <Upload
                        className="relative w-4 h-4 text-emerald-300 rotate-180"
                        strokeWidth={2.5}
                      />
                      <span className="relative font-display tracking-[0.18em] uppercase text-[11px] font-black text-white">
                        Print / Download
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── PART A — MERITS ── */}
              <div className="relative px-8 py-6 border-b border-white/10 bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1.5 h-7 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-300/80 font-mono-techy font-bold">
                      Part A
                    </div>
                    <h3 className="font-display text-xl font-black tracking-[0.15em] gradient-text">
                      MERITS — COMPLIANCES &amp; STRENGTHS
                    </h3>
                  </div>
                </div>
                {defectSheet.merits.length === 0 ? (
                  <div className="text-cyan-200/60 text-sm italic px-2 py-3 border-l-2 border-emerald-400/30">
                    No specific merits were identified from the data
                    placed before the audit during this verification.
                  </div>
                ) : (
                  <ol className="space-y-4 list-none">
                    {defectSheet.merits.map((m, idx) => (
                      <li
                        key={idx}
                        className="anim-row relative pl-12"
                        style={{ animationDelay: `${idx * 0.08}s` }}
                      >
                        <div className="absolute left-0 top-0 w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.25)]">
                          <span className="font-display text-emerald-300 font-black text-sm">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="font-display font-black tracking-[0.05em] text-emerald-200 text-base mb-1.5">
                          {m.title}
                        </div>
                        <p
                          className="text-[13px] text-emerald-50/90 leading-relaxed text-justify"
                          style={{
                            fontFamily:
                              "'Space Grotesk', system-ui, sans-serif",
                          }}
                        >
                          {m.narrative}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* ── PART B — DEMERITS (categorised) ── */}
              <div className="relative px-8 py-6 bg-gradient-to-b from-rose-500/[0.04] to-transparent">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-7 bg-gradient-to-b from-rose-400 to-fuchsia-400 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.4em] text-rose-300/80 font-mono-techy font-bold">
                      Part B
                    </div>
                    <h3 className="font-display text-xl font-black tracking-[0.15em] gradient-text-fire">
                      DEMERITS — DEFECTS &amp; IRREGULARITIES
                    </h3>
                  </div>
                </div>

                <div className="text-[11px] text-cyan-100/70 italic mb-6 border-l-2 border-rose-400/30 pl-3 leading-relaxed">
                  During the course of audit, the auditors have
                  identified irregularities and defects which, in the
                  professional opinion of the Lead Statutory Auditor,
                  require reporting to the Managing Committee and/or
                  the General Body for necessary resolution. The
                  defects below are categorised into Financial,
                  Accounting and Administrative Irregularities in
                  accordance with the Audit Manual of PACS.
                </div>

                {defectSheet.demerits.length === 0 ? (
                  <div className="text-emerald-200/80 text-sm italic px-2 py-3 border-l-2 border-emerald-400/40">
                    No material defects were noticed during the audit
                    verification. The Society is in substantial
                    compliance with the APCS Act &amp; Rules, 1964.
                  </div>
                ) : (
                  (() => {
                    const groups = [
                      {
                        key: 'financial',
                        label: 'B.1 · FINANCIAL IRREGULARITIES',
                        sub: 'Budget overruns · Provisions violations · Loan / collection irregularities · Income mis-recognition',
                        color: 'amber',
                      },
                      {
                        key: 'accounting',
                        label: 'B.2 · ACCOUNTING IRREGULARITIES',
                        sub: 'Books & registers · Postings · Classification · Provisioning · NABARD norms',
                        color: 'rose',
                      },
                      {
                        key: 'administrative',
                        label:
                          'B.3 · ADMINISTRATIVE IRREGULARITIES',
                        sub: 'Delegation · GB / MC meetings · Internal controls · Housekeeping · Compliance with prior defects',
                        color: 'fuchsia',
                      },
                    ];

                    let runningNo = 0;
                    return groups.map((g) => {
                      const items = defectSheet.demerits.filter(
                        (d) => d.category === g.key
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={g.key} className="mb-7">
                          <div
                            className={`flex items-baseline gap-3 mb-3 pb-2 border-b border-${g.color}-400/25`}
                          >
                            <span
                              className={`font-display text-${g.color}-300 font-black tracking-[0.12em] text-sm`}
                            >
                              {g.label}
                            </span>
                            <span
                              className={`text-[9px] uppercase tracking-[0.25em] text-${g.color}-200/50 font-mono-techy hidden md:inline`}
                            >
                              · {g.sub}
                            </span>
                            <span
                              className={`ml-auto text-[9px] uppercase tracking-[0.25em] text-${g.color}-200/60 font-mono-techy`}
                            >
                              {items.length} item{items.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <ol className="space-y-5 list-none">
                            {items.map((d) => {
                              runningNo += 1;
                              const num = runningNo;
                              return (
                                <li
                                  key={`${g.key}-${num}`}
                                  className="anim-row relative pl-12"
                                  style={{
                                    animationDelay: `${num * 0.06}s`,
                                  }}
                                >
                                  <div className="absolute left-0 top-0 w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.25)]">
                                    <span className="font-display text-rose-300 font-black text-sm">
                                      {String(num).padStart(2, '0')}
                                    </span>
                                  </div>
                                  <div className="font-display font-black tracking-[0.05em] text-rose-200 text-base mb-1.5">
                                    {d.title}
                                  </div>
                                  <p
                                    className="text-[13px] text-rose-50/90 leading-relaxed text-justify"
                                    style={{
                                      fontFamily:
                                        "'Space Grotesk', system-ui, sans-serif",
                                    }}
                                  >
                                    {d.narrative}
                                  </p>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* ── FOOTER ── */}
              <div className="relative px-8 py-4 border-t border-white/10 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] uppercase tracking-[0.3em] font-mono-techy">
                <div className="text-cyan-200/50">
                  System Generated Report · Does Not Require Signature
                </div>
                <div className="text-cyan-200/40">
                  Generated by · COOP·AUDIT·AI · Lead Statutory Auditor (Sim.)
                </div>
              </div>
            </div>
          )}

          {/* === AUDIT DEFECTS VIEW — Mismatch list === */}
          {activeView === 'defects' && !loading && (
            <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-2xl rounded-[28px] border border-white/10 shadow-[0_0_60px_rgba(244,63,94,0.12)] anim-slide-up">
              <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-400/80 to-transparent" />

              <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-rose-500/10 via-fuchsia-500/10 to-amber-500/10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ScrollText className="w-3 h-3 text-rose-300" />
                    <div className="text-[10px] uppercase tracking-[0.4em] text-rose-300/80 font-mono-techy font-bold">
                      Mismatches Only
                    </div>
                  </div>
                  <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text-fire">
                    AUDIT DEFECTS
                  </h3>
                </div>
                <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-rose-300/80 font-mono-techy">
                    Defects
                  </div>
                  <div className="font-display text-lg font-black text-rose-300 leading-none text-right">
                    {auditResults.length - talliedCount}
                  </div>
                </div>
              </div>

              <div className="relative p-5 space-y-4">
                {auditResults.filter((r) => !r.tallied).length === 0 ? (
                  <div className="text-center p-10">
                    <div className="text-5xl mb-3 anim-float">✅</div>
                    <div className="font-display tracking-[0.15em] text-emerald-300 text-sm">
                      NO DEFECTS DETECTED
                    </div>
                    <div className="text-xs text-cyan-200/50 mt-1 font-mono-techy">
                      All audit verifications tallied successfully.
                    </div>
                  </div>
                ) : (
                  auditResults
                    .filter((r) => !r.tallied)
                    .map((result, index) => (
                      <div
                        key={index}
                        className="relative overflow-hidden rounded-[24px] border border-rose-400/30 bg-slate-900/50 backdrop-blur-xl p-5 anim-row shadow-[0_0_40px_rgba(244,63,94,0.18)]"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-pink-400 to-fuchsia-400 shadow-[0_0_20px_currentColor]" />
                        <div className="relative">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-black tracking-[0.15em] text-white text-sm uppercase">
                                {result.statementType}
                              </div>
                              <div className="text-[10px] text-cyan-200/60 break-all mt-1 font-mono-techy">
                                {result.fileName}
                              </div>
                            </div>
                            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/50 text-rose-300 font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(244,63,94,0.4)] anim-shake">
                              <XCircle className="w-3 h-3" strokeWidth={3} />
                              Defect
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-400/20 p-3">
                              <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-200/70 font-mono-techy font-bold mb-1.5">
                                {result.label1}
                              </div>
                              <div className="font-display font-black text-emerald-300 text-lg break-all leading-tight">
                                ₹{result.amount1.toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-400/20 p-3">
                              <div className="text-[9px] uppercase tracking-[0.25em] text-violet-200/70 font-mono-techy font-bold mb-1.5">
                                {result.label2}
                              </div>
                              <div className="font-display font-black text-yellow-300 text-lg break-all leading-tight">
                                ₹{result.amount2.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                          {result.aiRemark && (
                            <div className="mt-3 text-[11px] italic px-3 py-2 rounded-lg border bg-rose-400/5 border-rose-400/20 text-rose-100/90">
                              <span className="font-mono-techy font-bold">AI ▸</span> {result.aiRemark}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Drag-and-drop empty state — accepts drops AND click-to-browse */}
          {activeView === 'dashboard' && !loading &&
            detectedFiles.length === 0 &&
            auditResults.length === 0 && (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDragging) setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // only clear when leaving the label itself, not entering children
                  if (e.currentTarget.contains(e.relatedTarget)) return;
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processZIP(file);
                }}
                className={`block cursor-pointer relative overflow-hidden rounded-[28px] border-2 border-dashed backdrop-blur-2xl p-12 lg:p-16 text-center anim-slide-up transition-all duration-300 ${
                  isDragging
                    ? 'border-emerald-300 bg-emerald-500/15 scale-[1.01] shadow-[0_0_60px_rgba(52,211,153,0.5)]'
                    : 'border-white/20 bg-slate-900/40 hover:border-emerald-400/40 hover:bg-slate-900/55'
                }`}
              >
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) processZIP(file);
                    event.target.value = '';
                  }}
                />
                <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
                {isDragging && (
                  <>
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-400/30 blur-3xl pointer-events-none animate-pulse" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-cyan-400/30 blur-3xl pointer-events-none animate-pulse" />
                  </>
                )}
                <div className="relative">
                  <div
                    className={`text-7xl mb-4 ${
                      isDragging ? 'animate-bounce' : 'anim-float'
                    }`}
                  >
                    {isDragging ? '⬇️' : '📁'}
                  </div>
                  <h3 className="font-display text-2xl lg:text-3xl font-black tracking-[0.2em] gradient-text mb-2">
                    {isDragging
                      ? 'RELEASE TO UPLOAD'
                      : 'DRAG & DROP ZIP HERE'}
                  </h3>
                  <p className="text-[11px] text-cyan-200/60 tracking-[0.15em] uppercase font-mono-techy max-w-md mx-auto">
                    {isDragging
                      ? 'Drop the file to begin AI verification'
                      : 'Drop a ZIP with the cooperative audit PDFs or click to browse'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] font-mono-techy text-cyan-200/40">
                    <span>Max 75 MB</span>
                    <span className="text-cyan-200/30">·</span>
                    <span>ZIP folder only</span>
                  </div>
                </div>
              </label>
            )}
        </div>
      </main>
    </div>
  );
}

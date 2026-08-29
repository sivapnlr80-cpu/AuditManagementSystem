import { useState, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Info, Lock, FileWarning, Banknote, Users, TrendingDown } from 'lucide-react';
import { useAudit } from '../context/AuditContext.jsx';

// --- Gemini helper -----------------------------------------------------------
async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(raw);
}

// --- Offline fallback scorer -------------------------------------------------
function offlineScore({ irregularities, tallyResults, defects, uploadedFiles }) {
  const b1 = irregularities.B1.length;
  const b2 = irregularities.B2.length;
  const b3 = irregularities.B3.length;
  const totalDefects = defects.length;
  const tallyFails = Object.values(tallyResults).filter(v => v === false).length;
  const missingDocs = uploadedFiles.filter(f => f.status === 'missing').length;

  const financialScore = Math.max(0, 100 - b1 * 12 - tallyFails * 10);
  const accountingScore = Math.max(0, 100 - b2 * 10 - totalDefects * 5);
  const adminScore = Math.max(0, 100 - b3 * 8 - missingDocs * 6);
  const complianceScore = Math.max(0, 100 - (b1 + b2 + b3) * 4 - tallyFails * 8);

  const overall = Math.round((financialScore + accountingScore + adminScore + complianceScore) / 4);

  const risks = [];
  if (b1 > 0) risks.push({ level: 'high', text: `${b1} financial irregularit${b1 > 1 ? 'ies' : 'y'} detected (B.1)` });
  if (tallyFails > 0) risks.push({ level: 'high', text: `${tallyFails} tally balance mismatch${tallyFails > 1 ? 'es' : ''} found` });
  if (b2 > 0) risks.push({ level: 'medium', text: `${b2} accounting irregularit${b2 > 1 ? 'ies' : 'y'} (B.2)` });
  if (b3 > 0) risks.push({ level: 'medium', text: `${b3} administrative irregularit${b3 > 1 ? 'ies' : 'y'} (B.3)` });
  if (missingDocs > 0) risks.push({ level: 'medium', text: `${missingDocs} mandatory document${missingDocs > 1 ? 's' : ''} missing` });
  if (totalDefects > 3) risks.push({ level: 'low', text: `${totalDefects} audit defects logged` });

  const recommendations = [];
  if (b1 > 0) recommendations.push('Investigate and resolve all financial irregularities before finalising the audit report.');
  if (tallyFails > 0) recommendations.push('Reconcile ledger balances to ensure financial statements tally correctly.');
  if (b2 > 0) recommendations.push('Review accounting practices and rectify bookkeeping errors identified under B.2.');
  if (b3 > 0) recommendations.push('Address administrative lapses and ensure statutory compliance under APCS Act 1964.');
  if (missingDocs > 0) recommendations.push('Obtain and verify all mandatory documents before submitting the audit report.');
  if (risks.length === 0) recommendations.push('No critical issues found. Maintain current standards and conduct periodic reviews.');

  return {
    overall,
    categories: {
      financial: { score: financialScore, label: 'Financial Integrity' },
      accounting: { score: accountingScore, label: 'Accounting Accuracy' },
      admin: { score: adminScore, label: 'Administrative Compliance' },
      compliance: { score: complianceScore, label: 'Statutory Compliance' },
    },
    risks,
    recommendations,
    source: 'offline',
  };
}

// --- Sub-components ----------------------------------------------------------
function ScoreDial({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' : '#ef4444';

  const label =
    score >= 80 ? 'SECURE' :
    score >= 60 ? 'MODERATE' :
    score >= 40 ? 'AT RISK' : 'CRITICAL';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#1f2937" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
        <text x="90" y="84" textAnchor="middle" fill={color} fontSize="32" fontWeight="bold" fontFamily="Orbitron, monospace">{score}</text>
        <text x="90" y="104" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="Space Grotesk, sans-serif">/100</text>
        <text x="90" y="122" textAnchor="middle" fill={color} fontSize="11" fontWeight="600" fontFamily="Space Grotesk, sans-serif" letterSpacing="2">{label}</text>
      </svg>
      <p className="text-xs text-gray-500 uppercase tracking-widest">AI Security Score</p>
    </div>
  );
}

function CategoryBar({ label, score, icon: Icon }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-amber-500' :
    score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-gray-300">
          <Icon size={14} className="text-gray-500" />
          {label}
        </span>
        <span className="font-semibold text-white">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const styles = {
    high:   'bg-red-900/50 text-red-300 border border-red-800',
    medium: 'bg-amber-900/50 text-amber-300 border border-amber-800',
    low:    'bg-blue-900/50 text-blue-300 border border-blue-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles[level] ?? styles.low}`}>
      {level}
    </span>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
      >
        <span className="font-semibold text-gray-200 text-sm">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && <div className="p-5 space-y-3 bg-gray-900/40">{children}</div>}
    </div>
  );
}

// --- Main View ---------------------------------------------------------------
export default function AISecurityScoreView() {
  const { irregularities, tallyResults, defects, uploadedFiles, geminiKey, societyName, auditYear } = useAudit();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasData = irregularities.B1.length + irregularities.B2.length + irregularities.B3.length > 0
    || Object.keys(tallyResults).length > 0
    || defects.length > 0
    || uploadedFiles.length > 0;

  const runScore = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);

    if (!geminiKey) {
      setResult(offlineScore({ irregularities, tallyResults, defects, uploadedFiles }));
      setLoading(false);
      return;
    }

    const prompt = `
You are an expert cooperative society auditor in Andhra Pradesh, India.
Analyse the following audit data for ${societyName || 'the cooperative society'} (Year: ${auditYear || 'N/A'})
and return a JSON security/risk score report.

Audit Data:
- Financial Irregularities (B.1): ${irregularities.B1.length} items: ${JSON.stringify(irregularities.B1.map(i => i.description || i.text || '').slice(0, 5))}
- Accounting Irregularities (B.2): ${irregularities.B2.length} items: ${JSON.stringify(irregularities.B2.map(i => i.description || i.text || '').slice(0, 5))}
- Administrative Irregularities (B.3): ${irregularities.B3.length} items: ${JSON.stringify(irregularities.B3.map(i => i.description || i.text || '').slice(0, 5))}
- Tally Results: ${JSON.stringify(tallyResults)}
- Audit Defects: ${defects.length} items
- Uploaded Files: ${uploadedFiles.length} (missing: ${uploadedFiles.filter(f => f.status === 'missing').length})

Return ONLY a JSON object with this exact shape:
{
  "overall": <integer 0-100>,
  "categories": {
    "financial":   { "score": <0-100>, "label": "Financial Integrity" },
    "accounting":  { "score": <0-100>, "label": "Accounting Accuracy" },
    "admin":       { "score": <0-100>, "label": "Administrative Compliance" },
    "compliance":  { "score": <0-100>, "label": "Statutory Compliance" }
  },
  "risks": [
    { "level": "high"|"medium"|"low", "text": "<concise risk description>" }
  ],
  "recommendations": ["<actionable recommendation>"],
  "summary": "<2-3 sentence executive summary>",
  "source": "gemini"
}
Scores are LOWER when more issues exist. Be precise and strict.`;

    try {
      const data = await callGemini(geminiKey, prompt);
      setResult(data);
    } catch (e) {
      setError(`Gemini unavailable: ${e.message}. Using offline scoring.`);
      setResult(offlineScore({ irregularities, tallyResults, defects, uploadedFiles }));
    } finally {
      setLoading(false);
    }
  }, [geminiKey, irregularities, tallyResults, defects, uploadedFiles, societyName, auditYear]);

  const categoryIcons = {
    financial:  Banknote,
    accounting: TrendingDown,
    admin:      Users,
    compliance: Lock,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-indigo-400" size={22} />
            AI Security Score
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            AI-powered risk assessment of the cooperative society's audit health
          </p>
        </div>
        <button
          onClick={runScore}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analysing…' : result ? 'Re-analyse' : 'Run Analysis'}
        </button>
      </div>

      {/* No data notice */}
      {!hasData && !result && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-800 bg-blue-900/20 text-blue-300 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            No audit data loaded yet. Upload a society ZIP or add irregularities first for a meaningful score.
            You can still run a baseline analysis — it will score 100 with no issues found.
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-800 bg-amber-900/20 text-amber-300 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* API key notice */}
      {!geminiKey && !result && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-700 bg-gray-800/40 text-gray-400 text-sm">
          <Lock size={16} className="shrink-0 mt-0.5" />
          No Gemini API key set — analysis will use the built-in offline scoring engine.
          Set a key in <strong className="text-gray-300">AI Legal Chat → AI Key</strong> for enhanced AI scoring.
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Score dial + categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-gray-700 bg-gray-900/60">
              <ScoreDial score={result.overall} />
              {result.source === 'offline' && (
                <p className="text-xs text-gray-600 mt-2">Offline engine · No AI key</p>
              )}
              {result.source === 'gemini' && (
                <p className="text-xs text-indigo-500 mt-2">Powered by Gemini AI</p>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-gray-700 bg-gray-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Category Breakdown</h3>
              {Object.entries(result.categories ?? {}).map(([key, cat]) => (
                <CategoryBar
                  key={key}
                  label={cat.label}
                  score={cat.score}
                  icon={categoryIcons[key] ?? FileWarning}
                />
              ))}
            </div>
          </div>

          {/* AI summary */}
          {result.summary && (
            <div className="p-5 rounded-xl border border-indigo-800 bg-indigo-900/20">
              <p className="text-sm text-indigo-200 leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Risks */}
          {result.risks?.length > 0 && (
            <CollapsibleSection title={`Risk Factors (${result.risks.length})`}>
              {result.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <RiskBadge level={r.level} />
                  <p className="text-sm text-gray-300">{r.text}</p>
                </div>
              ))}
            </CollapsibleSection>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <CollapsibleSection title="Recommendations">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-900 text-indigo-300 text-xs font-bold">{i + 1}</span>
                  {rec}
                </div>
              ))}
            </CollapsibleSection>
          )}

          {/* Score legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />80–100: Secure</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />60–79: Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />40–59: At Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />0–39: Critical</span>
          </div>
        </div>
      )}
    </div>
  );
}

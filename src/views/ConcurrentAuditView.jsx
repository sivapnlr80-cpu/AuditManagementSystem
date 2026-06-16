import { useAudit } from '../context/AuditContext';
import {
  ClipboardCheck,
  Upload,
  ScrollText,
  Sparkles,
  CheckCircle2,
  Trash2,
  Bot,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const GROUPS = [
  { key: 'financial', label: 'B.1 · FINANCIAL IRREGULARITIES', color: 'amber' },
  { key: 'accounting', label: 'B.2 · ACCOUNTING IRREGULARITIES', color: 'rose' },
  {
    key: 'administrative',
    label: 'B.3 · ADMINISTRATIVE IRREGULARITIES',
    color: 'fuchsia',
  },
];

const catLabel = (c) =>
  c === 'financial'
    ? 'B.1 Financial'
    : c === 'accounting'
    ? 'B.2 Accounting'
    : 'B.3 Administrative';

export default function ConcurrentAuditView() {
  const {
    handleConcurrentUpload,
    concurrentProcessing,
    concurrentError,
    concurrentFileName,
    concurrentMeta,
    concurrentSheet,
    printConcurrentSheet,
    concurrentCustom,
    setConcurrentCustom,
    concurrentDraft,
    setConcurrentDraft,
    concurrentPreview,
    setConcurrentPreview,
    generateDefectNarrative,
  } = useAudit();

  return (
    <div className="space-y-6 anim-slide-up">
      {/* ── HEADER / UPLOAD ── */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_60px_rgba(34,211,238,0.15)]">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-rose-500/10 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-60 animate-pulse" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-400 to-rose-400 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.5)]">
              <ClipboardCheck className="w-6 h-6 text-slate-950" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/80 font-mono-techy font-bold">
              Upload · Analyse · Generate
            </div>
            <h3 className="font-display text-lg lg:text-xl font-black tracking-[0.15em] gradient-text">
              CONCURRENT AUDIT / PERIODICAL INSPECTION — DEFECT SHEET GENERATOR
            </h3>
          </div>
        </div>

        <div className="relative p-6 space-y-4">
          <p className="text-[12px] text-cyan-100/70 leading-relaxed">
            Upload a statement (e.g. a Trial Balance, Balance Sheet or any
            financial report PDF). The AI scans it, identifies likely defects
            with statutory citations, and lets you add your own observations
            below — then print the consolidated inspection defect sheet.
          </p>

          <label className="group relative flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-2xl border-2 border-dashed border-cyan-400/40 bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08] cursor-pointer transition-colors">
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) handleConcurrentUpload(f);
                e.target.value = '';
              }}
            />
            {concurrentProcessing ? (
              <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-cyan-300" strokeWidth={2} />
            )}
            <div className="font-display tracking-[0.15em] uppercase text-[12px] font-black text-white">
              {concurrentProcessing
                ? 'Analysing PDF…'
                : 'Click to upload a statement PDF'}
            </div>
            {concurrentFileName && !concurrentProcessing && (
              <div className="text-[11px] text-cyan-200/70 font-mono-techy break-all">
                {concurrentFileName}
              </div>
            )}
          </label>

          {concurrentError && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-rose-400/40 bg-rose-500/10 text-rose-200 text-[12px]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{concurrentError}</span>
            </div>
          )}

          {concurrentMeta && (
            <div className="flex flex-wrap gap-2 text-[10px] font-mono-techy">
              {concurrentMeta.period && (
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-cyan-200/80">
                  Period · {concurrentMeta.period}
                </span>
              )}
              {concurrentMeta.branch && (
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-cyan-200/80">
                  Branch · {concurrentMeta.branch}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── GENERATED DEFECT SHEET ── */}
      {concurrentSheet && (
        <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_60px_rgba(244,63,94,0.14)]">
          <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
          <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-rose-500/10 via-fuchsia-500/10 to-amber-500/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-rose-300" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-rose-300/80 font-mono-techy font-bold">
                  Inspection Observation Sheet · System Generated
                </div>
                <h3 className="font-display text-lg font-black tracking-[0.12em] gradient-text-fire">
                  DEFECTS &amp; IRREGULARITIES
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-center">
                <div className="text-[9px] uppercase tracking-[0.2em] text-rose-300/80 font-mono-techy">
                  Defects
                </div>
                <div className="font-display text-lg font-black text-rose-300 leading-none">
                  {concurrentSheet.demerits.length}
                </div>
              </div>
              <button
                onClick={printConcurrentSheet}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-violet-500/15 hover:from-emerald-500/25 hover:to-violet-500/25 transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-300 rotate-180" strokeWidth={2.5} />
                <span className="font-display tracking-[0.18em] uppercase text-[11px] font-black text-white">
                  Print / Download
                </span>
              </button>
            </div>
          </div>

          <div className="relative px-6 py-6">
            {GROUPS.map((g) => {
              const items = concurrentSheet.demerits.filter(
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
                      className={`ml-auto text-[9px] uppercase tracking-[0.25em] text-${g.color}-200/60 font-mono-techy`}
                    >
                      {items.length} item{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ol className="space-y-5 list-none">
                    {items.map((d, idx) => (
                      <li key={idx} className="relative pl-12 anim-row">
                        <div className="absolute left-0 top-0 w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center">
                          <span className="font-display text-rose-300 font-black text-sm">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-display font-black tracking-[0.05em] text-rose-200 text-base">
                            {d.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[8px] tracking-[0.2em] font-display font-bold border uppercase ${
                              d.source === 'custom'
                                ? 'bg-lime-400/15 border-lime-400/40 text-lime-300'
                                : 'bg-cyan-400/15 border-cyan-400/40 text-cyan-300'
                            }`}
                          >
                            {d.source === 'custom' ? 'Added' : 'AI-Detected'}
                          </span>
                        </div>
                        <p
                          className="text-[13px] text-rose-50/90 leading-relaxed text-justify"
                          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                        >
                          {d.narrative}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADD CUSTOM DEFECT (generator) ── */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_60px_rgba(132,204,22,0.12)]">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-lime-500/10 via-emerald-500/10 to-cyan-500/10 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-lime-300" />
          <div className="font-display tracking-[0.15em] text-sm text-white font-black">
            ADD INSPECTION DEFECT
          </div>
        </div>

        <div className="relative p-6 space-y-4">
          <div className="max-w-[260px]">
            <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
              Category
            </div>
            <select
              value={concurrentDraft.category}
              onChange={(e) =>
                setConcurrentDraft((d) => ({ ...d, category: e.target.value }))
              }
              className="w-full bg-slate-950/70 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400/60"
            >
              <option value="financial">B.1 Financial</option>
              <option value="accounting">B.2 Accounting</option>
              <option value="administrative">B.3 Administrative</option>
            </select>
          </div>

          <label>
            <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
              Narrative
              <span className="ml-2 normal-case tracking-normal text-cyan-200/50 font-sans">
                — the AI titles &amp; humanises this; prefix /hit or /run to set the mode
              </span>
            </div>
            <textarea
              value={concurrentDraft.narrative}
              onChange={(e) =>
                setConcurrentDraft((d) => ({ ...d, narrative: e.target.value }))
              }
              rows={5}
              placeholder="Describe the defect observed during the inspection, cite the Section/Rule, the impact, and the corrective action…"
              className="w-full bg-slate-950/70 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-cyan-200/40 focus:outline-none focus:border-lime-400/60 leading-relaxed"
            />
          </label>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                const n = concurrentDraft.narrative.trim();
                if (!n) return;
                const r = generateDefectNarrative(n, concurrentDraft.category);
                setConcurrentPreview({
                  title: r.title,
                  category: concurrentDraft.category,
                  rawNote: n,
                  aiNarrative: r.narrative,
                  citations: r.citations,
                  mode: r.mode || null,
                });
              }}
              disabled={!concurrentDraft.narrative.trim()}
              className="group relative disabled:opacity-40"
            >
              <span className="absolute -inset-0.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 rounded-xl blur opacity-50 group-hover:opacity-80 transition-opacity" />
              <span className="relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-lime-500 via-emerald-500 to-cyan-500 text-slate-950 font-display tracking-[0.18em] uppercase text-[11px] font-black">
                <Sparkles className="w-4 h-4" strokeWidth={2.8} />
                Generate AI Narrative
              </span>
            </button>
          </div>

          {concurrentPreview && (
            <div className="mt-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-700 font-mono-techy font-bold mb-1 flex items-center gap-1.5">
                <Bot className="w-3 h-3" strokeWidth={2.5} />
                AI Auditor Preview — Review before adding
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-gray-500 font-mono-techy font-bold mb-0.5">
                AI-Generated Title
              </div>
              <div className="font-display font-black text-base tracking-[0.05em] text-gray-900">
                {concurrentPreview.title}
              </div>
              <div className="mt-1">
                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-display font-bold border bg-lime-400/15 border-lime-400/40 text-lime-800 uppercase">
                  {catLabel(concurrentPreview.category)}
                </span>
              </div>

              {/* Narration mode */}
              <div className="mt-3 mb-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-mono-techy font-bold mb-1.5">
                  Narration Mode
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'hit', label: 'HIT · Strict' },
                    { key: 'run', label: 'RUN · Flexible' },
                  ].map((m) => {
                    const active = concurrentPreview.mode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          const r = generateDefectNarrative(
                            concurrentPreview.rawNote,
                            concurrentPreview.category,
                            m.key
                          );
                          setConcurrentPreview((p) => ({
                            ...p,
                            title: r.title,
                            aiNarrative: r.narrative,
                            citations: r.citations,
                            mode: m.key,
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-display tracking-[0.12em] uppercase font-bold border transition-colors ${
                          active
                            ? m.key === 'hit'
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'bg-amber-500 border-amber-500 text-slate-950'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                  {concurrentPreview.mode && (
                    <button
                      type="button"
                      onClick={() => {
                        const r = generateDefectNarrative(
                          concurrentPreview.rawNote,
                          concurrentPreview.category
                        );
                        setConcurrentPreview((p) => ({
                          ...p,
                          title: r.title,
                          aiNarrative: r.narrative,
                          citations: r.citations,
                          mode: null,
                        }));
                      }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-display tracking-[0.12em] uppercase font-bold border bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    >
                      Neutral
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-mono-techy font-bold mb-1.5">
                Suggested Humanised Narrative
              </div>
              <p
                className="text-[13px] text-gray-800 leading-relaxed text-justify mb-4"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                {concurrentPreview.aiNarrative}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setConcurrentCustom((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        category: concurrentPreview.category,
                        title: concurrentPreview.title,
                        narrative: concurrentPreview.aiNarrative,
                      },
                    ]);
                    setConcurrentDraft({ category: 'financial', narrative: '' });
                    setConcurrentPreview(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-[11px] font-display tracking-[0.18em] uppercase font-bold hover:bg-gray-800 inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Confirm &amp; Add
                </button>
                <button
                  type="button"
                  onClick={() => setConcurrentPreview(null)}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-[11px] font-display tracking-[0.18em] uppercase font-bold hover:bg-gray-50"
                >
                  Edit / Re-draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConcurrentPreview(null);
                    setConcurrentDraft({ category: 'financial', narrative: '' });
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 text-[11px] font-display tracking-[0.18em] uppercase font-bold hover:bg-rose-50"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {concurrentCustom.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
                Added Defects ({concurrentCustom.length})
              </div>
              <ol className="space-y-2">
                {concurrentCustom.map((d) => (
                  <li
                    key={d.id}
                    className="relative rounded-xl border border-white/10 bg-slate-900/50 p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[8px] tracking-[0.2em] font-display font-bold border bg-lime-400/15 border-lime-400/40 text-lime-300 uppercase">
                          {catLabel(d.category)}
                        </span>
                        <span className="font-display font-black text-white text-[13px]">
                          {d.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/75 leading-relaxed text-justify">
                        {d.narrative}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConcurrentCustom((prev) =>
                          prev.filter((x) => x.id !== d.id)
                        )
                      }
                      className="shrink-0 w-7 h-7 rounded-lg border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-center"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

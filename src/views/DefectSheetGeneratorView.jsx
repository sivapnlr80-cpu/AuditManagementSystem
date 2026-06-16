import { useAudit } from '../context/AuditContext';
import { Sparkles, CheckCircle2, FilePlus2, Trash2, Bot } from 'lucide-react';

export default function DefectSheetGeneratorView() {
  const { customDefects, setCustomDefects, customDefectDraft, setCustomDefectDraft, defectPreview, setDefectPreview, generateDefectNarrative } = useAudit();

  return (
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
                  <div className="max-w-[260px]">
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
                  </div>

                  <label>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-lime-300/80 font-mono-techy font-bold mb-2">
                      Narrative
                      <span className="ml-2 normal-case tracking-normal text-cyan-200/50 font-sans">
                        — the AI titles the defect from this narration
                      </span>
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
                        const n = customDefectDraft.narrative.trim();
                        if (!n) return;
                        const { title, narrative, citations, mode } =
                          generateDefectNarrative(
                            n,
                            customDefectDraft.category
                          );
                        setDefectPreview({
                          title,
                          category: customDefectDraft.category,
                          rawNote: n,
                          aiNarrative: narrative,
                          citations,
                          mode: mode || null,
                        });
                      }}
                      disabled={!customDefectDraft.narrative.trim()}
                      className="group relative disabled:opacity-40"
                    >
                      <span className="absolute -inset-0.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 rounded-xl blur opacity-50 group-hover:opacity-80 transition-opacity" />
                      <span className="relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-lime-500 via-emerald-500 to-cyan-500 text-slate-950 font-display tracking-[0.18em] uppercase text-[11px] font-black">
                        <Sparkles
                          className="w-4 h-4"
                          strokeWidth={2.8}
                        />
                        Generate AI Narrative
                      </span>
                    </button>
                  </div>

                  {/* AI Preview & Confirm panel */}
                  {defectPreview && (
                    <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-5 anim-row">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-700 font-mono-techy font-bold mb-1 flex items-center gap-1.5">
                            <Bot className="w-3 h-3" strokeWidth={2.5} />
                            AI Auditor Preview — Review before adding
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.25em] text-gray-500 font-mono-techy font-bold mb-0.5">
                            AI-Generated Title
                          </div>
                          <div className="font-display font-black text-base tracking-[0.05em] text-gray-900">
                            {defectPreview.title}
                          </div>
                          <div className="mt-1">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-display font-bold border bg-lime-400/15 border-lime-400/40 text-lime-800 uppercase">
                              {defectPreview.category === 'financial'
                                ? 'B.1 Financial'
                                : defectPreview.category === 'accounting'
                                ? 'B.2 Accounting'
                                : 'B.3 Administrative'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── NARRATION MODE — HIT (strict) / RUN (flexible) ── */}
                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-mono-techy font-bold mb-1.5">
                          Narration Mode
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            {
                              key: 'hit',
                              label: 'HIT · Strict',
                              hint: 'Hard-stop · conclusive · cites remedy',
                            },
                            {
                              key: 'run',
                              label: 'RUN · Flexible',
                              hint: 'Advisory · notes carve-out · regularisable',
                            },
                          ].map((m) => {
                            const active = defectPreview.mode === m.key;
                            return (
                              <button
                                key={m.key}
                                type="button"
                                title={m.hint}
                                onClick={() => {
                                  const r = generateDefectNarrative(
                                    defectPreview.rawNote,
                                    defectPreview.category,
                                    m.key
                                  );
                                  setDefectPreview((p) => ({
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
                          {defectPreview.mode && (
                            <button
                              type="button"
                              title="Revert to the standard auditor narration"
                              onClick={() => {
                                const r = generateDefectNarrative(
                                  defectPreview.rawNote,
                                  defectPreview.category
                                );
                                setDefectPreview((p) => ({
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
                          <span className="text-[10px] text-gray-500 italic">
                            {defectPreview.mode === 'hit'
                              ? 'Strict: prima-facie violation, no mitigation.'
                              : defectPreview.mode === 'run'
                              ? 'Flexible: interpretable, open to the competent authority.'
                              : 'Standard narration — pick a mode to re-cast.'}
                          </span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-mono-techy font-bold mb-1.5">
                          Suggested Humanised Narrative
                        </div>
                        <p
                          className="text-[13px] text-gray-800 leading-relaxed text-justify"
                          style={{
                            fontFamily:
                              "'Inter', system-ui, sans-serif",
                          }}
                        >
                          {defectPreview.aiNarrative}
                        </p>
                      </div>

                      <div className="mb-4">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-mono-techy font-bold mb-1.5">
                          Cited Provisions
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {defectPreview.citations.map((c, ci) => (
                            <span
                              key={ci}
                              className="px-2 py-1 rounded-md text-[10px] bg-white border border-gray-300 text-gray-800 font-mono-techy"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomDefects((prev) => [
                              ...prev,
                              {
                                category: defectPreview.category,
                                title: defectPreview.title,
                                narrative: defectPreview.aiNarrative,
                                id: Date.now(),
                              },
                            ]);
                            setCustomDefectDraft({
                              category: 'financial',
                              title: '',
                              narrative: '',
                            });
                            setDefectPreview(null);
                          }}
                          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-[11px] font-display tracking-[0.18em] uppercase font-bold hover:bg-gray-800 inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Confirm & Add to Defect Sheet
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Allow user to edit further; keep draft intact
                            setDefectPreview(null);
                          }}
                          className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-[11px] font-display tracking-[0.18em] uppercase font-bold hover:bg-gray-50"
                        >
                          Edit / Re-draft
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDefectPreview(null);
                            setCustomDefectDraft({
                              category: 'financial',
                              title: '',
                              narrative: '',
                            });
                          }}
                          className="px-4 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 text-[11px] font-display tracking-[0.18em] uppercase font-bold hover:bg-rose-50"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
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
  );
}

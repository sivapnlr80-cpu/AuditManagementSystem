import { useAudit } from '../context/AuditContext';
import { Upload, ScrollText, XCircle } from 'lucide-react';

export default function AuditDefectsView() {
  const { auditResults, societyName, defectSheet, printDefectSheet, talliedCount } = useAudit();

  return (
    <>
      {defectSheet && (
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
                  Generated by · COOP·AUDIT·AI
                </div>
              </div>
            </div>
      )}

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
    </>
  );
}

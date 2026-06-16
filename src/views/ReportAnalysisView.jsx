import { useAudit } from '../context/AuditContext';
import { ScrollText, Sparkles, CheckCircle2, XCircle, FileCheck2 } from 'lucide-react';

export default function ReportAnalysisView() {
  const { cashBookReport, cashBookError, cashBookProcessing, cashBalanceThreshold, setCashBalanceThreshold, cashBookAnalysis, cashBookIncludeInDefects, setCashBookIncludeInDefects, loanRecoveryReports, loanRecoveryError, loanRecoveryProcessing, loanRecoveryAnalyses, loanRecoveryIncludeMap, setLoanRecoveryIncludeMap, handleCashBookUpload, handleLoanRecoveryUpload, downloadCashBookCSV, downloadCashBookPDF, downloadLoanRecoveryCSV, downloadLoanRecoveryPDF } = useAudit();

  return (
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
  );
}

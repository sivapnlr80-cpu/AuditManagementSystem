import { useAudit } from '../context/AuditContext';
import { Upload, Printer, ShieldCheck, Sparkles, Activity, CheckCircle2, XCircle } from 'lucide-react';

export default function DashboardView() {
  const { detectedFiles, auditResults, isDragging, setIsDragging, statementRows, processZIP, loading, availableCount, talliedCount } = useAudit();

  return (
    <>
      {(detectedFiles.length > 0 || auditResults.length > 0) && (
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
                        Detect
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
                            Verify
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

      {(detectedFiles.length > 0 || auditResults.length > 0) && (
            <div className="no-print mt-6 flex flex-col sm:flex-row gap-3 justify-center anim-slide-up">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-bold tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:bg-slate-800 transition-all duration-200"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-800 text-sm font-bold tracking-wide border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-violet-300 hover:text-violet-600 transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
                Upload another file
              </button>
            </div>
      )}

      {detectedFiles.length === 0 && auditResults.length === 0 && (
              <div className="anim-slide-up flex flex-col justify-center min-h-[calc(100vh-290px)]">
                {/* Welcome banner */}
                <div className="text-center mb-4">
                  <h2 className="font-display text-base lg:text-xl font-black tracking-[0.12em] gradient-text px-4 leading-snug">
                    WELCOME USER, THIS IS FINANCIAL STATEMENT PDF ANALYSER
                  </h2>
                </div>
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
                className={`glossy-border-box block cursor-pointer relative overflow-hidden p-6 lg:p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? 'scale-[1.02] shadow-[0_0_60px_rgba(124,58,237,0.4)]'
                    : ''
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
                <div className="absolute inset-0 cyber-grid opacity-[0.06] pointer-events-none" />
                {isDragging && (
                  <>
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-violet-400/25 blur-3xl pointer-events-none animate-pulse" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
                  </>
                )}
                <div className="relative">
                  <div
                    className={`text-5xl mb-2 ${
                      isDragging ? 'animate-bounce' : 'anim-float'
                    }`}
                  >
                    {isDragging ? '⬇️' : '📁'}
                  </div>
                  <h3 className="font-display text-xl lg:text-2xl font-black tracking-[0.2em] gradient-text mb-1.5">
                    {isDragging
                      ? 'RELEASE TO UPLOAD'
                      : 'DRAG & DROP ZIP HERE'}
                  </h3>
                  <p className="text-[11px] text-slate-500 tracking-[0.15em] uppercase font-mono-techy max-w-md mx-auto">
                    {isDragging
                      ? 'Drop the file to begin AI verification'
                      : 'Drop a ZIP with the cooperative audit PDFs or click to browse'}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] font-mono-techy text-slate-400">
                    <span>Max 75 MB</span>
                    <span className="text-slate-300">·</span>
                    <span>ZIP folder only</span>
                  </div>
                </div>
              </label>
              </div>
      )}
    </>
  );
}

import { useAudit } from '../context/AuditContext';
import { Upload } from 'lucide-react';

export default function UploadDocumentsView() {
  const { documentRows } = useAudit();

  return (
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
  );
}

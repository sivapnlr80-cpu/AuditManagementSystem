import { useAudit } from '../context/AuditContext';
import { CheckCircle2, FilePlus2, Send, Bot, User as UserIcon, KeyRound, Zap, AlertCircle } from 'lucide-react';

export default function LegalChatView() {
  const { loading, chatMessages, setChatMessages, chatInput, setChatInput, chatTyping, setChatTyping, aiKey, showKeyPanel, setShowKeyPanel, aiKeyDraft, setAiKeyDraft, aiTestRunning, aiTestResult, setAiTestResult, aiTestQuestion, setAiTestQuestion, corpus, corpusStatus, corpusProgress, runAiKeyTest, saveAiKey, clearAiKey, handleAddUserReference, handleRemoveUserReference, answerWithCorpus, hasGeminiKey, buildCaseLawReferences, generateLegalAgentAnswer } = useAudit();

  return (
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
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.2em] font-mono-techy font-bold border inline-flex items-center gap-1.5 ${
                      aiKey
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                        : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                    }`}
                    title={
                      aiKey
                        ? 'Live AI active — Gemini answers your questions'
                        : 'Offline mode — rule-based engine. Add an AI key for true AI.'
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        aiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {aiKey ? 'Live AI' : 'Offline'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAiKeyDraft('');
                      setShowKeyPanel((v) => !v);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 hover:bg-violet-500/20 text-[10px] uppercase tracking-[0.2em] font-mono-techy font-bold text-violet-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3 h-3" strokeWidth={2.5} />
                    AI Key
                  </button>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-[10px] uppercase tracking-[0.2em] font-mono-techy font-bold text-fuchsia-200 transition-colors inline-flex items-center gap-1.5">
                    <FilePlus2 className="w-3 h-3" strokeWidth={2.5} />
                    Add PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAddUserReference(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
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
              </div>

              {/* AI key panel — paste a Google Gemini API key to enable live AI */}
              {showKeyPanel && (
                <div className="relative px-6 py-4 border-b border-white/10 bg-slate-950/50 anim-slide-up">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/90 font-mono-techy font-bold mb-2">
                    Gemini AI Key {aiKey && '· key saved ✓'}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                  {/* Live AI test panel — exercises the same code path the chat uses */}
<div className="mb-4 rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-violet-500/5 p-4">
  <div className="flex items-center gap-2 mb-2">
    <Zap className="w-3.5 h-3.5 text-violet-300" strokeWidth={2.5} />
    <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300/90 font-mono-techy font-bold">
      Test Live AI · {hasGeminiKey() ? 'KEY DETECTED — WILL CALL GEMINI' : 'NO KEY — WILL USE OFFLINE FALLBACK'}
    </div>
  </div>

  <div className="flex flex-col gap-2">
    <textarea
      value={aiTestQuestion}
      onChange={(e) => setAiTestQuestion(e.target.value)}
      rows={2}
      placeholder="Type a test question…"
      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none vibgyor-input-focus resize-none"
    />
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={runAiKeyTest}
        disabled={aiTestRunning || !aiTestQuestion.trim()}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-[12px] font-display tracking-[0.18em] uppercase font-bold hover:bg-violet-500 disabled:opacity-40 transition-colors"
      >
        <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
        {aiTestRunning ? 'Calling…' : hasGeminiKey() ? 'Test Live Gemini' : 'Test Offline Fallback'}
      </button>
      <button
        type="button"
        onClick={() => setAiTestResult(null)}
        disabled={!aiTestResult}
        className="px-4 py-2.5 rounded-xl bg-white text-slate-700 text-[12px] font-bold border border-slate-200 hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-40"
      >
        Clear
      </button>
    </div>
  </div>

  {aiTestResult && (
    <div
      className={`mt-3 rounded-xl border p-3 anim-row ${
        aiTestResult.mode === 'live'
          ? 'border-emerald-400/40 bg-emerald-500/5'
          : aiTestResult.mode === 'offline'
          ? 'border-amber-400/40 bg-amber-500/5'
          : 'border-rose-400/40 bg-rose-500/5'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          {aiTestResult.mode === 'live' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-mono-techy font-bold border bg-emerald-500/15 border-emerald-400/40 text-emerald-300 uppercase">
              <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
              LIVE · Gemini responded
            </span>
          ) : aiTestResult.mode === 'offline' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-mono-techy font-bold border bg-amber-500/15 border-amber-400/40 text-amber-300 uppercase">
              <AlertCircle className="w-3 h-3" strokeWidth={3} />
              OFFLINE · corpus / keyword engine
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] font-mono-techy font-bold border bg-rose-500/15 border-rose-400/40 text-rose-300 uppercase">
              <AlertCircle className="w-3 h-3" strokeWidth={3} />
              ERROR
            </span>
          )}
          <span className="text-[10px] text-cyan-200/60 font-mono-techy">
            · {aiTestResult.ms} ms
          </span>
        </div>
      </div>
      {aiTestResult.error ? (
        <pre className="text-[11px] text-rose-200/90 whitespace-pre-wrap font-mono-techy leading-relaxed">
          {aiTestResult.error}
        </pre>
      ) : (
        <p className="text-[12px] text-white/85 leading-relaxed whitespace-pre-wrap">
          {aiTestResult.text}
        </p>
      )}
      {aiTestResult.note && (
        <p className="mt-2 text-[10px] text-cyan-200/50 italic leading-relaxed">
          {aiTestResult.note}
        </p>
      )}
    </div>
  )}
</div>
                    <input
                      type="password"
                      value={aiKeyDraft}
                      onChange={(e) => setAiKeyDraft(e.target.value)}
                      placeholder={
                        aiKey ? 'Enter a new key to replace…' : 'AIza…'
                      }
                      autoComplete="off"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none vibgyor-input-focus"
                    />
                    <button
                      type="button"
                      onClick={saveAiKey}
                      disabled={!aiKeyDraft.trim()}
                      className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold tracking-wide hover:bg-violet-500 disabled:opacity-40 transition-colors"
                    >
                      Save
                    </button>
                    {aiKey && (
                      <button
                        type="button"
                        onClick={clearAiKey}
                        className="px-5 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-bold tracking-wide border border-slate-200 hover:border-rose-300 hover:text-rose-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-cyan-200/50 leading-relaxed">
                    Stored locally in this browser only (never bundled). With a key,
                    the chat reasons with Gemini (draft → humanize) and cites case-law;
                    without it, the offline reference engine is used.
                  </p>
                </div>
              )}

              {/* Corpus status strip */}
              {(corpusStatus === 'loading' ||
                corpus.length > 0) && (
                <div className="relative px-6 py-2.5 border-b border-white/10 bg-slate-950/40 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono-techy uppercase tracking-[0.25em]">
                    {corpusStatus === 'loading' ? (
                      <span className="text-fuchsia-300 animate-pulse">
                        ⏳ Indexing references… {corpusProgress.done}/
                        {corpusProgress.total}
                      </span>
                    ) : (
                      <span className="text-emerald-300">
                        ✓ {corpus.length} reference(s) indexed
                      </span>
                    )}
                  </div>
                  {corpus.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {corpus.map((d) => (
                        <span
                          key={d.id}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono-techy font-bold border ${
                            d.source === 'user'
                              ? 'bg-lime-400/15 border-lime-400/40 text-lime-200'
                              : 'bg-fuchsia-400/10 border-fuchsia-400/30 text-fuchsia-200'
                          }`}
                        >
                          {d.name} · {d.pages.length}p
                          {d.source === 'user' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveUserReference(d.id)
                              }
                              className="ml-1 text-rose-300 hover:text-rose-400"
                              title="Remove"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed border ${
                        m.role === 'user'
                          ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-50/95'
                          : 'bg-slate-900/60 border-white/15 text-white/90'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {m.content}
                      </div>
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <div className="text-[9px] uppercase tracking-[0.3em] text-fuchsia-300/80 font-mono-techy font-bold">
                            Excerpts from indexed references
                          </div>
                          {m.citations.map((c, ci) => (
                            <div
                              key={ci}
                              className="rounded-lg bg-fuchsia-500/5 border border-fuchsia-400/20 p-2.5"
                            >
                              <div className="text-[10px] font-mono-techy font-bold text-fuchsia-300/90 mb-1">
                                📘 {c.doc} · page {c.page}
                              </div>
                              <div className="text-[12px] text-white/80 italic leading-relaxed">
                                {c.snippet}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.references && m.references.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                          <div className="text-[9px] uppercase tracking-[0.3em] text-cyan-300/80 font-mono-techy font-bold">
                            Case-law &amp; statute references
                          </div>
                          {m.references.map((r, ri) => (
                            <a
                              key={ri}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[12px] text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-words"
                            >
                              🔗 {r.label}
                            </a>
                          ))}
                        </div>
                      )}
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
                      {hasGeminiKey()
                        ? 'Researching the law, drafting & humanizing the answer…'
                        : 'Looking up the law…'}
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
                    // recent turns as conversation context for the AI agent
                    const history = chatMessages
                      .filter((m) => m.role === 'user' || m.role === 'ai')
                      .slice(-6)
                      .map((m) => ({
                        role: m.role === 'ai' ? 'assistant' : 'user',
                        content: m.content,
                      }));
                    setChatMessages((prev) => [
                      ...prev,
                      { role: 'user', content: q },
                    ]);
                    setChatInput('');
                    setChatTyping(true);
                    (async () => {
                      try {
                        // AI agent: draft legal narrative -> humanize -> references
                        const { text, references } =
                          await generateLegalAgentAnswer(q, history);
                        setChatMessages((prev) => [
                          ...prev,
                          { role: 'ai', content: text, references },
                        ]);
                      } catch (err) {
                        // Fallback to the offline corpus / keyword engine
                        const { text, citations } = answerWithCorpus(q);
                        const prefix =
                          err && err.code === 'NO_API_KEY'
                            ? ''
                            : '⚠️ AI service unavailable — showing the offline reference engine instead.\n\n';
                        setChatMessages((prev) => [
                          ...prev,
                          {
                            role: 'ai',
                            content: prefix + text,
                            citations,
                            references: buildCaseLawReferences(q),
                          },
                        ]);
                      } finally {
                        setChatTyping(false);
                      }
                    })();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about Section 50, Rule 41(C)(6), Para 7.5, Annexure-8…"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none vibgyor-input-focus"
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
  );
}

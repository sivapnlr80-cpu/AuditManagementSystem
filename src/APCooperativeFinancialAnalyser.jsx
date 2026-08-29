import { useState } from 'react';
import {
  LayoutDashboard, Upload, BarChart2, AlertOctagon, FileText,
  MessageSquare, Printer, ShieldCheck, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { AuditProvider, useAudit } from './context/AuditContext.jsx';
import AISecurityScoreView from './views/AISecurityScoreView.jsx';

// --- Placeholder views -------------------------------------------------------
function PlaceholderView({ name }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-10">
      <div className="text-5xl mb-4 opacity-20">🚧</div>
      <h2 className="text-lg font-semibold text-gray-400">{name}</h2>
      <p className="text-sm text-gray-600 mt-2">This view is under construction.</p>
    </div>
  );
}

// --- Nav config --------------------------------------------------------------
const NAV = [
  { id: 'dashboard',       label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'upload',          label: 'Upload Documents',      icon: Upload },
  { id: 'report',          label: 'Report Analysis',       icon: BarChart2 },
  { id: 'concurrent',      label: 'Concurrent Audit',      icon: AlertOctagon },
  { id: 'defects',         label: 'Audit Defects',         icon: FileText },
  { id: 'ai-security',     label: 'AI Security Score',     icon: ShieldCheck, badge: 'NEW' },
  { id: 'legal-chat',      label: 'AI Legal Chat',         icon: MessageSquare },
  { id: 'defect-sheet',    label: 'Defect Sheet',          icon: Printer },
];

// --- Login gate --------------------------------------------------------------
function LoginGate({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const attempt = (e) => {
    e.preventDefault();
    // Simple obfuscated check matching README spec: USER / Pass@123
    const okU = [...'USER'].map(c => c.charCodeAt(0).toString(2)).join('') ===
                [...user].map(c => c.charCodeAt(0).toString(2)).join('');
    const okP = btoa(pass) === btoa('Pass@123');
    if (okU && okP) onLogin();
    else setErr('Invalid credentials. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl border-2 border-indigo-500 mb-4"
               style={{ animation: 'rainbow-border 3s linear infinite' }}>
            <ShieldCheck size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
            COOP·AUDIT·AI
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cooperative Audit Intelligence System</p>
        </div>
        <form onSubmit={attempt} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              className="rainbow-focus w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none transition-all"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="rainbow-focus w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none transition-all"
              autoComplete="current-password"
            />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Sidebar -----------------------------------------------------------------
function Sidebar({ active, onNav, onLogout, societyName, auditYear }) {
  return (
    <aside className="w-56 shrink-0 flex flex-col h-full border-r border-gray-800 bg-gray-900">
      <div className="px-4 py-5 border-b border-gray-800">
        <h1 className="text-sm font-bold text-white tracking-wider" style={{ fontFamily: 'Orbitron, monospace' }}>
          COOP·AUDIT·AI
        </h1>
        {societyName && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{societyName}</p>
        )}
        {auditYear && (
          <p className="text-xs text-indigo-400">{auditYear}</p>
        )}
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group ${
              active === id
                ? 'bg-indigo-900/60 text-indigo-300 border-r-2 border-indigo-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Icon size={15} className={active === id ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'} />
            <span className="flex-1 text-left">{label}</span>
            {badge && (
              <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
            {active === id && <ChevronRight size={12} className="text-indigo-500" />}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// --- Main app shell ----------------------------------------------------------
function AppShell() {
  const [view, setView] = useState('ai-security');
  const { societyName, auditYear } = useAudit();

  const renderView = () => {
    if (view === 'ai-security') return <AISecurityScoreView />;
    return <PlaceholderView name={NAV.find(n => n.id === view)?.label ?? view} />;
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0e1a' }}>
      <Sidebar
        active={view}
        onNav={setView}
        onLogout={() => window.location.reload()}
        societyName={societyName}
        auditYear={auditYear}
      />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}

// --- Root component ----------------------------------------------------------
export default function APCooperativeFinancialAnalyser() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  return (
    <AuditProvider>
      <AppShell />
    </AuditProvider>
  );
}

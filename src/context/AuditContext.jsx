import { createContext, useContext, useState, useCallback } from 'react';

const AuditContext = createContext(null);

export function AuditProvider({ children }) {
  const [societyName, setSocietyName] = useState('');
  const [auditYear, setAuditYear] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractedData, setExtractedData] = useState({});
  const [tallyResults, setTallyResults] = useState({});
  const [irregularities, setIrregularities] = useState({ B1: [], B2: [], B3: [] });
  const [defects, setDefects] = useState([]);
  const [geminiKey, setGeminiKey] = useState(
    () => localStorage.getItem('coop_audit_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
  );

  const saveGeminiKey = useCallback((key) => {
    localStorage.setItem('coop_audit_gemini_key', key);
    setGeminiKey(key);
  }, []);

  const addIrregularity = useCallback((category, item) => {
    setIrregularities(prev => ({
      ...prev,
      [category]: [...prev[category], { id: Date.now(), ...item }],
    }));
  }, []);

  const removeIrregularity = useCallback((category, id) => {
    setIrregularities(prev => ({
      ...prev,
      [category]: prev[category].filter(i => i.id !== id),
    }));
  }, []);

  const value = {
    societyName, setSocietyName,
    auditYear, setAuditYear,
    uploadedFiles, setUploadedFiles,
    extractedData, setExtractedData,
    tallyResults, setTallyResults,
    irregularities, addIrregularity, removeIrregularity,
    defects, setDefects,
    geminiKey, saveGeminiKey,
  };

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within AuditProvider');
  return ctx;
}

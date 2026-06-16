import { createContext, useContext } from 'react';

/**
 * Shared state/handlers for the COOP·AUDIT·AI app.
 *
 * The main component (APCooperativeFinancialAnalyser) owns all useState /
 * useMemo / handlers and supplies them through this context. Each menu view
 * under src/views/ reads what it needs via `const { ... } = useAudit();`.
 *
 * To split a menu into its own file you only need to: (1) add the value to the
 * `auditCtx` object built in the main component, and (2) destructure it in the
 * view. No prop drilling.
 */
export const AuditContext = createContext(null);

export function useAudit() {
  const ctx = useContext(AuditContext);
  if (ctx === null) {
    throw new Error('useAudit() must be used inside <AuditContext.Provider>.');
  }
  return ctx;
}

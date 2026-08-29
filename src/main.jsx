import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import APCooperativeFinancialAnalyser from './APCooperativeFinancialAnalyser.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <APCooperativeFinancialAnalyser />
  </StrictMode>
);

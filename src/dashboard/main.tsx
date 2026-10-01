import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/asap/latin-400.css';
import '@fontsource/asap/latin-700.css';
import '../app/basis.css';
import '../app/spel.css';
import './dashboard.css';
import { DashboardApp } from './DashboardApp';

const root = document.getElementById('root');
if (!root) throw new Error('Element #root ontbreekt in dashboard.html.');

createRoot(root).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>,
);

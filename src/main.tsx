import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/asap/latin-400.css';
import '@fontsource/asap/latin-600.css';
import '@fontsource/asap/latin-700.css';
import './app/basis.css';

const root = document.getElementById('root');
if (!root) throw new Error('Element #root ontbreekt in index.html.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

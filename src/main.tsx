import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/system.css';
import './styles/motion.css';
import './styles/hud.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento #root não encontrado para montar a aplicação.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

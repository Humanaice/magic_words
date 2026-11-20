import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fugaz-one/400.css';
import '@fontsource/blinker/400.css';
import '@fontsource/blinker/700.css';
import './styles/global.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Purpose: Bootstrap the React application and load its global styles.
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './typography.css'; // one font (Michroma) at normal sizes, loaded last
import './theme.css'; // site-wide Day / Dark mode (excludes Hero, About, Footer)

// The pinned hero stage depends on scroll position; always start at the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const rootEl = document.getElementById('root');
let mounted = false;
function mount() {
  if (mounted || !rootEl) return;
  mounted = true;
  createRoot(rootEl).render(<App />);
}

const cssLink = document.querySelector('link[data-main-css]');
if (!cssLink || cssLink.sheet) {
  mount();
} else {
  const ready = () => {
    if (cssLink.rel === 'preload') cssLink.rel = 'stylesheet';
    if (cssLink.sheet) mount();
    else setTimeout(mount, 40);
  };
  cssLink.addEventListener('load', ready);
  cssLink.addEventListener('error', mount);
  if (cssLink.rel === 'stylesheet') ready();
  setTimeout(mount, 1500);
}

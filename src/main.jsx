// Purpose: Bootstrap the React application and load its global styles.
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './typography.css'; // one font (Michroma) at normal sizes, loaded last

// The pinned hero stage depends on scroll position; always start at the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')).render(<App />);

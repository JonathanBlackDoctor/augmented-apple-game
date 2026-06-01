import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { startUpdateCheck } from './app/updateCheck';
import './ui/styles.css';

const el = document.getElementById('root');
if (el) createRoot(el).render(<App />);

// Auto-refresh clients stuck on a cached old bundle after a redeploy.
startUpdateCheck();

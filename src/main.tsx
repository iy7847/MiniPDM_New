import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Router } from './app/Router'
import { AuthProvider } from './app/providers/AuthProvider'

// DEBUG: Global error overlay to help diagnose silent failures in production/Electron
window.onerror = function (message, _source, _lineno, _colno, error) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '10px';
  div.style.right = '10px';
  div.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
  div.style.color = 'white';
  div.style.padding = '10px';
  div.style.zIndex = '999999';
  div.style.maxWidth = '400px';
  div.style.wordWrap = 'break-word';
  div.style.pointerEvents = 'none';
  div.innerText = `Error: ${message}\n${error?.stack || ''}`;
  document.body.appendChild(div);
};
window.addEventListener('unhandledrejection', function(event) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '100px';
  div.style.right = '10px';
  div.style.backgroundColor = 'rgba(255, 100, 0, 0.9)';
  div.style.color = 'white';
  div.style.padding = '10px';
  div.style.zIndex = '999999';
  div.style.maxWidth = '400px';
  div.style.wordWrap = 'break-word';
  div.style.pointerEvents = 'none';
  div.innerText = `Unhandled Promise: ${event.reason}`;
  document.body.appendChild(div);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Router />
    </AuthProvider>
  </StrictMode>,
)

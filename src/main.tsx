import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Router } from './app/Router'
import { AuthProvider } from './app/providers/AuthProvider'
import { ToastContainer } from './design-system'

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

// 일렉트론(브라우저) 기본 드래그앤드롭 동작 방지 (파일을 놓았을 때 화면이 해당 파일로 덮어씌워지는 현상 방지)
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastContainer />
      <Router />
    </AuthProvider>
  </StrictMode>,
)

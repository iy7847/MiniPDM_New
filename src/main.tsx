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

import { ConfirmProvider } from './app/providers/ConfirmProvider'
import { initPersistentStorage } from './shared/services/persistentStorage'

async function bootstrap() {
  // @ts-ignore
  window.perfLogger?.log?.('bootstrap 시작');

  // 1. Electron 영구 파일 스토리지(%APPDATA%\MiniPDM\user_storage.json)로부터 세션 및 설정 동기 복원
  try {
    await initPersistentStorage();
    // @ts-ignore
    window.perfLogger?.log?.('initPersistentStorage 완료');
  } catch (err) {
    console.error('스토리지 초기화 실패:', err);
  }

  // 2. 스토리지 준비 완료 후 React 마운트 (첫 프레임부터 세션 및 이메일 즉각 반영)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <ConfirmProvider>
          <ToastContainer />
          <Router />
        </ConfirmProvider>
      </AuthProvider>
    </StrictMode>,
  );
  // @ts-ignore
  window.perfLogger?.log?.('createRoot render 트리거 완료');
}

bootstrap();

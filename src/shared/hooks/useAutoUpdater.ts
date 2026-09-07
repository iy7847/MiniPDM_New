import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/shared/stores/useToastStore';

export interface UpdateStatusInfo {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  message: string;
  version?: string;
  percent?: number;
  error?: string;
}

// 전역 싱글톤 상태 및 리스너 관리 (중복 토스트 원천 방지)
let globalUpdateInfo: UpdateStatusInfo = {
  status: 'idle',
  message: '',
};
let globalVersion: string = '1.0.0';
let isListenerRegistered = false;
const listeners = new Set<(info: UpdateStatusInfo) => void>();

function notifyAll(info: UpdateStatusInfo) {
  globalUpdateInfo = info;
  listeners.forEach((fn) => fn(info));
}

function initGlobalUpdaterListener() {
  if (isListenerRegistered) return;
  // @ts-ignore
  const updater = typeof window !== 'undefined' ? window.updaterAPI : null;
  if (!updater) return;

  isListenerRegistered = true;

  updater.getAppVersion?.().then((ver: string) => {
    if (ver) globalVersion = ver;
  }).catch(() => {});

  updater.onUpdateStatus?.((data: UpdateStatusInfo) => {
    notifyAll(data);
    // 💡 앱 전체에서 딱 1번만 단일 토스트 발생
    if (data.status === 'available') {
      toast.info(data.message || '새 버전이 발견되어 다운로드를 진행합니다.');
    } else if (data.status === 'downloaded') {
      toast.success(data.message || '다운로드가 완료되었습니다. 앱 종료 시 자동 적용됩니다.');
    } else if (data.status === 'error') {
      toast.error(data.message || '업데이트 확인 중 오류가 발생했습니다.');
    }
  });
}

// 🚀 모듈 로드 즉시 백그라운드 리스너 등록 (컴포넌트 렌더 전 이벤트 유실 원천 방지)
if (typeof window !== 'undefined') {
  initGlobalUpdaterListener();
}

export function useAutoUpdater() {
  const [currentVersion, setCurrentVersion] = useState<string>(globalVersion);
  const [updateInfo, setUpdateInfo] = useState<UpdateStatusInfo>(globalUpdateInfo);
  // @ts-ignore
  const isElectron = typeof window !== 'undefined' && !!window.updaterAPI;

  useEffect(() => {
    initGlobalUpdaterListener();

    // 현재 캐시된 버전 및 정보 동기화
    setCurrentVersion(globalVersion);
    setUpdateInfo(globalUpdateInfo);

    // 구독자 등록
    const handleUpdate = (info: UpdateStatusInfo) => {
      setUpdateInfo(info);
      if (globalVersion) setCurrentVersion(globalVersion);
    };
    listeners.add(handleUpdate);

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // 수동 업데이트 확인
  const checkForUpdates = useCallback(async () => {
    // @ts-ignore
    const updater = window.updaterAPI;
    if (!updater) {
      toast.info('웹 브라우저 환경에서는 데스크톱 자동 업데이트가 지원되지 않습니다.');
      return;
    }

    try {
      setUpdateInfo({
        status: 'checking',
        message: '새로운 버전을 확인하는 중입니다...',
      });
      const res = await updater.checkForUpdates();
      if (res?.isDev) {
        setUpdateInfo({
          status: 'not-available',
          message: res.message || '개발 환경입니다. (최신 상태)',
        });
        toast.info(res.message);
      }
    } catch (err: any) {
      setUpdateInfo({
        status: 'error',
        message: err?.message || '업데이트 확인 실패',
        error: err?.message,
      });
      toast.error('업데이트 확인 중 오류가 발생했습니다.');
    }
  }, []);

  // 재시작 및 설치
  const restartAndInstall = useCallback(() => {
    // @ts-ignore
    const updater = window.updaterAPI;
    if (updater?.quitAndInstall) {
      updater.quitAndInstall();
    }
  }, []);

  return {
    isElectron,
    currentVersion,
    updateInfo,
    checkForUpdates,
    restartAndInstall,
  };
}

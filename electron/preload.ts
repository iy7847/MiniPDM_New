import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

import { webUtils } from 'electron'
contextBridge.exposeInMainWorld('webUtils', {
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
})

contextBridge.exposeInMainWorld('fileSystem', {
  saveFile: (srcPath: string, companyId: string, targetPath: string) => ipcRenderer.invoke('save-file', srcPath, companyId, targetPath),
  saveFileFromBuffer: (data: ArrayBuffer | Uint8Array, companyId: string, targetPath: string, fileName: string) => ipcRenderer.invoke('save-file-from-buffer', data, companyId, targetPath, fileName)
})

contextBridge.exposeInMainWorld('updaterAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateStatus: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update-status', listener);
    return () => {
      ipcRenderer.off('update-status', listener);
    };
  }
});

// 💾 순수 브라우저 localStorage 기반으로 전환하여 0ms 기동 보장 (동기 IPC 블로킹 완전 제거)
contextBridge.exposeInMainWorld('initialPersistentStorage', {});
contextBridge.exposeInMainWorld('persistentStorage', {
  getItem: async () => null,
  setItem: async () => true,
  removeItem: async () => true,
  getAll: async () => ({}),
  getAllSync: () => ({}),
});

contextBridge.exposeInMainWorld('perfLogger', {
  log: (step: string) => ipcRenderer.invoke('log-perf', step).catch(() => {}),
});



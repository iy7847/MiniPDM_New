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

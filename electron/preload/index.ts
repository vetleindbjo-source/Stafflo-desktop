import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.sendSync('get-version'),
  onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string | null }) => void) => {
    ipcRenderer.on('update-available', (_e, info) => cb(info))
  },
  onUpdateDownloadProgress: (cb: (percent: number) => void) => {
    ipcRenderer.on('update-download-progress', (_e, percent) => cb(percent))
  },
  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('update-downloaded', () => cb())
  },
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateCheckResult: (cb: (result: 'latest') => void) => {
    ipcRenderer.on('update-check-result', (_e, result) => cb(result))
  },
  getUpdateState: () => ipcRenderer.send('get-update-state'),
})

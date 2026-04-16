import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'

const PROTOCOL = 'stafflo'

// Register custom protocol for OAuth deep-link callbacks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [join(__dirname, process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const isDev = !app.isPackaged
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Handle the OAuth deep-link callback (arbeidsplan://auth?accessToken=X&refreshToken=Y)
 * Forward the tokens to the renderer via postMessage
 */
function handleDeepLink(url: string) {
  if (!mainWindow) return
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'auth') {
      const accessToken = parsed.searchParams.get('accessToken')
      const refreshToken = parsed.searchParams.get('refreshToken')
      if (accessToken && refreshToken) {
        mainWindow.webContents.executeJavaScript(`
          window.postMessage({ type: 'STAFFLO_AUTH', accessToken: '${accessToken}', refreshToken: '${refreshToken}' }, '*')
        `)
        mainWindow.focus()
      }
    }
  } catch (e) {
    console.error('Deep link parse error:', e)
  }
}

// macOS: open-url event
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Auto-updater — only runs in production builds
  if (app.isPackaged) {
    autoUpdater.autoDownload = false
    // App is not code-signed, skip publisher verification
    autoUpdater.verifyUpdateCodeSignature = () => Promise.resolve(undefined)

    let pendingUpdateVersion: string | null = null
    let updateReadyToInstall = false

    autoUpdater.on('update-available', (info) => {
      pendingUpdateVersion = info.version
      mainWindow?.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes ?? null,
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update-download-progress', Math.round(progress.percent))
    })

    autoUpdater.on('update-downloaded', () => {
      updateReadyToInstall = true
      mainWindow?.webContents.send('update-downloaded')
    })

    // Re-send cached update state when renderer requests it
    ipcMain.on('get-update-state', () => {
      if (updateReadyToInstall) {
        mainWindow?.webContents.send('update-downloaded')
      } else if (pendingUpdateVersion) {
        mainWindow?.webContents.send('update-available', { version: pendingUpdateVersion, releaseNotes: null })
      }
    })

    // Delay auto-check so React has time to mount and register listeners
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000)
    })
  }

  ipcMain.on('get-version', (e) => { e.returnValue = app.getVersion() })

  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate()
  })

  ipcMain.on('install-update', () => {
    autoUpdater.autoInstallOnAppQuit = true
    setImmediate(() => autoUpdater.quitAndInstall(false, true))
  })

  ipcMain.on('check-for-updates', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch(() => {
        mainWindow?.webContents.send('update-check-result', 'latest')
      })
      // If no update-available fires within 5s, assume latest
      const timeout = setTimeout(() => {
        mainWindow?.webContents.send('update-check-result', 'latest')
      }, 5000)
      autoUpdater.once('update-available', () => clearTimeout(timeout))
    } else {
      mainWindow?.webContents.send('update-check-result', 'latest')
    }
  })
})

// Windows/Linux: second-instance with deep link in argv
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`))
    if (url) handleDeepLink(url)
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

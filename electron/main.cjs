// Processus principal de l'application de bureau : une fenêtre qui charge le build statique.
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

const isExternal = (url) => /^https?:\/\//i.test(url)

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 380,
    minHeight: 560,
    title: 'Présidentielle 2027 – Comparateur de programmes',
    backgroundColor: '#fafaf9',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  })

  // Programmes et sources s'ouvrent dans le navigateur par défaut, jamais dans l'application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return
    event.preventDefault()
    if (isExternal(url)) shell.openExternal(url)
  })

  win.loadFile(path.join(__dirname, '..', 'dist-electron', 'index.html'))
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.whenReady().then(createWindow)
  app.on('window-all-closed', () => app.quit())
}

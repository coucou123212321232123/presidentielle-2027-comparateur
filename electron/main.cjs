// Processus principal de l'application de bureau : une fenêtre qui charge le build statique.
const { app, BrowserWindow, dialog, net, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

// Les nouvelles versions sont publiées comme « releases » GitHub (.github/workflows/desktop.yml).
const REPO = 'coucou123212321232123/presidentielle-2027-comparateur'

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
  return win
}

/** Vrai si la version `a` (1.1.12) est plus récente que `b`. */
function isNewer(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0)
  return false
}

/** Téléchargement avec progression dans la barre des tâches. */
async function download(url, file, win) {
  const res = await net.fetch(url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const out = fs.createWriteStream(file)
  let received = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out.write(Buffer.from(value))
    received += value.length
    if (total) win.setProgressBar(received / total)
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())))
  win.setProgressBar(-1)
}

/**
 * Au démarrage : s'il existe une version plus récente sur GitHub, propose de l'installer.
 * Version installée : l'installeur est téléchargé puis lancé. Version portable : le nouveau fichier est
 * téléchargé dans le dossier Téléchargements. Hors ligne ou en cas d'erreur : rien ne se passe.
 */
async function checkForUpdate(win) {
  if (!app.isPackaged) return
  try {
    const res = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return
    const release = await res.json()
    const latest = String(release.tag_name || '').replace(/^v/, '')
    if (!latest || !isNewer(latest, app.getVersion())) return
    const portable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE)
    const asset = (release.assets || []).find((a) => (portable ? /Portable.*\.exe$/i : /Setup.*\.exe$/i).test(a.name))
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Mettre à jour', 'Plus tard'],
      defaultId: 0,
      cancelId: 1,
      title: 'Mise à jour disponible',
      message: `Une nouvelle version de l'application est disponible (${latest}).`,
      detail: portable
        ? 'Le nouveau fichier sera enregistré dans votre dossier Téléchargements.'
        : "Elle sera téléchargée puis installée ; l'application se fermera pendant l'installation.",
    })
    if (response !== 0) return
    if (!asset) return void shell.openExternal(release.html_url)
    const dir = portable ? app.getPath('downloads') : app.getPath('temp')
    const file = path.join(dir, asset.name)
    await download(asset.browser_download_url, file, win)
    if (portable) {
      shell.showItemInFolder(file)
      return
    }
    const err = await shell.openPath(file)
    if (!err) app.quit()
  } catch {
    /* hors ligne ou GitHub indisponible : on réessaiera au prochain démarrage */
  }
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
  app.whenReady().then(() => {
    const win = createWindow()
    win.webContents.once('did-finish-load', () => checkForUpdate(win))
  })
  app.on('window-all-closed', () => app.quit())
}

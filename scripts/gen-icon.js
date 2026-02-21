const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')

const SVG_PATH = join(__dirname, '..', 'assets', 'icon.svg')
const OUT_DIR = join(__dirname, '..', 'assets')

const sizes = [48, 128, 256, 512]

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const svg = readFileSync(SVG_PATH, 'utf-8')
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

  for (const size of sizes) {
    const win = new BrowserWindow({
      width: size,
      height: size,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: { offscreen: true }
    })

    await win.loadURL(`data:text/html,<html><body style="margin:0;padding:0;background:transparent;"><img src="${dataUrl}" width="${size}" height="${size}"></body></html>`)

    // Wait for render
    await new Promise((r) => setTimeout(r, 500))

    const image = await win.webContents.capturePage()
    const png = image.toPNG()
    const outPath = join(OUT_DIR, `icon-${size}.png`)
    writeFileSync(outPath, png)
    console.log(`Generated ${outPath}`)
    win.close()
  }

  app.quit()
})

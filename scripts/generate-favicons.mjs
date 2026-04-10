import { access, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const logoPath = join(publicDir, 'logo.png')
const svgPath = join(publicDir, 'favicon.svg')

/** Square raster favicons: prefer logo; fall back to SVG. Wide logos: cover crop from the west (mark on the left). */
async function rasterSource() {
  try {
    await access(logoPath)
    return sharp(logoPath).resize(256, 256, {
      fit: 'cover',
      position: 'west',
    })
  } catch {
    return sharp(await readFile(svgPath))
  }
}

const base = await rasterSource()

const png32 = await base.clone().resize(32, 32).png().toBuffer()
const png16 = await base.clone().resize(16, 16).png().toBuffer()
const png48 = await base.clone().resize(48, 48).png().toBuffer()

await writeFile(join(publicDir, 'favicon.png'), png32)
const ico = await toIco([png16, png32, png48])
await writeFile(join(publicDir, 'favicon.ico'), ico)

console.log('Wrote public/favicon.png and public/favicon.ico')

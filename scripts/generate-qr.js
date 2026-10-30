import QRCode from 'qrcode'
import jsQR from 'jsqr'
import png from 'pngjs'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const destination = 'https://blog.drewclark.io'
const options = { errorCorrectionLevel: 'M', margin: 4, width: 264, color: { dark: '#18181B', light: '#FFFFFF' } }
const svg = await QRCode.toString(destination, { ...options, type: 'svg' })
// Independently decode a raster of the same QR payload before writing the asset.
const bytes = await QRCode.toBuffer(destination, options)
const image = png.PNG.sync.read(bytes)
const decoded = jsQR(new Uint8ClampedArray(image.data), image.width, image.height)
assert.equal(decoded?.data, destination, 'QR code must resolve to the exact live blog URL')
await writeFile(new URL('../front/assets/images/blog-qr.svg', import.meta.url), svg)
console.log(`QR generated and independently decoded: ${destination}`)

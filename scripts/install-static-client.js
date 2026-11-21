import { mkdir, writeFile, chmod } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// Official Microsoft deployment client, pinned and SHA-256 verified at image build.
const version = 'a58ffd5ddfced557500b295844f2490acc313951'
const windows = process.platform === 'win32'
const hash = windows ? '76fcf16ff5377a30be0e0e691a50b384509a836264904c610d0ace05893b0677' : '0a3c8166b05fa427ed57386d9ba3d82d4f3f3e4f66fabc26c1f934fa705458fa'
const url = `https://swalocaldeployv2-bndtgugjgqc3dhdx.b01.azurefd.net/downloads/${version}/${windows ? 'windows/StaticSitesClient.exe' : 'linux/StaticSitesClient'}`
const response = await fetch(url)
if (!response.ok) throw new Error(`Deployment client download failed: ${response.status}`)
const bytes = Buffer.from(await response.arrayBuffer())
if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('Deployment client checksum mismatch')
const folder = resolve(process.argv[2] || '.azure-local/static-client')
await mkdir(folder, { recursive: true })
const path = resolve(folder, windows ? 'StaticSitesClient.exe' : 'StaticSitesClient')
await writeFile(path, bytes)
await chmod(path, 0o755)
console.log('Verified Microsoft static deployment client installed')

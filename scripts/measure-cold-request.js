import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Run only after the control-plane replica check confirms both apps are at zero.
const label = process.argv[2]
if (!/^[a-z0-9-]+$/.test(label || '')) throw new Error('Supply a unique lowercase measurement label.')
const folder = `.azure-local/cold-trace/${label}`
await mkdir(folder, { recursive: true })
const requests = {
    health: 'https://blog.drewclark.io/health',
    article: 'https://blog.drewclark.io/articles/building-ascend-avoid-responsive-multiplayer',
    portfolio: 'https://drewclark.io/',
}
await Promise.all(Object.entries(requests).map(async ([name, url]) => {
    const startedAt = new Date().toISOString()
    const child = spawn(process.platform === 'win32' ? 'curl.exe' : 'curl', [
        '--silent', '--show-error', '--max-time', '120', '--dump-header', `${folder}/${name}.headers`,
        '--output', `${folder}/${name}.html`, '--write-out',
        '{"status":%{http_code},"dns":%{time_namelookup},"connect":%{time_connect},"tls":%{time_appconnect},"firstByte":%{time_starttransfer},"total":%{time_total},"bytes":%{size_download}}', url,
    ])
    let output = '', error = ''
    child.stdout.on('data', data => { output += data })
    child.stderr.on('data', data => { error += data })
    const exit = await new Promise((done, fail) => { child.once('exit', done); child.once('error', fail) })
    const headers = await readFile(`${folder}/${name}.headers`, 'utf8')
    const result = { name, url, startedAt, finishedAt: new Date().toISOString(), exit, ...JSON.parse(output), serverTiming: headers.match(/^server-timing:\s*(.+)$/im)?.[1].trim() || null, error }
    await writeFile(`${folder}/${name}.json`, JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    if (exit || result.status !== 200) process.exitCode = 1
}))

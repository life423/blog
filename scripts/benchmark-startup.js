import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

async function sample(entry) {
    const url = pathToFileURL(resolve(entry)).href
    const code = `const {createApp}=await import(${JSON.stringify(url)});createApp({store:{},credentials:{}}).listen(0,'127.0.0.1',function(){process.send({port:this.address().port})})`
    const start = performance.now()
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: { ...process.env, NODE_ENV: 'test' },
    })
    let timer
    let errors = ''
    child.stderr.on('data', data => { errors += data })
    try {
        const { port } = await new Promise((done, fail) => {
            timer = setTimeout(() => fail(new Error('Server startup timed out')), 15000)
            child.once('message', done)
            child.once('error', fail)
            child.once('exit', code => fail(new Error(`Server exited ${code}: ${errors}`)))
        })
        const listeningMs = performance.now() - start
        const response = await fetch(`http://127.0.0.1:${port}/health`)
        if (!response.ok) throw new Error('Health check failed')
        await response.text()
        return { listeningMs: Math.round(listeningMs), healthyMs: Math.round(performance.now() - start) }
    } finally {
        clearTimeout(timer)
        if (child.exitCode === null) {
            const exited = new Promise(done => child.once('exit', done))
            child.kill()
            await exited
        }
    }
}

const samples = { source: [], bundled: [] }
for (let i = 0; i < 5; i++) {
    samples.source.push(await sample('back/index.js'))
    samples.bundled.push(await sample('dist/back/index.js'))
}
const median = values => [...values].sort((a, b) => a - b)[2]
console.log(JSON.stringify(Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, {
    samples: values,
    medianListeningMs: median(values.map(v => v.listeningMs)),
    medianHealthyMs: median(values.map(v => v.healthyMs)),
}])), null, 2))

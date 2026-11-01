import { AsyncLocalStorage } from 'node:async_hooks'

// Request-local numeric durations only; never retain credentials or article data.
const requests = new AsyncLocalStorage()
export async function collectStorageTiming(read) {
    const timings = new Map()
    const value = await requests.run(timings, () => timeStorage('storage', read))
    return { value, header: [...timings].map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`).join(', ') }
}

export async function timeStorage(name, read) {
    const timings = requests.getStore()
    if (!timings) return read()
    const started = performance.now()
    try { return await read() }
    finally { timings.set(name, (timings.get(name) || 0) + performance.now() - started) }
}

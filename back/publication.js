import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { exportPublicSite } from './static-public.js'

export async function deployStaticFiles(output, { token = process.env.SWA_DEPLOYMENT_TOKEN, binary = process.env.STATIC_DEPLOY_CLIENT || '/app/bin/StaticSitesClient', signal } = {}) {
    if (!token) throw new Error('Static publishing is not configured')
    await new Promise((resolve, reject) => {
        // The secret is only a child environment value, never a command argument/log.
        const child = spawn(binary, [], { signal, env: {
            PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
            DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1',
            DEPLOYMENT_ACTION: 'upload', DEPLOYMENT_PROVIDER: 'SwaCli', DEPLOYMENT_TOKEN: token,
            REPOSITORY_BASE: output, APP_LOCATION: output, CONFIG_FILE_LOCATION: output,
            SKIP_APP_BUILD: 'true', SKIP_API_BUILD: 'true', VERBOSE: 'false',
        }, stdio: ['ignore', 'pipe', 'pipe'] })
        // The vendor client may print response details; never persist its raw output.
        child.stdout.resume(); child.stderr.resume()
        child.once('error', reject)
        child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Static deployment client exited ${code}`)))
    })
}

export function createPublisher({ store, deploy = deployStaticFiles, editorOrigin = process.env.EDITOR_ORIGIN, siteUrl = process.env.PUBLIC_BLOG_ORIGIN, release = process.env.APP_RELEASE || 'local', retryDelay = (attempt, signal) => delay(2000 * (attempt + 1), undefined, { signal }) }) {
    if (!editorOrigin || !store.publicationState || !process.env.SWA_DEPLOYMENT_TOKEN && deploy === deployStaticFiles) return null
    let running
    async function work() {
        // One shared lease serializes publication across replicas and code releases.
        let lease
        try { lease = await store.lockPublication() }
        catch (error) { if ([409, 412].includes(error.statusCode)) return; throw error }
        const abort = new AbortController()
        const renewal = setInterval(() => lease.renew().catch(() => abort.abort()), 20000)
        try {
            for (;;) {
                const state = await store.publicationState()
                if (!state.requestedId || state.requestedId === state.deployedId) return
                let succeeded = false
                for (let attempt = 0; attempt < 3; attempt++) {
                    if (abort.signal.aborted) throw new Error('Publication lease lost')
                    const output = await mkdtemp(join(tmpdir(), 'blog-public-'))
                    try {
                        await store.updatePublication({ phase: 'deploying', error: '', updatedAt: new Date().toISOString() })
                        await exportPublicSite({ store, output, editorOrigin, release, publicationId: state.requestedId })
                        await deploy(output, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(210000)]) })
                        await store.updatePublication({ deployedId: state.requestedId, phase: 'live', error: '', deployedAt: new Date().toISOString(), release })
                        succeeded = true
                        break
                    } catch (error) {
                        console.warn('Static publication attempt failed:', error.code || error.name)
                        if (attempt < 2 && !abort.signal.aborted) await retryDelay(attempt, abort.signal)
                    } finally {
                        if (!output.startsWith(join(tmpdir(), 'blog-public-'))) throw new Error('Unexpected public build directory')
                        await rm(output, { recursive: true, force: true })
                    }
                }
                if (!succeeded) {
                    await store.updatePublication({ phase: 'failed', error: 'Your changes are saved, but the public site could not update. Retry publishing.', updatedAt: new Date().toISOString() })
                    return
                }
            }
        } finally { clearInterval(renewal); await lease.release().catch(() => {}) }
    }
    function kick() {
        if (!running) {
            running = work().catch(error => console.warn('Static publication unavailable:', error.code || error.name)).finally(() => { running = undefined })
        }
        return running
    }
    return {
        kick,
        async request() { await store.requestPublication(); kick(); return this.status() },
        async status() {
            const state = await store.publicationState()
            const pending = Boolean(state.requestedId && state.requestedId !== state.deployedId)
            if (pending && state.phase !== 'failed') kick()
            return { ...state, phase: pending ? state.phase === 'failed' ? 'failed' : 'deploying' : state.deployedId ? 'live' : 'idle', siteUrl }
        },
    }
}

// Used by GitHub Actions after the new backend revision is ready.
import { setTimeout as delay } from 'node:timers/promises'
const origin = process.env.EDITOR_ORIGIN
const secret = process.env.PUBLIC_DEPLOY_TRIGGER_SECRET
if (!origin || !secret) throw new Error('Missing public deployment CI settings')
async function request(method) {
    for (let attempt = 0; attempt < 12; attempt++) {
        const response = await fetch(`${origin}/internal/publication`, { method, headers: { 'x-deploy-token': secret }, signal: AbortSignal.timeout(60000) })
        if (response.ok) return response.json()
        // Ingress can briefly retain an old route after ARM reports readiness.
        if (![404, 502, 503, 504].includes(response.status) || attempt === 11) throw new Error(`Public deployment request failed (${response.status})`)
        await delay(5000)
    }
}
const requested = await request('POST')
for (let attempt = 0; attempt < 180; attempt++) {
    const state = await request('GET')
    if (state.phase === 'failed') throw new Error(state.error)
    if (state.phase === 'live' && (!process.env.EXPECTED_RELEASE || state.release === process.env.EXPECTED_RELEASE)) {
        // A newer request also covers this request because builds read latest data.
        console.log(`Public site refreshed from backend release ${state.release}`)
        process.exit(0)
    }
    await delay(5000)
}
throw new Error(`Public deployment did not complete (${requested.requestedId})`)

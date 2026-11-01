import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpHeaders } from '@azure/core-rest-pipeline'
import { createStorageCredential } from '../back/storage-credential.js'

test('Startup authentication recovers after failure and concurrent reads reuse its token', async () => {
    const settings = { IDENTITY_ENDPOINT: 'http://127.0.0.1:1/local-test', IDENTITY_HEADER: 'local-test-only', AZURE_TOKEN_CREDENTIALS: 'ManagedIdentityCredential' }
    const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]))
    Object.assign(process.env, settings)
    let requests = 0, release, entered
    const gate = new Promise(resolve => { release = resolve })
    const started = new Promise(resolve => { entered = resolve })
    try {
        const credential = createStorageCredential({ httpClient: { async sendRequest(request) {
            requests++
            if (requests === 1) return { request, status: 400, headers: createHttpHeaders(), bodyAsText: JSON.stringify({ error: 'invalid_request', error_description: 'Local test failure' }) }
            entered()
            await gate
            return { request, status: 200, headers: createHttpHeaders(), bodyAsText: JSON.stringify({ access_token: 'local-test-token', expires_on: String(Math.floor(Date.now() / 1000) + 3600), resource: new URL(request.url).searchParams.get('resource') }) }
        } } })
        await assert.rejects(credential.prepare())
        const preparation = credential.prepare()
        assert.equal(credential.prepare(), preparation)
        await started
        const read = credential.getToken('https://storage.azure.com/.default')
        release()
        const [, token] = await Promise.all([preparation, read])
        assert.equal(token.token, 'local-test-token')
        assert.equal(requests, 2)
    } finally {
        release()
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value
        }
    }
})

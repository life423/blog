import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpHeaders } from '@azure/core-rest-pipeline'
import { createStorageCredential } from '../back/storage-credential.js'
import { collectStorageTiming } from '../back/storage-timing.js'

test('Managed identity transport reports HTTP time and preserves token caching', async () => {
    const settings = { IDENTITY_ENDPOINT: 'http://127.0.0.1:1/local-test', IDENTITY_HEADER: 'local-test-only', AZURE_TOKEN_CREDENTIALS: 'ManagedIdentityCredential' }
    const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]))
    Object.assign(process.env, settings)
    let requests = 0
    try {
        const credential = createStorageCredential({ httpClient: { async sendRequest(request) {
            requests++
            return { request, status: 200, headers: createHttpHeaders(), bodyAsText: JSON.stringify({
                access_token: 'local-test-token', expires_on: String(Math.floor(Date.now() / 1000) + 3600), resource: new URL(request.url).searchParams.get('resource'),
            }) }
        } } })
        const first = await collectStorageTiming(() => credential.getToken('https://storage.azure.com/.default'))
        assert.equal(first.value.token, 'local-test-token')
        assert.match(first.header, /auth_http;dur=\d+\.\d/)
        assert.doesNotMatch(first.header, /local-test|storage.azure.com/)
        const second = await collectStorageTiming(() => credential.getToken('https://storage.azure.com/.default'))
        assert.equal(second.value.token, first.value.token)
        assert.equal(requests, 1)
        assert.doesNotMatch(second.header, /auth_http/)
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value
        }
    }
})

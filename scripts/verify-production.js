// Explicit deployment smoke test. Creates private, unique test objects only, then cleans them up.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { DefaultAzureCredential } from '@azure/identity'
import { TableClient } from '@azure/data-tables'
import { BlobServiceClient } from '@azure/storage-blob'

const origin = process.env.BLOG_TEST_ORIGIN || 'https://blog.drewclark.io'
const account = process.env.AZURE_STORAGE_ACCOUNT || 'drewblogdata'
const handoff = await readFile('.azure-local/admin-login.txt', 'utf8')
const password = handoff.match(/^Password: (.+)$/m)[1]
const username = handoff.match(/^Username: (.+)$/m)[1]
const headers = { origin, 'x-blog-request': '1', 'Content-Type': 'application/json' }
const slug = `production-check-${randomUUID()}`
const identity = new DefaultAzureCredential()
const table = new TableClient(`https://${account}.table.core.windows.net`, 'posts', identity)
const blobs = new BlobServiceClient(`https://${account}.blob.core.windows.net`, identity)
let created = false
let imageName
async function call(path, options = {}) {
    return fetch(origin + path, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(60000) })
}
try {
    assert.equal((await call('/health')).status, 200)
    assert.equal((await call('/api/admin/posts')).status, 401)
    const login = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    assert.equal(login.status, 200)
    const cookie = login.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /Secure/i)
    assert.match(cookie, /SameSite=Strict/i)
    headers.cookie = cookie.split(';')[0]
    assert.equal((await (await call('/api/admin/session')).json()).authenticated, true)
    assert.equal((await call('/api/admin/posts')).status, 200)
    const input = { slug, title: 'Temporary production validation', excerpt: 'Private deployment check, never published.', body: '## A private check\n\nProduction storage and authentication work.', topic: 'Development', status: 'draft' }
    let response = await call(`/api/admin/posts/${slug}`, { method: 'PUT', body: JSON.stringify(input) })
    assert.equal(response.status, 200)
    created = true
    let post = await response.json()
    const staleVersion = post.version
    assert.equal((await call(`/articles/${slug}`)).status, 404)
    assert.equal((await (await call('/api/posts')).json()).posts.some(post => post.slug === slug), false)
    response = await call(`/api/admin/posts/${slug}`, { method: 'PUT', body: JSON.stringify({ ...input, body: `${input.body}\n\nUpdated.`, version: post.version }) })
    assert.equal(response.status, 200)
    post = await response.json()
    for (const version of [staleVersion, 'malformed-version']) {
        assert.equal((await call(`/api/admin/posts/${slug}`, { method: 'PUT', body: JSON.stringify({ ...input, version }) })).status, 409)
    }
    response = await call(`/api/admin/posts/${slug}`, { method: 'DELETE', body: JSON.stringify({ version: post.version }) })
    assert.equal(response.status, 200)
    post = await response.json()
    assert.equal(post.status, 'trashed')
    response = await call(`/api/admin/posts/${slug}/restore`, { method: 'POST', body: JSON.stringify({ version: post.version }) })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).status, 'draft')
    assert.equal((await call('/api/admin/preview', { method: 'POST', headers: { origin: 'https://not-the-blog.example' }, body: JSON.stringify({ body: 'test' }) })).status, 403)
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=', 'base64')
    const form = new FormData()
    form.append('image', new Blob([bytes], { type: 'image/png' }), 'test.png')
    const upload = await fetch(`${origin}/api/admin/media`, { method: 'POST', headers: { origin, 'x-blog-request': '1', cookie: headers.cookie }, body: form, signal: AbortSignal.timeout(60000) })
    assert.equal(upload.status, 200)
    const media = await upload.json()
    imageName = media.url.split('/').at(-1)
    const image = await fetch(origin + media.url)
    assert.equal(image.status, 200)
    assert.match(image.headers.get('content-type'), /image\/png/)
    assert.equal((await call('/api/admin/logout', { method: 'POST' })).status, 200)
    delete headers.cookie
    assert.equal((await call('/api/admin/posts')).status, 401)
    console.log('Live HTTPS checks passed: login/secure cookie, draft CRUD/trash/restore/privacy, stale/malformed-version and CSRF rejection, media upload/read, logout.')
} finally {
    if (created) {
        await table.deleteEntity('post', slug)
        for await (const blob of blobs.getContainerClient('articles').listBlobsFlat({ prefix: `${slug}/` })) await blobs.getContainerClient('articles').getBlobClient(blob.name).deleteIfExists()
    }
    if (imageName) await blobs.getContainerClient('media').getBlobClient(imageName).deleteIfExists()
    console.log('Only transient production-validation records and media were removed.')
}

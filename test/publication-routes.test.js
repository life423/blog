import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../back/storage.js'
import { hashPassword } from '../back/auth.js'
const { createApp } = await import(process.env.BLOG_SERVER_ENTRY || '../back/index.js')

test('Only public article mutations enqueue publication; private drafts and stale writes do not', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'blog-public-routes-'))
    const store = createStore({ account: '', file: join(folder, 'posts.json') })
    const save = store.save.bind(store)
    const mutations = []
    store.save = async (post, version, options) => { const result = await save(post, version); mutations.push(options?.publicChanged || false); return result }
    let kicks = 0
    const publisher = { kick() { kicks++ }, async status() { return { phase: 'live' } }, async request() { return { phase: 'deploying' } } }
    const server = createApp({ store, publisher, preview: false, credentials: { username: 'test', hash: await hashPassword('test-only-password') } }).listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const origin = `http://127.0.0.1:${server.address().port}`
    const headers = { origin, 'x-blog-request': '1', 'Content-Type': 'application/json' }
    const post = { slug: 'test-public-flow', title: 'Test flow', excerpt: 'Test summary', body: '## A heading\n\nUseful text.', topic: 'DevOps', status: 'draft' }
    try {
        assert.equal((await fetch(origin + '/api/admin/publication')).status, 401)
        assert.equal((await fetch(origin + '/internal/publication', { method: 'POST' })).status, 401)
        const login = await fetch(origin + '/api/admin/login', { method: 'POST', headers, body: JSON.stringify({ username: 'test', password: 'test-only-password' }) })
        headers.cookie = login.headers.get('set-cookie').split(';')[0]
        let saved
        async function put(status, version = saved?.version) {
            const response = await fetch(origin + '/api/admin/posts/' + post.slug, { method: 'PUT', headers, body: JSON.stringify({ ...post, status, version }) })
            assert.equal(response.status, 200)
            saved = await response.json()
        }
        await put('draft')
        await put('draft')
        await put('published')
        const stale = saved.version
        await put('published')
        const rejected = await fetch(origin + '/api/admin/posts/' + post.slug, { method: 'PUT', headers, body: JSON.stringify({ ...post, status: 'published', version: stale }) })
        assert.equal(rejected.status, 409)
        await put('draft')
        await put('published')
        const trashed = await fetch(origin + '/api/admin/posts/' + post.slug, { method: 'DELETE', headers, body: JSON.stringify({ version: saved.version }) })
        assert.equal(trashed.status, 200)
        assert.deepEqual(mutations, [false, false, true, true, true, true, true])
        assert.equal(kicks, 6) // startup plus five public mutations
    } finally {
        await new Promise(resolve => server.close(resolve))
        assert.ok(folder.startsWith(join(tmpdir(), 'blog-public-routes-')))
        await rm(folder, { recursive: true, force: true })
    }
})

test('Azure public saves commit the article and publication request in one table transaction', async () => {
    const store = createStore({ account: 'localtestaccount' })
    let actions, uploaded = false, removed = false
    store.blobs = { getContainerClient() { return { getBlockBlobClient() { return { async uploadData() { uploaded = true }, async deleteIfExists() { removed = true } } } } } }
    store.table = { async submitTransaction(batch) { actions = batch } }
    store.get = async slug => ({ slug })
    const input = { slug: 'one-story', body: 'A public body', status: 'published' }
    await store.save(input, 'etag-1', { publicChanged: true })
    assert.ok(uploaded)
    assert.equal(actions.length, 2)
    assert.deepEqual(actions[0].slice(2), ['Replace', { etag: 'etag-1' }])
    assert.equal(actions[0][1].partitionKey, actions[1][1].partitionKey)
    assert.equal(actions[1][1].rowKey, '_publication')
    assert.ok(actions[1][1].requestedId)
    store.table.submitTransaction = async () => { throw Object.assign(new Error('conflict'), { statusCode: 412 }) }
    await assert.rejects(store.save(input, 'stale', { publicChanged: true }), error => error.status === 409)
    assert.ok(removed)
})

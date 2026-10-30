import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createApp } from '../back/index.js'
import { createStore } from '../back/storage.js'
import { markdown, validatePost } from '../back/content.js'
import { hashPassword, verifyPassword } from '../back/auth.js'

const draft = { slug: 'first-article', title: 'First article', excerpt: 'A useful introduction.', topic: 'Development', status: 'draft', body: '## A real heading\n\nDraft content.' }

test('Markdown removes scripts, event handlers and unsafe links', () => {
    const html = markdown('<script>alert(1)</script><img src=x onerror="alert(1)">[unsafe](javascript:alert)\n\n## Safe heading')
    assert.doesNotMatch(html, /<script|onerror|href="javascript:/)
    assert.match(html, /Safe heading/)
})

test('Post validation rejects unsafe slugs, unapproved topics and external covers', () => {
    for (const change of [{ slug: '../secret' }, { topic: 'Other' }, { cover: 'https://tracking.example/image' }, { status: 'hidden' }]) assert.throws(() => validatePost({ ...draft, ...change }))
    assert.equal(validatePost(draft).slug, 'first-article')
})

test('Draft privacy, authentication, CSRF, publish/unpublish and optimistic concurrency', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'beyond-stack-test-'))
    const store = createStore({ account: '', file: join(folder, 'posts.json') })
    const credentials = { username: 'test-admin', hash: await hashPassword('test-password-only-123') }
    const app = createApp({ store, preview: false, credentials })
    const server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const origin = `http://127.0.0.1:${server.address().port}`
    const headers = { origin, 'x-blog-request': '1', 'Content-Type': 'application/json' }
    try {
        assert.equal((await fetch(`${origin}/api/admin/posts`)).status, 401)
        assert.equal((await fetch(`${origin}/api/admin/login`, { method: 'POST' })).status, 403)
        assert.equal((await fetch(`${origin}/api/admin/login`, { method: 'POST', headers: { ...headers, origin: 'https://attacker.example' } })).status, 403)
        const wrong = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers, body: JSON.stringify({ username: 'test-admin', password: 'incorrect' }) })
        assert.equal(wrong.status, 401)
        const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers, body: JSON.stringify({ username: credentials.username, password: 'test-password-only-123' }) })
        assert.equal(login.status, 200)
        headers.cookie = login.headers.get('set-cookie').split(';')[0]
        const save = (post, version) => fetch(`${origin}/api/admin/posts/first-article`, { method: 'PUT', headers, body: JSON.stringify({ ...post, version }) })
        let response = await save(draft)
        assert.equal(response.status, 200)
        const created = await response.json()
        assert.equal((await save(draft, 'malformed-version')).status, 409)
        assert.equal((await fetch(`${origin}/articles/first-article`)).status, 404)
        assert.deepEqual((await (await fetch(`${origin}/api/posts`)).json()).posts, [])
        assert.equal((await save(draft)).status, 409)
        const competing = await Promise.all([save({ ...draft, title: 'Edit A' }, created.version), save({ ...draft, title: 'Edit B' }, created.version)])
        assert.deepEqual(competing.map(r => r.status).sort(), [200, 409])
        let current = await store.get(draft.slug)
        response = await save({ ...draft, status: 'published' }, current.version)
        assert.equal(response.status, 200)
        current = await response.json()
        const page = await fetch(`${origin}/articles/first-article`)
        assert.equal(page.status, 200)
        assert.match(await page.text(), /A real heading/)
        assert.ok(page.headers.get('content-security-policy'))
        assert.equal((await (await fetch(`${origin}/api/posts`)).json()).posts.length, 1)
        response = await save(draft, current.version)
        assert.equal(response.status, 200)
        assert.equal((await fetch(`${origin}/articles/first-article`)).status, 404)
        current = await response.json()
        const trash = await fetch(`${origin}/api/admin/posts/first-article`, { method: 'DELETE', headers, body: JSON.stringify({ version: current.version }) })
        assert.equal(trash.status, 200)
        current = await trash.json()
        assert.equal(current.status, 'trashed')
        assert.equal(current.body, draft.body)
        assert.equal((await save(draft, current.version)).status, 409)
        const restore = await fetch(`${origin}/api/admin/posts/first-article/restore`, { method: 'POST', headers, body: JSON.stringify({ version: current.version }) })
        assert.equal(restore.status, 200)
        assert.equal((await restore.json()).status, 'draft')
        assert.equal((await fetch(`${origin}/articles/first-article`)).status, 404)
        assert.equal((await fetch(`${origin}/articles`)).status, 200)
        await fetch(`${origin}/api/admin/logout`, { method: 'POST', headers })
    } finally {
        await new Promise(resolve => server.close(resolve))
        assert.ok(resolve(folder).startsWith(resolve(tmpdir()) + '\\') || resolve(folder).startsWith(resolve(tmpdir()) + '/'))
        assert.ok(folder.includes('beyond-stack-test-'))
        await rm(folder, { recursive: true, force: true })
    }
})

test('Untrusted identity headers cannot open the editor', async () => {
    const app = createApp({ store: { list: async () => [] }, preview: false, credentials: {} })
    const server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/posts`, { headers: { 'x-ms-client-principal-id': 'fake', 'x-ms-client-principal-idp': 'aad' } })
        assert.equal(response.status, 401)
    } finally { await new Promise(resolve => server.close(resolve)) }
})


test('Passwords use salted scrypt hashes and reject incorrect values', async () => {
    const hash = await hashPassword('only-a-test-password')
    assert.notEqual(hash, await hashPassword('only-a-test-password'))
    assert.equal(await verifyPassword('only-a-test-password', hash), true)
    assert.equal(await verifyPassword('wrong', hash), false)
    assert.equal(await verifyPassword('anything', 'malformed'), false)
})

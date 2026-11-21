import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { exportPublicSite } from '../back/static-public.js'
import { createPublisher } from '../back/publication.js'

const editorOrigin = 'https://editor.example.test'
const story = { slug: 'public-story', title: 'A public story', excerpt: 'Public summary', body: '## Public heading\n\nPublished content.', topic: 'Development', status: 'published', version: 'v1', bodyKey: 'secret-internal-key', publishedAt: '2026-11-21T00:00:00Z', cover: '/media/abc-123.png', coverAlt: 'Public artwork' }
function memoryStore(posts = [{ ...story }]) {
    let state = {}, locked = false
    return {
        posts,
        async list() { return posts.map(({ body, ...metadata }) => ({ ...metadata })) },
        async get(slug) { return posts.find(post => post.slug === slug) },
        async media() { return { readableStreamBody: Readable.from([Buffer.from('public-image')]) } },
        async publicationState() { return { ...state } },
        async updatePublication(change) { state = { ...state, ...change } },
        async requestPublication() { state = { ...state, requestedId: String(Number(state.requestedId || 0) + 1), phase: 'pending' } },
        async lockPublication() {
            if (locked) throw Object.assign(new Error('locked'), { statusCode: 409 })
            locked = true
            return { async renew() {}, async release() { locked = false } }
        },
    }
}
async function withOutput(run) {
    const output = await mkdtemp(join(tmpdir(), 'blog-export-test-'))
    try { await run(output) }
    finally {
        assert.ok(output.startsWith(join(tmpdir(), 'blog-export-test-')))
        await rm(output, { recursive: true, force: true })
    }
}

test('Static export contains published pages and referenced images, with no editor or private data', () => withOutput(async output => {
    const store = memoryStore([{ ...story }, { ...story, slug: 'private-draft', title: 'Secret draft title', body: 'Secret draft text', status: 'draft' }, { ...story, slug: 'trashed-story', status: 'trashed' }])
    await exportPublicSite({ store, output, editorOrigin, release: 'test' })
    const files = await readdir(output, { recursive: true })
    assert.ok(files.includes(join('articles', 'public-story', 'index.html')))
    assert.ok(!files.some(path => /admin|private-draft|trashed-story/.test(path)))
    const homepage = await readFile(join(output, 'index.html'), 'utf8')
    assert.match(homepage, /data-static-public/)
    assert.match(homepage, /href="\/topics\/development#articles"/)
    assert.doesNotMatch(homepage, /Secret draft|private-draft|secret-internal-key/)
    assert.equal(await readFile(join(output, 'media/abc-123.png'), 'utf8'), 'public-image')
    const api = await readFile(join(output, 'api/posts.json'), 'utf8')
    assert.doesNotMatch(api, /bodyKey|version|Secret draft|private-draft/)
    const config = JSON.parse(await readFile(join(output, 'staticwebapp.config.json'), 'utf8'))
    assert.equal(config.routes.find(route => route.route === '/admin').redirect, editorOrigin + '/admin')
    assert.ok(!config.navigationFallback)
    store.posts[0].status = 'draft'
    await withOutput(async next => {
        await exportPublicSite({ store, output: next, editorOrigin })
        const nextFiles = await readdir(next, { recursive: true })
        assert.ok(!nextFiles.some(path => path.includes('public-story') || path.includes('abc-123')))
        assert.equal(JSON.parse(await readFile(join(next, 'api/posts.json'))).posts.length, 0)
    })
}))

test('Export rejects a changed article instead of accidentally publishing a new private draft', () => withOutput(async output => {
    const store = memoryStore()
    store.get = async () => ({ ...story, status: 'draft', body: 'Secret new draft' })
    await assert.rejects(exportPublicSite({ store, output, editorOrigin }), /changed during export/)
}))

test('Public deployment serializes replicas and follows an update arriving during deployment', async () => {
    const store = memoryStore()
    let deployments = 0, enter, finish
    const entered = new Promise(resolve => { enter = resolve })
    const hold = new Promise(resolve => { finish = resolve })
    const deploy = async output => {
        deployments++
        const html = await readFile(join(output, 'articles/public-story/index.html'), 'utf8')
        assert.match(html, deployments === 1 ? /A public story/ : /Updated title/)
        if (deployments === 1) { enter(); await hold }
    }
    const first = createPublisher({ store, deploy, editorOrigin })
    const second = createPublisher({ store, deploy, editorOrigin })
    await store.requestPublication()
    const work = first.kick()
    await entered
    store.posts[0] = { ...story, title: 'Updated title', version: 'v2' }
    await store.requestPublication()
    await second.kick()
    assert.equal(deployments, 1)
    finish()
    await work
    assert.equal(deployments, 2)
    assert.equal((await first.status()).phase, 'live')
    assert.equal((await store.publicationState()).deployedId, '2')
})

test('Failed deployments preserve the durable request, retry, and recover on a later startup', async () => {
    const store = memoryStore()
    let attempts = 0
    await store.requestPublication()
    const publisher = createPublisher({ store, editorOrigin, retryDelay: async () => {}, deploy: async () => { attempts++; throw new Error('temporary failure') } })
    await publisher.kick()
    assert.equal(attempts, 3)
    assert.equal((await publisher.status()).phase, 'failed')
    assert.equal((await store.publicationState()).requestedId, '1')
    const restarted = createPublisher({ store, editorOrigin, deploy: async () => {} })
    await restarted.kick()
    assert.equal((await restarted.status()).phase, 'live')
})

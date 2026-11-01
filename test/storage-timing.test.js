import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectStorageTiming, timeStorage } from '../back/storage-timing.js'

test('Concurrent reads isolate timing stages and preserve return values', async () => {
    const [article, listing] = await Promise.all([
        collectStorageTiming(() => timeStorage('blob', async () => { await new Promise(resolve => setTimeout(resolve, 10)); return 'article' })),
        collectStorageTiming(() => timeStorage('table', async () => 'listing')),
    ])
    assert.equal(article.value, 'article')
    assert.equal(listing.value, 'listing')
    assert.match(article.header, /blob;dur=\d+\.\d, storage;dur=\d+\.\d/)
    assert.doesNotMatch(article.header, /table/)
    assert.match(listing.header, /table;dur=\d+\.\d, storage;dur=\d+\.\d/)
    assert.doesNotMatch(listing.header, /blob/)
})

test('Timing preserves storage failures and works outside public requests', async () => {
    const failure = new Error('Storage unavailable')
    await assert.rejects(collectStorageTiming(() => timeStorage('table', async () => { throw failure })), error => error === failure)
    assert.equal(await timeStorage('table', async () => 42), 42)
})

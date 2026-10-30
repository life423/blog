// Explicit smoke test: creates one private draft and one tiny image, then removes only those test objects.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { DefaultAzureCredential } from '@azure/identity'
import { TableClient } from '@azure/data-tables'
import { BlobServiceClient } from '@azure/storage-blob'
import { createStore } from '../back/storage.js'

const account = process.env.AZURE_STORAGE_ACCOUNT
if (!account) throw new Error('Set AZURE_STORAGE_ACCOUNT before running this cloud smoke test.')
const credential = new DefaultAzureCredential()
const table = new TableClient(`https://${account}.table.core.windows.net`, 'posts', credential)
const blobs = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
const store = createStore({ account })
const slug = `storage-check-${randomUUID()}`
let image
try {
    const post = { slug, title: 'Temporary storage validation', topic: 'Development', status: 'draft', excerpt: 'Transient validation, never published.', body: 'Private validation content.', createdAt: new Date().toISOString() }
    const saved = await store.save(post)
    assert.equal((await store.get(slug)).body, post.body)
    assert.ok((await store.list()).some(post => post.slug === slug && post.status === 'draft'))
    await assert.rejects(store.save({ ...post, body: 'Stale update' }, 'invalid-version'))
    const updated = await store.save({ ...post, body: 'Updated private content.' }, saved.version)
    assert.equal(updated.body, 'Updated private content.')
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=', 'base64')
    image = await store.upload(png, 'image/png', 'png')
    const response = await store.media(image.split('/').at(-1))
    assert.equal(response.contentType, 'image/png')
    response.readableStreamBody.destroy()
    console.log('Azure smoke test passed: private draft create/read/list/update, stale-write rejection, and image upload/read.')
} finally {
    await table.deleteEntity('post', slug).catch(error => { if (error.statusCode !== 404) throw error })
    for await (const blob of blobs.getContainerClient('articles').listBlobsFlat({ prefix: `${slug}/` })) await blobs.getContainerClient('articles').getBlobClient(blob.name).deleteIfExists()
    if (image) await blobs.getContainerClient('media').getBlobClient(image.split('/').at(-1)).deleteIfExists()
    console.log('Temporary validation draft and media removed; existing articles left untouched.')
}

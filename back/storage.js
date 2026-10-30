import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { TableClient } from '@azure/data-tables'
import { BlobServiceClient } from '@azure/storage-blob'
import { DefaultAzureCredential } from '@azure/identity'

export function createStore({ account = process.env.AZURE_STORAGE_ACCOUNT, file = '.data/posts.json' } = {}) {
    if (account) return new AzureStore(account)
    if (process.env.NODE_ENV === 'production') throw new Error('Production requires AZURE_STORAGE_ACCOUNT')
    return new LocalStore(resolve(file))
}

class LocalStore {
    constructor(file) { this.file = file; this.pending = Promise.resolve() }
    async list() {
        try { return JSON.parse(await readFile(this.file, 'utf8')) }
        catch (error) { if (error.code === 'ENOENT') return []; throw error }
    }
    async get(slug) { return (await this.list()).find(post => post.slug === slug) }
    save(post, version) {
        const operation = this.pending.then(async () => {
            const posts = await this.list()
            const index = posts.findIndex(item => item.slug === post.slug)
            if ((index >= 0 && posts[index].version !== version) || (index < 0 && version)) throw conflict()
            const saved = { ...post, version: randomUUID() }
            if (index < 0) posts.push(saved); else posts[index] = saved
            await mkdir(dirname(this.file), { recursive: true })
            const temporary = `${this.file}.${randomUUID()}.tmp`
            await writeFile(temporary, JSON.stringify(posts, null, 2))
            await rename(temporary, this.file)
            return saved
        })
        this.pending = operation.catch(() => {})
        return operation
    }
}

class AzureStore {
    constructor(account) {
        const credential = new DefaultAzureCredential()
        this.table = new TableClient(`https://${account}.table.core.windows.net`, 'posts', credential)
        this.blobs = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
    }
    async list() {
        const posts = []
        for await (const entity of this.table.listEntities({ queryOptions: { filter: "PartitionKey eq 'post'" } })) {
            posts.push(this.decode(entity))
        }
        return posts
    }
    decode(entity) {
        const { partitionKey, rowKey, etag, timestamp, ...post } = entity
        return { ...post, slug: rowKey, version: etag }
    }
    async get(slug) {
        try {
            const post = this.decode(await this.table.getEntity('post', slug))
            const bytes = await this.blobs.getContainerClient('articles').getBlockBlobClient(post.bodyKey).downloadToBuffer()
            return { ...post, body: bytes.toString('utf8') }
        } catch (error) { if (error.statusCode === 404) return undefined; throw error }
    }
    async save(post, version) {
        const bodyKey = `${post.slug}/${randomUUID()}.md`
        const blob = this.blobs.getContainerClient('articles').getBlockBlobClient(bodyKey)
        await blob.uploadData(Buffer.from(post.body), { blobHTTPHeaders: { blobContentType: 'text/markdown; charset=utf-8' } })
        const { body, version: ignored, ...metadata } = post
        const entity = { ...metadata, bodyKey, partitionKey: 'post', rowKey: post.slug }
        try {
            if (version) await this.table.updateEntity(entity, 'Replace', { etag: version })
            else await this.table.createEntity(entity)
        } catch (error) {
            await blob.deleteIfExists().catch(() => {})
            if ([409, 412].includes(error.statusCode)) throw conflict()
            throw error
        }
        return this.get(post.slug)
    }
    async upload(bytes, type, extension) {
        const name = `${randomUUID()}.${extension}`
        await this.blobs.getContainerClient('media').getBlockBlobClient(name).uploadData(bytes, {
            blobHTTPHeaders: { blobContentType: type, blobCacheControl: 'public, max-age=31536000, immutable' },
        })
        return `/media/${name}`
    }
    async media(name) {
        const blob = this.blobs.getContainerClient('media').getBlockBlobClient(name)
        return blob.download()
    }
}

function conflict() { return Object.assign(new Error('This article changed in another window. Reload it before saving again; your current text is still here.'), { status: 409 }) }

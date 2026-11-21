import { cp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { home, directory, article, shell } from './views.js'
import { topics } from './content.js'

export const topicSlug = topic => topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')
export const publicFingerprint = posts => createHash('sha256').update(JSON.stringify(posts.filter(post => post.status === 'published').map(post => [post.slug, post.version]).sort())).digest('hex')

// Only public rendering output is exported. Never copy the editor or storage files.
export async function exportPublicSite({ store, output, editorOrigin, release = 'local', publicationId = '', front = fileURLToPath(new URL('../front/', import.meta.url)) }) {
    const editor = new URL(editorOrigin)
    if (!['https:', 'http:'].includes(editor.protocol)) throw new Error('Invalid editor origin')
    const metadata = (await store.list()).filter(post => post.status === 'published').sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    const fingerprint = publicFingerprint(metadata)
    const posts = []
    for (const item of metadata) {
        const post = await store.get(item.slug)
        if (!post || post.status !== 'published' || post.version !== item.version) throw new Error('Public content changed during export; retrying')
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw new Error('Invalid public article slug')
        posts.push(post)
    }
    await mkdir(output, { recursive: true })
    for (const folder of ['style', 'assets']) await cp(join(front, folder), join(output, folder), { recursive: true, filter: source => !source.endsWith('admin.css') })
    await cp(join(front, 'js'), join(output, 'js'), { recursive: true, filter: source => !source.endsWith('admin.js') })
    const media = new Set()
    async function page(path, html) {
        html = html.replace('<html lang="en"', '<html lang="en" data-static-public')
        for (const topic of topics) {
            const query = encodeURIComponent(topic)
            html = html.replaceAll(`href="/?topic=${query}#articles"`, `href="/topics/${topicSlug(topic)}#articles"`)
                .replaceAll(`href="/articles?topic=${query}#articles"`, `href="/articles/topics/${topicSlug(topic)}#articles"`)
        }
        for (const match of html.matchAll(/(?:src|href)="(\/media\/[a-f0-9-]+\.(?:png|jpg|webp))"/g)) media.add(match[1])
        await mkdir(join(output, path, '..'), { recursive: true })
        await writeFile(join(output, path), html)
    }
    await page('index.html', home(posts))
    await page('articles/index.html', directory(posts))
    for (const topic of topics) {
        const filtered = posts.filter(post => post.topic === topic)
        await page(`topics/${topicSlug(topic)}/index.html`, home(filtered, { topic }))
        await page(`articles/topics/${topicSlug(topic)}/index.html`, directory(filtered, { topic }))
    }
    for (const post of posts) await page(`articles/${post.slug}/index.html`, article(post))
    await page('404.html', shell('<section class="content-width empty-state"><h1>Article not found.</h1><p>It may be a draft or the address may have changed.</p><a class="read-link" href="/">Back to the journal →</a></section>'))
    for (const path of media) {
        const image = await store.media(path.split('/').at(-1))
        const chunks = []
        for await (const chunk of image.readableStreamBody) chunks.push(Buffer.from(chunk))
        const bytes = Buffer.concat(chunks)
        await mkdir(join(output, 'media'), { recursive: true })
        await writeFile(join(output, path.slice(1)), bytes)
    }
    await mkdir(join(output, 'api'), { recursive: true })
    // Explicit allowlist: no draft metadata, ETags, body keys or article Markdown.
    const listing = posts.map(({ slug, title, excerpt, topic, cover, coverAlt, minutes, publishedAt }) => ({ slug, title, excerpt, topic, cover, coverAlt, minutes, publishedAt }))
    await writeFile(join(output, 'api/posts.json'), JSON.stringify({ posts: listing, sample: false }))
    await writeFile(join(output, 'deployment.json'), JSON.stringify({ release, publicationId, generatedAt: new Date().toISOString(), articles: posts.length }))
    await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin\n')
    await writeFile(join(output, 'staticwebapp.config.json'), JSON.stringify({
        routes: [
            { route: '/admin', redirect: `${editor.origin}/admin`, statusCode: 302 },
            { route: '/admin/*', redirect: `${editor.origin}/admin`, statusCode: 302 },
            { route: '/admin.html', redirect: `${editor.origin}/admin`, statusCode: 302 },
            { route: '/api/posts', rewrite: '/api/posts.json' },
            { route: '/media/*', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
        ],
        responseOverrides: { 404: { rewrite: '/404.html' } },
        globalHeaders: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
            'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        },
    }, null, 2))
    if (publicFingerprint(await store.list()) !== fingerprint) throw new Error('Public content changed during export; retrying')
    return { fingerprint, articles: posts.length }
}

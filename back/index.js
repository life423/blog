import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createStore } from './storage.js'
import { verifyPassword } from './auth.js'
import { examples, escape, markdown, topics, validatePost } from './content.js'
import { home, article, directory, shell } from './views.js'

export function createApp({ store = createStore(), preview = process.env.DESIGN_PREVIEW === 'true', credentials = { username: process.env.ADMIN_USERNAME, hash: process.env.ADMIN_PASSWORD_HASH } } = {}) {
    const app = express()
    const passwordLogin = Boolean(credentials.username && credentials.hash)
    if (process.env.NODE_ENV === 'production' && passwordLogin && !process.env.ADMIN_SESSION_SECRET) throw new Error('Production password login requires ADMIN_SESSION_SECRET')
    const secret = process.env.ADMIN_SESSION_SECRET || randomBytes(32)
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
    app.disable('x-powered-by')
    app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'https:', 'data:'], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"], upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } }, strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false }))
    app.use(express.json({ limit: '300kb' }))
    app.use('/api/admin', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

    const sign = value => createHmac('sha256', secret).update(value).digest('hex')
    function isAdmin(req) {
        if (passwordLogin) {
            const value = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith('blog-session='))?.slice(13)
            if (value) {
                const [expires, signature] = value.split('.')
                const expected = sign(expires)
                if (/^[a-f0-9]{64}$/.test(signature || '') && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && Number(expires) > Date.now()) return true
            }
        }
        // Enable only behind Container Apps Easy Auth; never expose this process directly.
        if (process.env.TRUST_AZURE_AUTH !== 'true' || !process.env.ADMIN_OBJECT_ID) return false
        return req.get('x-ms-client-principal-idp') === 'aad' && req.get('x-ms-client-principal-id') === process.env.ADMIN_OBJECT_ID
    }
    function requireAdmin(req, res, next) { if (!isAdmin(req)) return res.status(401).json({ error: 'Sign in with the administrator account to continue.' }); next() }
    function requireCurrentVersion(post, version) {
        if (post ? post.version !== version : Boolean(version)) {
            throw Object.assign(new Error('This article changed in another window. Reload it before saving again; your current text is still here.'), { status: 409 })
        }
    }
    app.use('/api', (req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
        const origin = process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`
        if (req.get('origin') !== origin || req.get('x-blog-request') !== '1') return res.status(403).json({ error: 'This request must come from the blog editor.' })
        next()
    })
    app.get('/api/admin/session', (req, res) => res.json({ authenticated: isAdmin(req), passwordLogin, storage: process.env.AZURE_STORAGE_ACCOUNT ? 'azure' : 'local', loginUrl: process.env.TRUST_AZURE_AUTH === 'true' ? '/.auth/login/aad?post_login_redirect_uri=/admin' : null }))
    app.post('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait 15 minutes before trying again.' } }), async (req, res) => {
        if (!passwordLogin) return res.status(503).json({ error: 'Administrator sign-in is not configured for this environment.' })
        const passwordMatches = await verifyPassword(req.body?.password, credentials.hash)
        if (req.body?.username !== credentials.username || !passwordMatches) return res.status(401).json({ error: 'The username or password is incorrect.' })
        const expires = String(Date.now() + 8 * 60 * 60 * 1000)
        res.cookie('blog-session', `${expires}.${sign(expires)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000, path: '/' }).json({ ok: true })
    })
    app.post('/api/admin/logout', (_req, res) => res.clearCookie('blog-session', { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }).json({ ok: true }))

    async function publicPosts() {
        const posts = (await store.list()).filter(post => post.status === 'published').sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
        return posts.length ? { posts, sample: false } : { posts: preview ? examples : [], sample: preview }
    }
    app.get('/health', (_req, res) => res.json({ status: 'ok' }))
    app.get('/index.html', (_req, res) => res.redirect(308, '/'))
    app.get('/', async (req, res) => {
        const { posts, sample } = await publicPosts()
        const topic = topics.includes(req.query.topic) ? req.query.topic : ''
        res.send(home(topic ? posts.filter(post => post.topic === topic) : posts, { topic, sample }))
    })
    app.get('/articles', async (req, res) => {
        const { posts, sample } = await publicPosts()
        const topic = topics.includes(req.query.topic) ? req.query.topic : ''
        res.send(directory(topic ? posts.filter(post => post.topic === topic) : posts, { topic, sample }))
    })
    app.get('/articles/:slug', async (req, res) => {
        let post = await store.get(req.params.slug)
        let sample = false
        if (!post && preview) { post = examples.find(item => item.slug === req.params.slug); sample = Boolean(post) }
        if (!post || post.status !== 'published' && !sample) return res.status(404).send(shell('<section class="content-width empty-state"><h1>Article not found.</h1><p>It may be a draft or the address may have changed.</p><a class="read-link" href="/">Back to the journal →</a></section>'))
        res.send(article(post, { sample }))
    })
    app.get('/api/posts', async (_req, res) => { const { posts, sample } = await publicPosts(); res.json({ posts: posts.map(({ body, bodyKey, version, ...post }) => post), sample }) })
    app.get('/api/admin/posts', requireAdmin, async (_req, res) => res.json(await store.list()))
    app.get('/api/admin/posts/:slug', requireAdmin, async (req, res) => { const post = await store.get(req.params.slug); if (!post) return res.sendStatus(404); res.json(post) })
    app.put('/api/admin/posts/:slug', requireAdmin, async (req, res) => {
        const post = validatePost(req.body)
        if (post.slug !== req.params.slug) return res.status(400).json({ error: 'The article URL does not match its slug.' })
        const previous = await store.get(post.slug)
        if (previous?.status === 'trashed') return res.status(409).json({ error: 'Restore this article from Trash before editing it.' })
        requireCurrentVersion(previous, req.body.version)
        const now = new Date().toISOString()
        const saved = await store.save({ ...post, createdAt: previous?.createdAt || now, updatedAt: now, publishedAt: post.status === 'published' ? previous?.publishedAt || now : previous?.publishedAt || '', minutes: Math.max(1, Math.ceil(post.body.split(/\s+/).length / 220)) }, req.body.version || undefined)
        res.json(saved)
    })
    app.delete('/api/admin/posts/:slug', requireAdmin, async (req, res) => {
        const post = await store.get(req.params.slug)
        if (!post) return res.sendStatus(404)
        requireCurrentVersion(post, req.body.version)
        const now = new Date().toISOString()
        res.json(await store.save({ ...post, status: 'trashed', deletedAt: now, updatedAt: now }, req.body.version || 'missing-version'))
    })
    app.post('/api/admin/posts/:slug/restore', requireAdmin, async (req, res) => {
        const post = await store.get(req.params.slug)
        if (!post) return res.sendStatus(404)
        if (post.status !== 'trashed') return res.status(409).json({ error: 'This article is not in Trash. Refresh the article list.' })
        requireCurrentVersion(post, req.body.version)
        res.json(await store.save({ ...post, status: 'draft', deletedAt: '', updatedAt: new Date().toISOString() }, req.body.version || 'missing-version'))
    })
    app.post('/api/admin/preview', requireAdmin, (req, res) => res.json({ html: markdown(String(req.body.body || '').slice(0, 200000)) }))
    app.get('/admin/preview/:slug', requireAdmin, async (req, res) => { res.set('Cache-Control', 'no-store'); const post = await store.get(req.params.slug); if (!post) return res.sendStatus(404); res.send(article(post, { preview: true })) })
    app.post('/api/admin/media', requireAdmin, upload.single('image'), async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'Choose a PNG, JPEG or WebP image.' })
        const bytes = req.file.buffer
        const formats = [
            [bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png', 'png'],
            [bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, 'image/jpeg', 'jpg'],
            [bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP', 'image/webp', 'webp'],
        ]
        const format = formats.find(([valid]) => valid)
        if (!format) return res.status(400).json({ error: 'Upload a valid PNG, JPEG or WebP image (up to 5 MB).' })
        if (!store.upload) return res.status(503).json({ error: 'Image uploads need Azure storage. Your article text is safe; continue without a cover for now.' })
        res.json({ url: await store.upload(bytes, format[1], format[2]) })
    })
    app.get('/media/:name', async (req, res) => {
        if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(req.params.name) || !store.media) return res.sendStatus(404)
        try {
            const image = await store.media(req.params.name)
            res.set('Content-Type', image.contentType).set('Cache-Control', 'public, max-age=31536000, immutable')
            image.readableStreamBody.on('error', () => res.destroy()).pipe(res)
        } catch (error) { if (error.statusCode === 404) return res.sendStatus(404); throw error }
    })
    const front = fileURLToPath(new URL('../front/', import.meta.url))
    app.get('/admin', (_req, res) => res.set('Cache-Control', 'no-store').sendFile(resolve(front, 'admin.html')))
    app.use(express.static(front, { index: false, dotfiles: 'deny', maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }))
    app.use((_req, res) => res.status(404).send(shell('<section class="content-width empty-state"><h1>Nothing here yet.</h1><a class="read-link" href="/">Back to the journal →</a></section>')))
    app.use((error, req, res, _next) => {
        const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
        if (status >= 500) console.error('Request failed:', error.code || error.name)
        const message = status >= 500 ? 'Storage is temporarily unavailable. Please retry; unsaved editor text stays in this window.' : error.code === 'LIMIT_FILE_SIZE' ? 'Choose an image smaller than 5 MB.' : error.message
        if (req.path.startsWith('/api/')) res.status(status).json({ error: message })
        else res.status(status).send(shell(`<section class="content-width empty-state"><h1>We couldn’t load this page.</h1><p>${escape(message)}</p><a class="read-link" href="/">Try the journal again →</a></section>`))
    })
    return app
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const port = Number(process.env.PORT || 3188)
    createApp().listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.log(`Beyond the Stack: http://127.0.0.1:${port}`))
}

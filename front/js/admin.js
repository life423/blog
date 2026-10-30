const $ = selector => document.querySelector(selector)
const editor = $('#editor')
const errorBox = $('#editor-error')
let current = null
let cover = ''
let dirty = false
let busy = false
let cloudLogin = false
let listFilter = 'articles'

async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { 'x-blog-request': '1', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}). Please retry.`)
    return data
}
function showError(element, message) { element.textContent = message; element.hidden = false }
function markDirty() { dirty = true; $('#save-status').textContent = 'Unsaved changes' }
editor.addEventListener('input', markDirty)
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = '' } })
$('#title').addEventListener('input', () => { if (!current) $('#slug').value = $('#title').value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) })

function setBusy(value) {
    busy = value
    for (const control of document.querySelectorAll('#editor button, #new-post, #logout, #reload-list, #post-list button, #image, #restore-post, .list-filters button')) control.disabled = value
}
function reset(post = null) {
    current = post
    cover = post?.cover || ''
    editor.reset()
    for (const key of ['title', 'slug', 'excerpt', 'body', 'topic', 'coverAlt']) if (post?.[key]) $(`#${key}`).value = post[key]
    $('#slug').readOnly = Boolean(post)
    $('#post-status').textContent = post?.status === 'published' ? 'Published' : post ? 'Draft' : 'New draft'
    $('#save-status').textContent = post ? 'Saved' : 'Not saved'
    $('#publish').textContent = post?.status === 'published' ? 'Update published article →' : 'Publish article →'
    $('#save-draft').textContent = post?.status === 'published' ? 'Unpublish & save draft' : 'Save draft'
    errorBox.hidden = true
    dirty = false
    const trashed = post?.status === 'trashed'
    editor.hidden = trashed
    $('#trash-panel').hidden = !trashed
    $('#trash-title').textContent = trashed ? post.title : ''
    $('#trash-post').hidden = !post || trashed
    updateCover()
}
function updateCover() {
    $('#cover-preview').hidden = !cover
    $('#remove-cover').hidden = !cover
    if (cover) $('#cover-preview').src = cover
    else $('#cover-preview').removeAttribute('src')
}
async function loadList() {
    const allPosts = await request('/api/admin/posts')
    const posts = allPosts.filter(post => listFilter === 'trash' ? post.status === 'trashed' : post.status !== 'trashed')
    $('#show-articles').setAttribute('aria-pressed', String(listFilter === 'articles'))
    $('#show-trash').setAttribute('aria-pressed', String(listFilter === 'trash'))
    const list = $('#post-list')
    list.replaceChildren()
    $('#list-empty').hidden = posts.length > 0
    $('#list-empty').textContent = listFilter === 'trash' ? 'Trash is empty.' : 'No articles yet. Start with a draft.'
    for (const post of posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
        const item = document.createElement('li')
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = post.title
        if (current?.slug === post.slug) button.setAttribute('aria-current', 'true')
        const detail = document.createElement('small')
        detail.textContent = `${post.status === 'published' ? 'Published' : post.status === 'trashed' ? 'In trash' : 'Draft'} · ${post.topic}`
        button.append(detail)
        button.addEventListener('click', async () => {
            if (busy || dirty && !confirm('Discard the unsaved changes in this editor?')) return
            try { reset(await request(`/api/admin/posts/${post.slug}`)); await loadList(); $('#title').focus() }
            catch (error) { showError(errorBox, error.message) }
        })
        item.append(button)
        list.append(item)
    }
}
async function save(status) {
    if (busy) return
    errorBox.hidden = true
    if (!editor.reportValidity()) return
    if (cover && !$('#coverAlt').value.trim()) { showError(errorBox, 'Add a description for the cover image.'); $('#coverAlt').focus(); return }
    if (status === 'draft' && current?.status === 'published' && !confirm('Unpublish this article? It will remain saved as a private draft.')) return
    const data = Object.fromEntries(new FormData(editor))
    const payload = { ...data, slug: $('#slug').value, status, cover, version: current?.version }
    setBusy(true)
    $('#save-status').textContent = 'Saving…'
    try {
        const saved = await request(`/api/admin/posts/${encodeURIComponent(payload.slug)}`, { method: 'PUT', body: JSON.stringify(payload) })
        // Leave any text typed while the request was in flight intact.
        const editedDuringSave = ['title', 'excerpt', 'body', 'topic', 'coverAlt'].some(key => $(`#${key}`).value !== payload[key])
        current = saved
        if (!editedDuringSave) reset(saved)
        else { dirty = true; $('#save-status').textContent = 'Saved earlier changes · newer edits unsaved' }
        try { await loadList() }
        catch (error) { showError(errorBox, `Article saved, but the list could not refresh. ${error.message}`) }
    } catch (error) { $('#save-status').textContent = 'Not saved'; showError(errorBox, error.message) }
    finally { setBusy(false) }
}
editor.addEventListener('submit', event => { event.preventDefault(); save('draft') })
$('#publish').addEventListener('click', () => save('published'))
$('#new-post').addEventListener('click', () => { if (dirty && !confirm('Discard unsaved changes and start a new article?')) return; listFilter = 'articles'; reset(); loadList().catch(error => showError(errorBox, error.message)); $('#title').focus() })
for (const filter of ['articles', 'trash']) $(`#show-${filter}`).addEventListener('click', () => { listFilter = filter; loadList().catch(error => showError($('#page-error'), error.message)) })
$('#trash-post').addEventListener('click', async () => {
    if (!current || busy) return
    if (dirty && !confirm('Discard unsaved changes and move the saved article to recoverable Trash?')) return
    setBusy(true)
    $('#save-status').textContent = 'Moving to trash…'
    try {
        const post = await request(`/api/admin/posts/${current.slug}`, { method: 'DELETE', body: JSON.stringify({ version: current.version }) })
        listFilter = 'trash'
        reset(post)
        await loadList()
        setBusy(false)
        $('#restore-post').focus()
    } catch (error) { showError($('#page-error'), error.message) }
    finally { setBusy(false) }
})
$('#restore-post').addEventListener('click', async () => {
    if (!current || busy) return
    setBusy(true)
    $('#restore-post').textContent = 'Restoring…'
    try {
        const post = await request(`/api/admin/posts/${current.slug}/restore`, { method: 'POST', body: JSON.stringify({ version: current.version }) })
        listFilter = 'articles'
        reset(post)
        await loadList()
        setBusy(false)
        $('#title').focus()
    } catch (error) { showError($('#page-error'), error.message) }
    finally { setBusy(false); $('#restore-post').textContent = 'Restore as draft' }
})
$('#reload-list').addEventListener('click', () => loadList().catch(error => showError(errorBox, error.message)))
$('#preview-button').addEventListener('click', async () => {
    try {
        const data = await request('/api/admin/preview', { method: 'POST', body: JSON.stringify({ body: $('#body').value }) })
        const content = $('#preview-content')
        content.replaceChildren()
        const title = document.createElement('h1')
        title.textContent = $('#title').value || 'Untitled article'
        const body = document.createElement('div')
        body.innerHTML = data.html // Sanitized by the server; raw Markdown HTML is never trusted.
        content.append(title, body)
        $('#preview-dialog').showModal()
        $('#close-preview').focus()
    } catch (error) { showError(errorBox, error.message) }
})
$('#close-preview').addEventListener('click', () => $('#preview-dialog').close())
$('#preview-dialog').addEventListener('close', () => $('#preview-button').focus())
$('#image').addEventListener('change', async () => {
    const image = $('#image').files[0]
    if (!image) return
    if (image.size > 5 * 1024 * 1024) { $('#upload-status').textContent = 'Choose an image smaller than 5 MB.'; return }
    const data = new FormData()
    data.append('image', image)
    setBusy(true)
    $('#upload-status').textContent = 'Uploading…'
    try { const result = await request('/api/admin/media', { method: 'POST', body: data }); cover = result.url; updateCover(); markDirty(); $('#upload-status').textContent = 'Uploaded. Save the article to keep this cover.' }
    catch (error) { $('#upload-status').textContent = error.message }
    finally { setBusy(false) }
})
$('#remove-cover').addEventListener('click', () => { cover = ''; updateCover(); markDirty() })
$('#login-form').addEventListener('submit', async event => {
    event.preventDefault()
    $('#login-error').hidden = true
    $('#sign-in').disabled = true
    $('#sign-in').textContent = 'Signing in…'
    try {
        await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value }) })
        $('#password').value = ''
        await init()
        $('#new-post').focus()
    } catch (error) { showError($('#login-error'), error.message) }
    finally { $('#sign-in').disabled = false; $('#sign-in').textContent = 'Sign in →' }
})
$('#logout').addEventListener('click', async () => {
    if (dirty && !confirm('Sign out and discard unsaved changes?')) return
    try { await request('/api/admin/logout', { method: 'POST' }); dirty = false; if (cloudLogin) location.href = '/.auth/logout?post_logout_redirect_uri=/'; else location.reload() }
    catch (error) { showError(errorBox, error.message) }
})
async function init() {
    const session = await request('/api/admin/session')
    cloudLogin = Boolean(session.loginUrl)
    $('#login').hidden = session.authenticated
    $('#workspace').hidden = !session.authenticated
    $('#cloud-login').hidden = !session.loginUrl
    if (session.loginUrl) $('#cloud-login').href = session.loginUrl
    $('#login-form').hidden = !session.passwordLogin
    $('#login-description').textContent = session.passwordLogin ? 'Private access for the journal administrator.' : session.loginUrl ? 'Sign in with the configured administrator account.' : 'Administrator sign-in has not been configured for this environment.'
    $('#storage-note').textContent = session.storage === 'azure' ? 'Connected to Azure storage.' : 'Local preview · drafts stay on this computer.'
    if (session.authenticated) { reset(); await loadList() }
}
init().catch(error => showError($('#page-error'), error.message))

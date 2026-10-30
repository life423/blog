import test from 'node:test'
import assert from 'node:assert/strict'
import { home, article, directory } from '../back/views.js'

const posts = ['first-story', 'second-story', 'third-story'].map(slug => ({
    slug, title: slug, excerpt: 'A project note.', body: '## The details\n\nA useful explanation.',
    topic: 'Development', art: 'code',
}))
const names = html => [...html.matchAll(/data-transition-name="([a-z0-9-]+)"/g)].map(match => match[1])

test('Each story has one unique snapshot name, shared across cards and article heroes', () => {
    const homepage = names(home(posts))
    const listing = names(directory(posts))
    assert.equal(homepage.length, posts.length)
    assert.equal(new Set(homepage).size, posts.length)
    assert.deepEqual(listing, homepage)
    posts.forEach((post, index) => assert.deepEqual(names(article(post)), [homepage[index]]))
})

test('Snapshot identifiers stay CSS-safe and do not depend on cover image URLs', () => {
    const post = { ...posts[0], slug: 'quote"-and-ünicode' }
    const before = names(article(post))
    const after = names(article({ ...post, cover: '/media/123.png', coverAlt: 'Cover' }))
    assert.deepEqual(after, before)
    assert.match(before[0], /^story-[a-f0-9]+$/)
})

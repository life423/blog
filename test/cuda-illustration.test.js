import test from 'node:test'
import assert from 'node:assert/strict'
import { cudaIllustration } from '../back/cuda-illustration.js'
import { home, article } from '../back/views.js'

test('Trusted CUDA artwork namespaces its SVG references per story', () => {
    for (const id of ['story-one', 'story-two']) {
        const svg = cudaIllustration(id)
        assert.ok(svg.includes(`id="${id}-grid"`))
        assert.ok(svg.includes(`url(#${id}-grid)`))
        assert.match(svg, /role="img" aria-label="Illustrative CUDA trajectory/)
        assert.doesNotMatch(svg, /<script|<foreignObject|onload=/i)
    }
})

test('CUDA card and hero retain the same shared-element identity; other covers remain images', () => {
    const post = { slug: 'learning-with-cuda', title: 'CUDA', topic: 'AI & Experiments', body: '## Details\n\nAn experiment.', excerpt: 'A note.', cover: '/media/cover.png' }
    const card = home([post])
    const hero = article(post)
    const identity = html => html.match(/data-transition-name="([^"]+)"/)[1]
    assert.equal(identity(card), identity(hero))
    assert.match(card, /class="cuda-illustration"/)
    assert.match(hero, /class="cuda-illustration"/)
    assert.match(article({ ...post, slug: 'another-story' }), /src="\/media\/cover.png"/)
})

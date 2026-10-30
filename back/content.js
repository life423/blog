import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

export const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

export function markdown(body) {
    return sanitizeHtml(marked.parse(body || ''), {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2'],
        allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'], code: ['class'] },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }), h1: 'h2' },
    })
}

export const topics = ['Development', 'DevOps', 'AI & Experiments']

export function validatePost(input) {
    const slug = String(input.slug || '').trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw invalid('Use a URL slug with lowercase letters, numbers and hyphens (up to 100 characters).')
    const title = String(input.title || '').trim()
    const excerpt = String(input.excerpt || '').trim()
    const body = String(input.body || '')
    if (!title || title.length > 160) throw invalid('Add a title of 1–160 characters.')
    if (!excerpt || excerpt.length > 360) throw invalid('Add a summary of 1–360 characters.')
    if (!body.trim() || Buffer.byteLength(body) > 200000) throw invalid('Add article content (up to 200 KB).')
    if (!topics.includes(input.topic)) throw invalid('Choose one of the three article topics.')
    if (!['draft', 'published'].includes(input.status)) throw invalid('Choose Draft or Published.')
    const cover = String(input.cover || '')
    if (cover && !/^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(cover)) throw invalid('Choose a cover uploaded through this editor.')
    return { slug, title, excerpt, body, topic: input.topic, status: input.status, cover, coverAlt: String(input.coverAlt || '').slice(0, 240) }
}

function invalid(message) { return Object.assign(new Error(message), { status: 400 }) }

// Explicit design-preview content. Never inserted into Azure or published automatically.
export const examples = [
    { slug: 'learning-with-cuda', topic: 'AI & Experiments', title: 'Learning to swim with C++ and CUDA', excerpt: 'A look at simulation, feedback, and iteration through the CudaRL-Arena project.', minutes: 3, art: 'simulation', body: '# Learning through experiments\n\nThis is a sample article for the blog design preview, not a published project report.\n\n## Start with the question\n\nCudaRL-Arena brings reinforcement-learning environments written in C++ and CUDA into Godot. A future write-up can explain the decisions behind that experiment, backed by actual project evidence.\n\n> Key insight: measure the behavior before changing the system.\n\n## Make the loop visible\n\nDescribe what the simulation observes, what the agent can change, and how you evaluate progress. Keep claims tied to recorded experiments.\n\n```js\nconst experiment = { observe: true, measure: true };\nconsole.log(experiment);\n```\n\n## Keep learning\n\nShare the failures, trade-offs, and next questions alongside the results.\n\n[Explore the repository](https://github.com/life423/CudaRL-Arena)' },
    { slug: 'commit-to-container', topic: 'DevOps', title: 'From commit to container on Azure', excerpt: 'The moving parts behind building, containerizing, and deploying a web application.', minutes: 2, art: 'pipeline', body: '# From commit to container\n\nThis is sample content for the design preview.\n\n## A small deployment pipeline\n\nA commit starts a build. A versioned container gives a deployment a traceable artifact. Health checks tell us whether the new version is ready.\n\n## Keep the feedback useful\n\nCapture failures where they happen, preserve the last working version, and make rollback a deliberate part of the workflow.\n\n> Key insight: a successful build is only one part of a successful release.' },
    { slug: 'portfolio-code-search', topic: 'Development', title: 'A portfolio that explains its own code', excerpt: 'Connecting a full-stack portfolio to searchable source code and useful explanations.', minutes: 2, art: 'code', body: '# A portfolio connected to its source\n\nThis is sample content for the design preview.\n\n## Start with useful questions\n\nThe portfolio combines React, Express, MongoDB, and a code-aware chat. A future article can explain how repository indexing and retrieval support those answers.\n\n## Show the evidence\n\nLink explanations to relevant code so readers can follow the implementation themselves.\n\n[See the source](https://github.com/life423/drewclark.io-portfolio)' },
]

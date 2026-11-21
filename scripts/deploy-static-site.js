// Explicit CLI bootstrap/recovery. Normal editor changes and CI use the backend.
import { createStore } from '../back/storage.js'
import { createPublisher } from '../back/publication.js'
const publisher = createPublisher({ store: createStore() })
if (!publisher) throw new Error('Static publishing is not configured')
await publisher.request()
await publisher.kick()
const state = await publisher.status()
if (state.phase !== 'live') throw new Error(`Static publication ${state.phase}`)
console.log(`Static public site deployed: ${state.siteUrl}`)

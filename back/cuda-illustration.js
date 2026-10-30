import { readFileSync } from 'node:fs'

// Trusted project artwork only; article Markdown and uploaded SVGs are never inlined.
const illustration = readFileSync(new URL('../front/assets/illustrations/simulation.svg', import.meta.url), 'utf8')

export function cudaIllustration(id) {
    return illustration
        .replace('<svg ', '<svg class="cuda-illustration" role="img" aria-label="Illustrative CUDA trajectory: paths connect nodes as a geometric agent travels toward a target. Not recorded simulation data." ')
        .replace('id="grid"', `id="${id}-grid"`)
        .replace('url(#grid)', `url(#${id}-grid)`)
}

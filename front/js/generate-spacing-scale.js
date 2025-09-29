export function generateSpacingScale({
    basePx = 16,
    ratio = 1.5,
    steps = { min: -2, max: 6 },
    rootPx = 16,
    name = 'space',
    breakpoints = [
        { minWidth: 768, ratio: 1.414 },
        { minWidth: 1200, ratio: 1.333 },
    ],
    precision = 3,
} = {}) {
    const { min, max } = steps
    const stepCount = max - min + 1
    const factor = Math.pow(10, precision)
    const round = v => Math.round(v * factor) / factor
    const pxToRem = px => round(px / rootPx)

    const stepRange = Array.from({ length: stepCount }, (_, i) => min + i)

    const computeSizes = r => {
        const sizes = {}
        let sizePx = basePx * Math.pow(r, min)
        for (let i = 0; i < stepCount; i++) {
            const s = stepRange[i]
            sizes[s] = `${pxToRem(sizePx)}rem`
            sizePx *= r
        }
        return sizes
    }

    const cssLines = []

    cssLines.push(`:root{`, `  `)
    const baseSizes = computeSizes(ratio)
    for (let i = 0; i < stepCount; i++) {
        const s = stepRange[i]
        cssLines.push(`  --${name}-${s}: ${baseSizes[s]};`)
    }
    cssLines.push(`}`, ``)

    for (let i = 0; i < breakpoints.length; i++) {
        const bp = breakpoints[i]
        const r = (bp && bp.ratio) || ratio
        const sizes = computeSizes(r)
        cssLines.push(`@media (min-width: ${bp.minWidth}px) {`, `  :root{`)
        cssLines.push(`    `)
        for (let j = 0; j < stepCount; j++) {
            const s = stepRange[j]
            cssLines.push(`    --${name}-${s}: ${sizes[s]};`)
        }
        cssLines.push(`  }`, `}`, ``)
    }

    cssLines.push(``)

    for (let i = 0; i < stepCount; i++) {
        const s = stepRange[i]
        cssLines.push(
            `.m-${s} { margin: var(--${name}-${s}); }`,
            `.mt-${s} { margin-top: var(--${name}-${s}); }`,
            `.mb-${s} { margin-bottom: var(--${name}-${s}); }`
        )
        cssLines.push(`.p-${s} { padding: var(--${name}-${s}); }`)
        cssLines.push(`.gap-${s} { gap: var(--${name}-${s}); }`)
    }

    cssLines.push(
        ``,
        ``,
        `h1, h2, h3, h4, h5, h6 { margin-top: var(--${name}-3); margin-bottom: 0; }`,
        `h1:first-child, h2:first-child, h3:first-child, h4:first-child { margin-top: 0; }`,
        `p { margin-top: 0; margin-bottom: var(--${name}-2); }`,
        `p:last-child { margin-bottom: 0; }`,
        `section { margin-bottom: var(--${name}-5); }`,
        `article { margin-bottom: var(--${name}-4); }`
    )

    const css = cssLines.join('\n')

    const id = `spacing-scale-${name}`
    let tag = document.getElementById(id)
    if (!tag) {
        tag = document.createElement('style')
        tag.id = id
        document.head.appendChild(tag)
    }
    tag.textContent = css

    return css
}

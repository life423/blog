export function generateTypeScale({
    basePx = 16,
    ratio = 1.25,
    steps = { min: -2, max: 4 },
    rootPx = 16,
    name = 'ms',
    breakpoints = [
        { minWidth: 768, ratio: 1.333 },
        { minWidth: 1200, ratio: 1.414 },
    ],
    precision = 3,
} = {}) {
    const round = v =>
        Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision)

    const pxToRem = px => round(px / rootPx)

    const compute = r => {
        const out = {}
        for (let s = steps.min; s <= steps.max; s++) {
            const sizePx = basePx * Math.pow(r, s)
            out[s] = `${pxToRem(sizePx)}rem`
        }
        return out
    }

    let css = `:root{\n  \n`
    const baseSizes = compute(ratio)
    for (let s = steps.min; s <= steps.max; s++) {
        css += `  --${name}-step-${s}: ${baseSizes[s]};\n`
    }
    css += `}\n\n`

    for (const bp of breakpoints) {
        const sizes = compute(bp.ratio ?? ratio)
        css += `@media (min-width: ${bp.minWidth}px) {\n  :root{\n`
        css += `    \n`
        for (let s = steps.min; s <= steps.max; s++) {
            css += `    --${name}-step-${s}: ${sizes[s]};\n`
        }
        css += `  }\n}\n\n`
    }

    const id = `modular-scale-${name}`
    let tag = document.getElementById(id)
    if (!tag) {
        tag = document.createElement('style')
        tag.id = id
        document.head.appendChild(tag)
    }
    tag.textContent = css
    return css
}

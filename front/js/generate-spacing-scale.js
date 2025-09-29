const BREAKPOINT = 768;

export function generateSpacingScale({
    basePx = 8,
    ratio = 1.5,
    steps = { min: -2, max: 6 },
    rootPx = 16,
    name = 'space',
    minViewport = 320,
    maxViewport = 1200,
    precision = 3,
} = {}) {
    if (typeof document === 'undefined') return '';
    
    const { min, max } = steps;
    const stepCount = max - min + 1;
    const round = v => Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision);
    const pxToRem = px => round(px / rootPx);

    const stepRange = Array.from({ length: stepCount }, (_, i) => min + i);
    
    // Calculate min and max ratios for fluid scaling
    const minRatio = ratio * 0.8;  // Smaller on mobile
    const maxRatio = ratio * 1.2;  // Larger on desktop
    
    const css = [];
    
    // Generate CSS custom properties with clamp()
    css.push(':root {');
    for (let i = 0; i < stepCount; i++) {
        const s = stepRange[i];
        
        // Calculate sizes at min and max viewports
        const minSize = basePx * Math.pow(minRatio, s);
        const maxSize = basePx * Math.pow(maxRatio, s);
        
        const minRem = pxToRem(minSize);
        const maxRem = pxToRem(maxSize);
        
        // Calculate viewport coefficient for fluid scaling
        const vwCoeff = round((maxSize - minSize) / (maxViewport - minViewport) * 100);
        const baseRem = round(minRem - (minViewport * vwCoeff / 100 / rootPx));
        
        css.push(`  --${name}-${s}: clamp(${minRem}rem, ${baseRem}rem + ${vwCoeff}vw, ${maxRem}rem);`);
    }
    css.push('}', '');

    // Generate utility classes
    for (let i = 0; i < stepCount; i++) {
        const s = stepRange[i];
        css.push(
            `.m-${s} { margin: var(--${name}-${s}); }`,
            `.mt-${s} { margin-top: var(--${name}-${s}); }`,
            `.mb-${s} { margin-bottom: var(--${name}-${s}); }`,
            `.p-${s} { padding: var(--${name}-${s}); }`,
            `.gap-${s} { gap: var(--${name}-${s}); }`
        );
    }

    css.push(
        '',
        `h1, h2, h3, h4, h5, h6 { margin-top: var(--${name}-3); margin-bottom: 0; }`,
        `h1:first-child, h2:first-child, h3:first-child, h4:first-child { margin-top: 0; }`,
        `p { margin-top: 0; margin-bottom: var(--${name}-2); }`,
        `p:last-child { margin-bottom: 0; }`,
        `section { margin-bottom: var(--${name}-5); }`,
        `article { margin-bottom: var(--${name}-4); }`
    );

    const cssString = css.join('\n');

    const id = `spacing-scale-${name}`;
    let tag = document.getElementById(id);
    if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
    }
    tag.textContent = cssString;

    return cssString;
}
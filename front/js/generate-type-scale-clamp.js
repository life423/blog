export function generateTypeScale({
    basePx = 16,
    ratio = 1.25,
    steps = { min: -2, max: 4 },
    rootPx = 16,
    name = 'ms',
    minViewport = 320,
    maxViewport = 1200,
    precision = 3,
} = {}) {
    if (typeof document === 'undefined') return '';
    
    const round = v => Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision);
    const pxToRem = px => round(px / rootPx);
    
    // Calculate min and max ratios for fluid scaling
    const minRatio = ratio * 0.85; // Smaller on mobile
    const maxRatio = ratio * 1.15; // Larger on desktop
    
    const css = [];
    css.push(':root {');
    
    for (let s = steps.min; s <= steps.max; s++) {
        // Calculate sizes at min and max viewports
        const minSize = basePx * Math.pow(minRatio, s);
        const maxSize = basePx * Math.pow(maxRatio, s);
        
        const minRem = pxToRem(minSize);
        const maxRem = pxToRem(maxSize);
        
        // Calculate viewport coefficient for fluid scaling
        const vwCoeff = round((maxSize - minSize) / (maxViewport - minViewport) * 100);
        const baseRem = round(minRem - (minViewport * vwCoeff / 100 / rootPx));
        
        css.push(`  --${name}-step-${s}: clamp(${minRem}rem, ${baseRem}rem + ${vwCoeff}vw, ${maxRem}rem);`);
    }
    
    css.push('}');
    
    const cssString = css.join('\n');
    
    const id = `modular-scale-${name}`;
    let tag = document.getElementById(id);
    if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
    }
    tag.textContent = cssString;
    
    return cssString;
}
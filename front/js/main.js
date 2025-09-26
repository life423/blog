import { generateScaleCSS } from './modular-scale.js';
import { generateSpacingCSS } from './spacing-scale.js';
import { initDrawer } from './drawer.js';

// Initialize typography scale
generateScaleCSS({
    basePx: 16,
    ratio: 1.25,
    steps: { min: -2, max: 4 },
    name: "ms",
    breakpoints: [
        { minWidth: 768, ratio: 1.333 },
        { minWidth: 1200, ratio: 1.414 }
    ]
});

// Initialize spacing scale
generateSpacingCSS({
    basePx: 8,
    ratio: 1.5,
    steps: { min: -2, max: 6 },
    name: "space",
    breakpoints: [
        { minWidth: 768, ratio: 1.414 },
        { minWidth: 1200, ratio: 1.333 }
    ]
});

// Initialize drawer
initDrawer();
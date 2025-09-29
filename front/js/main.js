import { generateTypeScale } from './generate-type-scale.js';
import { generateSpacingCSS } from './spacing-scale.js';
import { generateColorsCSS } from './generate-colors.js';
import { initResponsiveLayout } from './responsive-layout.js';
import { initDrawer } from './drawer.js';

// Initialize typography scale
generateTypeScale({
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

// Initialize colors
generateColorsCSS();

// Initialize responsive layout
initResponsiveLayout();

// Initialize drawer
initDrawer();
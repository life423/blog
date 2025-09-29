import { generateTypeScale } from './generate-type-scale.js';
import { generateSpacingScale } from './generate-spacing-scale.js';
import { generateColorsCSS } from './generate-colors.js';
import { initResponsiveLayout } from './responsive-layout.js';
import { initDrawer } from './drawer.js';

// Initialize typography scale
generateTypeScale({
    basePx: 16,
    ratio: 1.25,
    steps: { min: -2, max: 4 },
    name: "ms"
});

// Initialize spacing scale
generateSpacingScale({
    basePx: 8,
    ratio: 1.5,
    steps: { min: -2, max: 6 },
    name: "space"
});

// Initialize colors
generateColorsCSS();

// Initialize responsive layout
initResponsiveLayout();

// Initialize drawer
initDrawer();
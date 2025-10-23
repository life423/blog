import { initDrawer } from './drawer.js'
import { generateSpacingScale } from './generate-spacing-scale.js'
import { generateTypeScale } from './generate-type-scale.js'

generateTypeScale({
    basePx: 16,
    ratio: 1.25,
    steps: { min: -2, max: 4 },
    name: 'ms',
})

generateSpacingScale({
    basePx: 8,
    ratio: 1.5,
    steps: { min: -2, max: 6 },
    name: 'space',
})

initDrawer()

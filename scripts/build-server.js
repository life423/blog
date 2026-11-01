import { build } from 'esbuild'
import { cp, mkdir } from 'node:fs/promises'

// Keep the source layout so import.meta-relative assets resolve identically.
await mkdir('dist/back', { recursive: true })
const result = await build({
    entryPoints: ['back/index.js'],
    outfile: 'dist/back/index.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    mainFields: ['module', 'main'],
    banner: { js: "import { createRequire as bundleCreateRequire } from 'node:module'; const require = bundleCreateRequire(import.meta.url);" },
    metafile: true,
})
await cp('front', 'dist/front', { recursive: true })
console.log(`Server bundle: ${Object.keys(result.metafile.inputs).length} modules, ${result.metafile.outputs['dist/back/index.js'].bytes} bytes`)

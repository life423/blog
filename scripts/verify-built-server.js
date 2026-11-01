import { spawnSync } from 'node:child_process'

// Repeat the full backend regression suite against the actual production bundle.
const result = spawnSync(process.execPath, ['--test', 'test/blog.test.js'], {
    stdio: 'inherit',
    env: { ...process.env, BLOG_SERVER_ENTRY: '../dist/back/index.js' },
})
process.exit(result.status ?? 1)

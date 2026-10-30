import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { hashPassword } from '../back/auth.js'

// Run explicitly to initialize credentials. Existing credentials are never reset.
let environment = await readFile('.env', 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error })
if (/^ADMIN_PASSWORD_HASH=/m.test(environment)) {
    console.log('Administrator credentials already exist. No password was changed.')
    process.exit(0)
}
const username = process.env.ADMIN_SETUP_USERNAME || 'drew'
const password = randomBytes(24).toString('base64url')
const hash = await hashPassword(password)
environment += `\nADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${randomBytes(48).toString('hex')}\n`
await writeFile('.env', environment, { mode: 0o600 })
await chmod('.env', 0o600)
await mkdir('.azure-local', { recursive: true })
await writeFile('.azure-local/admin-login.txt', `Beyond the Stack — local administrator\n\nURL: http://127.0.0.1:3188/admin\nUsername: ${username}\nPassword: ${password}\n\nKeep this file private. It is excluded from Git and Docker.\nThe application stores only the scrypt hash; this file is a private initial handoff.\nRemove it after saving the password in your password manager.\nThese credentials have NOT been deployed to the live site.\n`, { mode: 0o600 })
console.log('Administrator initialized. Credentials are in the ignored .azure-local/admin-login.txt file. Restart the Node server.')

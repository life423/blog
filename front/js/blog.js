import { initDrawer } from './drawer.js'
initDrawer()

for (const pre of document.querySelectorAll('.prose pre')) {
    const wrapper = document.createElement('div')
    wrapper.className = 'code-block'
    const toolbar = document.createElement('div')
    toolbar.className = 'code-toolbar'
    const language = document.createElement('span')
    language.textContent = pre.querySelector('code')?.className.replace('language-', '') || 'Code'
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Copy code'
    const status = document.createElement('span')
    status.className = 'sr-only'
    status.setAttribute('role', 'status')
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(pre.textContent)
            button.textContent = 'Copied ✓'
            status.textContent = 'Code copied to clipboard.'
        } catch {
            button.textContent = 'Select code'
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(pre)
            selection.removeAllRanges()
            selection.addRange(range)
            status.textContent = 'Copy was unavailable. Code selected; use your device’s copy command.'
        }
        setTimeout(() => { button.textContent = 'Copy code' }, 2500)
    })
    toolbar.append(language, button, status)
    pre.before(wrapper)
    wrapper.append(toolbar, pre)
}

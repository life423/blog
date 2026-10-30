// The overlay siblings live directly under body, outside the layout container.
export function initDrawer() {
    const toggle = document.querySelector('.menu-toggle')
    const drawer = document.querySelector('.drawer')
    const backdrop = document.querySelector('.drawer-backdrop')
    const close = drawer?.querySelector('.drawer-close')
    const page = document.querySelector('.container')
    if (!toggle || !drawer || !backdrop || !close || !page) return

    let open = false
    let previousInert = page.inert
    const updateCurrentLink = () => {
        for (const link of drawer.querySelectorAll('nav a')) {
            const target = new URL(link.href)
            const internal = target.origin === location.origin
            const articles = internal && target.pathname === '/articles' && (location.pathname.startsWith('/articles') || location.pathname === '/' && location.hash !== '#about')
            const about = internal && target.hash === '#about' && location.pathname === '/' && location.hash === '#about'
            if (articles || about) link.setAttribute('aria-current', target.pathname === location.pathname && !target.hash ? 'page' : 'location')
            else link.removeAttribute('aria-current')
        }
    }
    updateCurrentLink()
    window.addEventListener('hashchange', updateCurrentLink)
    const focusables = () => [...drawer.querySelectorAll('a[href], button:not(:disabled)')]
    const setOpen = (next, restoreFocus = true) => {
        if (next === open) return
        open = next
        if (open) previousInert = page.inert
        drawer.inert = !open
        drawer.classList.toggle('open', open)
        backdrop.classList.toggle('open', open)
        toggle.setAttribute('aria-expanded', String(open))
        document.documentElement.classList.toggle('drawer-open', open)
        if (open) {
            page.inert = true
            drawer.removeAttribute('aria-hidden')
            // Let the trigger's click finish before focusing the dialog.
            setTimeout(() => {
                if (open) close.focus({ preventScroll: true })
            }, 0)
        } else {
            page.inert = previousInert
            // Move focus before hiding the dialog from assistive technology.
            if (restoreFocus) toggle.focus({ preventScroll: true })
            else if (drawer.contains(document.activeElement)) {
                page.querySelector('.desktop-nav a')?.focus({ preventScroll: true })
            }
            drawer.setAttribute('aria-hidden', 'true')
        }
    }

    toggle.addEventListener('click', () => setOpen(!open))
    close.addEventListener('click', () => setOpen(false))
    backdrop.addEventListener('click', () => setOpen(false))
    drawer.addEventListener('click', event => {
        if (event.target.closest('a[href]')) setOpen(false)
    })
    document.addEventListener('keydown', event => {
        if (!open) return
        if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
        } else if (event.key === 'Tab') {
            const items = focusables()
            const first = items[0] || drawer
            const last = items.at(-1) || drawer
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
    })
    // Match the actual container-query visibility rather than a second breakpoint.
    new ResizeObserver(() => {
        if (open && getComputedStyle(toggle).display === 'none') setOpen(false, false)
    }).observe(page)
}

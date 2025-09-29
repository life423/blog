// Drawer navigation functionality
export function initDrawer() {
    const toggle = document.querySelector('.menu-toggle')
    const drawer = document.querySelector('.drawer')
    const menuIcon = toggle?.querySelector('.menu-icon')
    const closeIcon = toggle?.querySelector('.close-icon')

    if (!toggle || !drawer || !menuIcon || !closeIcon) return

    // Link control relationships for a11y without changing markup
    toggle.setAttribute('aria-controls', drawer.id || 'nav-drawer')
    toggle.setAttribute('aria-expanded', 'false')
    drawer.setAttribute('aria-hidden', 'true')

    const toggleIcons = (isOpen) => {
        menuIcon.style.display = isOpen ? 'none' : 'block'
        closeIcon.style.display = isOpen ? 'block' : 'none'
    }

    const setOpenState = (isOpen) => {
        drawer.classList.toggle('open', isOpen)
        drawer.setAttribute('aria-hidden', String(!isOpen))
        toggle.setAttribute('aria-expanded', String(isOpen))
        toggleIcons(isOpen)
        document.body.classList.toggle('no-scroll', isOpen)
        if (isOpen) {
            // Focus first interactive element in drawer
            const firstLink = drawer.querySelector('a, button, [tabindex]:not([tabindex="-1"])')
            firstLink?.focus()
        } else {
            // Return focus to the toggle for logical focus order
            toggle.focus()
        }
    }

    toggle.addEventListener('click', () => {
        const isOpen = !drawer.classList.contains('open')
        setOpenState(isOpen)
    })

    // Close drawer when clicking outside
    document.addEventListener('click', e => {
        if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
            if (drawer.classList.contains('open')) setOpenState(false)
        }
    })

    // Close on Escape key and trap focus within drawer when open
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            e.preventDefault()
            setOpenState(false)
            return
        }
        if (e.key === 'Tab' && drawer.classList.contains('open')) {
            const focusables = drawer.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])')
            if (focusables.length === 0) return
            const first = focusables[0]
            const last = focusables[focusables.length - 1]
            const active = document.activeElement
            if (e.shiftKey && active === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && active === last) {
                e.preventDefault()
                first.focus()
            }
        }
    })
}

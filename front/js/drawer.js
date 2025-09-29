// Drawer navigation functionality
export function initDrawer() {
    const toggle = document.querySelector('.menu-toggle')
    const drawer = document.querySelector('.drawer')
    const menuIcon = toggle?.querySelector('.menu-icon')
    const closeIcon = toggle?.querySelector('.close-icon')

    if (!toggle || !drawer || !menuIcon || !closeIcon) return

    const toggleIcons = (isOpen) => {
        menuIcon.style.display = isOpen ? 'none' : 'block'
        closeIcon.style.display = isOpen ? 'block' : 'none'
    }

    toggle.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open')
        toggleIcons(isOpen)
    })

    // Close drawer when clicking outside
    document.addEventListener('click', e => {
        if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
            if (drawer.classList.contains('open')) {
                drawer.classList.remove('open')
                toggleIcons(false)
            }
        }
    })
}
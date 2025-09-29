// Drawer navigation functionality
export function initDrawer() {
    const toggle = document.querySelector('.menu-toggle');
    const drawer = document.querySelector('.drawer');
    
    if (!toggle || !drawer) return;
    
    toggle.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        
        if (isOpen) {
            toggle.innerHTML = '<i data-lucide="x" class="x-icon"></i>';
        } else {
            toggle.innerHTML = '<i data-lucide="menu"></i>';
        }
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });
    
    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
            if (drawer.classList.contains('open')) {
                drawer.classList.remove('open');
                toggle.innerHTML = '<i data-lucide="menu"></i>';
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        }
    });
}
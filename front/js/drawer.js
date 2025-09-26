// Drawer navigation functionality
export function initDrawer() {
    const toggle = document.querySelector('.menu-toggle');
    const drawer = document.querySelector('.drawer');
    
    if (!toggle || !drawer) return;
    
    toggle.addEventListener('click', () => {
        drawer.classList.toggle('open');
    });
    
    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
            drawer.classList.remove('open');
        }
    });
}
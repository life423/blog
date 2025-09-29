// Dynamic responsive layout with fallback
export function initResponsiveLayout() {
    // Check for ResizeObserver support
    if (!window.ResizeObserver) {
        // Fallback: use window resize with screen width
        const fallbackResize = () => {
            const isNarrow = window.innerWidth < 768;
            document.querySelectorAll('.responsive-layout').forEach(el => {
                el.classList.remove('layout-narrow', 'layout-wide');
                el.classList.add(isNarrow ? 'layout-narrow' : 'layout-wide');
            });
        };
        
        window.addEventListener('resize', fallbackResize);
        fallbackResize(); // Initial call
        return;
    }
    
    // Modern browsers: use ResizeObserver
    const observer = new ResizeObserver(entries => {
        entries.forEach(entry => {
            const element = entry.target;
            const width = entry.contentRect.width;
            
            element.classList.remove('layout-narrow', 'layout-wide');
            
            if (width < 768) {
                element.classList.add('layout-narrow');
            } else {
                element.classList.add('layout-wide');
            }
        });
    });
    
    document.querySelectorAll('.responsive-layout').forEach(el => {
        observer.observe(el);
    });
}
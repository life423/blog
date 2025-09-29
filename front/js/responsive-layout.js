// Dynamic responsive layout with fallback
export function initResponsiveLayout() {
    // Check for ResizeObserver support
    if (!window.ResizeObserver) {
        // Fallback: use window resize with screen width
        const fallbackResize = () => {
            const isNarrow = window.innerWidth < 768;
            document.querySelectorAll('.responsive-layout').forEach(el => {
                el.classList.remove('layout-narrow', 'layout-wide', 'text-narrow', 'text-wide');
                el.classList.add(isNarrow ? 'layout-narrow' : 'layout-wide');
                el.classList.add(isNarrow ? 'text-narrow' : 'text-wide');
                
                // Apply show/hide classes
                if (isNarrow) {
                    el.querySelectorAll('.show-wide').forEach(elem => elem.classList.add('hide'));
                    el.querySelectorAll('.show-narrow').forEach(elem => elem.classList.add('show'));
                } else {
                    el.querySelectorAll('.show-narrow').forEach(elem => elem.classList.add('hide'));
                    el.querySelectorAll('.show-wide').forEach(elem => elem.classList.add('show'));
                }
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
            
            element.classList.remove('layout-narrow', 'layout-wide', 'text-narrow', 'text-wide');
            
            if (width < 600) {
                element.classList.add('layout-narrow', 'text-narrow');
                // Apply show/hide classes for narrow layout
                element.querySelectorAll('.show-wide').forEach(el => el.classList.add('hide'));
                element.querySelectorAll('.show-narrow').forEach(el => el.classList.add('show'));
            } else {
                element.classList.add('layout-wide', 'text-wide');
                // Apply show/hide classes for wide layout
                element.querySelectorAll('.show-narrow').forEach(el => el.classList.add('hide'));
                element.querySelectorAll('.show-wide').forEach(el => el.classList.add('show'));
            }
        });
    });
    
    document.querySelectorAll('.responsive-layout').forEach(el => {
        observer.observe(el);
    });
}
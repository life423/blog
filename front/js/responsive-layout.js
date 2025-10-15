export function initResponsiveLayout() {
    if (!window.ResizeObserver) {
        const fallbackResize = () => {
            const isNarrow = window.innerWidth < 768
            document.querySelectorAll('.responsive-layout').forEach(el => {
                el.classList.remove('layout-narrow', 'layout-wide')
                el.classList.add(isNarrow ? 'layout-narrow' : 'layout-wide')
            })
        }

        window.addEventListener('resize', fallbackResize)
        fallbackResize()
        return
    }

    const observer = new ResizeObserver(entries => {
        entries.forEach(entry => {
            const element = entry.target
            const width = entry.contentRect.width

            element.classList.remove('layout-narrow', 'layout-wide')

            if (width < 768) {
                element.classList.add('layout-narrow')
            } else {
                element.classList.add('layout-wide')
            }
        })
    })

    document.querySelectorAll('.responsive-layout').forEach(el => {
        observer.observe(el)
    })
}

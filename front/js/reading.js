// Optional orientation feedback; article links and content work without this module.
export function initReading() {
    const prose = document.querySelector('.prose')
    if (!prose) return

    const links = [...document.querySelectorAll('.article-contents a[href^="#"]')]
    const sections = links.map(link => ({ link, heading: document.getElementById(link.hash.slice(1)) }))
        .filter(section => section.heading)
    let pending = false
    let current = null

    function update() {
        pending = false
        let active = null
        for (const section of sections) {
            if (section.heading.getBoundingClientRect().top <= Math.min(120, innerHeight * .2)) active = section.link
        }
        if (active !== current) {
            current?.removeAttribute('aria-current')
            active?.setAttribute('aria-current', 'location')
            current = active
        }
    }
    function schedule() {
        if (!pending) { pending = true; requestAnimationFrame(update) }
    }
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule, { passive: true })
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(prose)
    document.fonts?.ready.then(schedule)
    update()
}

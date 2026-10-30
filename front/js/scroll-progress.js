export function scrollFraction(top, height, viewport) {
    const distance = height - viewport
    return distance > 0 ? Math.max(0, Math.min(1, top / distance)) : 0
}

// Fallback colors mirror the CSS anchors; intermediate colors use RGB interpolation.
export function progressColor(fraction) {
    const stops = [[0, [16,185,129]], [.24, [81,221,168]], [.4, [75,205,205]],
        [.56, [14,165,233]], [.68, [3,105,161]], [.84, [255,193,153]], [1, [255,107,0]]]
    const value = Math.max(0, Math.min(1, fraction))
    const index = stops.findIndex((stop, i) => i && value <= stop[0])
    const [end, next] = stops[index]
    const [start, previous] = stops[index - 1]
    const amount = (value - start) / (end - start)
    return `rgb(${previous.map((channel, i) => Math.round(channel + (next[i] - channel) * amount)).join(', ')})`
}

export function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress')
    if (!bar) return
    // Native timelines own width and color; no progress scroll listener in this path.
    if (CSS.supports('animation-timeline: scroll(root block)')) return
    let pending = false
    function update() {
        pending = false
        if (document.documentElement.classList.contains('drawer-open')) return
        const root = document.scrollingElement || document.documentElement
        const fraction = scrollFraction(root.scrollTop, root.scrollHeight, root.clientHeight)
        bar.style.transform = `scaleX(${fraction})`
        bar.style.backgroundColor = progressColor(fraction)
    }
    function schedule() {
        if (!pending) { pending = true; requestAnimationFrame(update) }
    }
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule, { passive: true })
    addEventListener('pageshow', schedule)
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body)
    new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    document.fonts?.ready.then(schedule)
    update()
}

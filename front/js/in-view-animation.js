const controllers = new WeakMap()

/** One observer for all groups; explicit disposal supports remounts and partial pages. */
export function initInViewAnimation(root = document, {
    Observer = globalThis.IntersectionObserver,
    motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),
    threshold = .1,
    rootMargin = '0px 0px -12px 0px',
    replay = true,
} = {}) {
    controllers.get(root)?.()
    const groups = [...root.querySelectorAll('[data-in-view-animation]')]
    let observer
    let disposed = false
    let generation = 0
    const played = new WeakSet()
    const reset = () => groups.forEach(group => group.classList.remove('is-in-view'))
    function connect() {
        const version = ++generation
        observer?.disconnect()
        reset()
        if (disposed || motion?.matches || !Observer || !groups.length) return
        observer = new Observer(entries => {
            if (disposed || motion?.matches || version !== generation) return
            for (const entry of entries) {
                // Enter at 10%; rearm only after completely leaving (hysteresis).
                if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
                    if (!replay && played.has(entry.target)) continue
                    entry.target.classList.add('is-in-view')
                    played.add(entry.target)
                } else if (!entry.isIntersecting || entry.intersectionRatio === 0) {
                    entry.target.classList.remove('is-in-view')
                }
            }
        }, { threshold: [0, threshold], rootMargin })
        groups.forEach(group => observer.observe(group))
    }
    function dispose() {
        if (disposed) return
        disposed = true
        observer?.disconnect()
        motion?.removeEventListener('change', connect)
        reset()
        if (controllers.get(root) === dispose) controllers.delete(root)
    }
    controllers.set(root, dispose)
    motion?.addEventListener('change', connect)
    connect()
    return dispose
}

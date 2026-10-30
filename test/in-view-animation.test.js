import test from 'node:test'
import assert from 'node:assert/strict'
import { initInViewAnimation } from '../front/js/in-view-animation.js'

function fixture() {
    const classes = new Set()
    const group = { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } }
    const root = { querySelectorAll: () => [group] }
    const observers = []
    class Observer {
        constructor(callback, options) { Object.assign(this, { callback, options, observed: [], disconnected: false }); observers.push(this) }
        observe(group) { this.observed.push(group) }
        disconnect() { this.disconnected = true }
        emit(ratio) { this.callback([{ target: group, intersectionRatio: ratio, isIntersecting: ratio > 0 }]) }
    }
    const listeners = new Set()
    const motion = { matches: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) }
    return { root, group, classes, observers, Observer, motion, listeners,
        change(value) { motion.matches = value; [...listeners].forEach(fn => fn()) } }
}

test('One observer starts at threshold, avoids boundary replay and resets on exit', () => {
    const f = fixture()
    const dispose = initInViewAnimation(f.root, f)
    const observer = f.observers[0]
    assert.deepEqual(observer.options.threshold, [0, .1])
    assert.deepEqual(observer.observed, [f.group])
    assert.equal(f.classes.size, 0)
    observer.emit(.09); assert.equal(f.classes.size, 0)
    observer.emit(.1); assert.equal(f.classes.has('is-in-view'), true)
    observer.emit(.04); assert.equal(f.classes.has('is-in-view'), true)
    observer.emit(0); assert.equal(f.classes.size, 0)
    observer.emit(.2); assert.equal(f.classes.has('is-in-view'), true)
    dispose(); assert.equal(f.classes.size, 0)
    observer.emit(.2); assert.equal(f.classes.size, 0)
    assert.equal(observer.disconnected, true)
    assert.equal(f.listeners.size, 0)
})

test('Remount, reduced-motion changes and stale observer callbacks are safe', () => {
    const f = fixture()
    initInViewAnimation(f.root, f)
    const first = f.observers[0]
    const dispose = initInViewAnimation(f.root, f)
    assert.equal(first.disconnected, true)
    assert.equal(f.listeners.size, 1)
    first.emit(1); assert.equal(f.classes.size, 0)
    f.observers[1].emit(1)
    f.change(true); assert.equal(f.classes.size, 0)
    assert.equal(f.observers[1].disconnected, true)
    f.change(false)
    f.observers[1].emit(1); assert.equal(f.classes.size, 0)
    f.observers[2].emit(1); assert.equal(f.classes.size, 1)
    dispose()
})

test('Static fallback and optional non-replay behavior', () => {
    const f = fixture()
    initInViewAnimation(f.root, { ...f, Observer: null })()
    assert.equal(f.observers.length, 0)
    const dispose = initInViewAnimation(f.root, { ...f, replay: false })
    f.observers[0].emit(1); f.observers[0].emit(0); f.observers[0].emit(1)
    assert.equal(f.classes.size, 0)
    dispose()
})

test('Initially reduced motion is static; multiple groups share one observer', () => {
    const f = fixture()
    f.motion.matches = true
    const extra = { classList: { add() {}, remove() {} } }
    f.root.querySelectorAll = () => [f.group, extra]
    const dispose = initInViewAnimation(f.root, f)
    assert.equal(f.observers.length, 0)
    f.change(false)
    assert.equal(f.observers.length, 1)
    assert.deepEqual(f.observers[0].observed, [f.group, extra])
    dispose()
})

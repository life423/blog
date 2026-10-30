import test from 'node:test'
import assert from 'node:assert/strict'
import { scrollFraction, progressColor } from '../front/js/scroll-progress.js'

test('Page progress handles scroll endpoints, elastic overscroll and short pages', () => {
    assert.equal(scrollFraction(0, 2000, 1000), 0)
    assert.equal(scrollFraction(500, 2000, 1000), .5)
    assert.equal(scrollFraction(1000, 2000, 1000), 1)
    assert.equal(scrollFraction(-60, 2000, 1000), 0)
    assert.equal(scrollFraction(1100, 2000, 1000), 1)
    assert.equal(scrollFraction(0, 600, 800), 0)
    assert.equal(scrollFraction(0, 800, 800), 0)
})

test('Fallback colors preserve brand endpoints and intermediate anchors', () => {
    assert.equal(progressColor(-1), 'rgb(16, 185, 129)')
    assert.equal(progressColor(.4), 'rgb(75, 205, 205)')
    assert.equal(progressColor(.56), 'rgb(14, 165, 233)')
    assert.equal(progressColor(2), 'rgb(255, 107, 0)')
})

import { brandBlue, brandGray, brandGreen, brandOrange } from './colors.js'

export function generateColorsCSS() {
    const parts = [':root {']
    
    Object.entries(brandGreen).forEach(([key, value]) => {
        parts.push(`  --brand-green-${key}: ${value};`)
    })
    
    parts.push('')
    
    Object.entries(brandOrange).forEach(([key, value]) => {
        parts.push(`  --brand-orange-${key}: ${value};`)
    })
    
    parts.push('')
    
    Object.entries(brandBlue).forEach(([key, value]) => {
        parts.push(`  --brand-blue-${key}: ${value};`)
    })
    
    parts.push('')
    
    Object.entries(brandGray).forEach(([key, value]) => {
        parts.push(`  --brand-gray-${key}: ${value};`)
    })
    
    parts.push(
        '',
        '  --color-primary: var(--brand-green-500);',
        '  --color-secondary: var(--brand-blue-500);',
        '  --color-accent: var(--brand-orange-500);',
        '  --color-neutral: var(--brand-gray-500);',
        '}'
    )
    
    const css = parts.join('\n')

    const id = 'generated-colors'
    let tag = document.getElementById(id)
    if (!tag) {
        tag = document.createElement('style')
        tag.id = id
        document.head.appendChild(tag)
    }
    tag.textContent = css
    return css
}

import { brandBlue, brandGray, brandGreen, brandOrange } from './colors.js'

export function generateColorsCSS() {
    let css = `:root {\n  \n`

    Object.entries(brandGreen).forEach(([key, value]) => {
        css += `  --brand-green-${key}: ${value};\n`
    })

    css += `\n`

    Object.entries(brandOrange).forEach(([key, value]) => {
        css += `  --brand-orange-${key}: ${value};\n`
    })

    css += `\n`

    Object.entries(brandBlue).forEach(([key, value]) => {
        css += `  --brand-blue-${key}: ${value};\n`
    })

    css += `\n`

    Object.entries(brandGray).forEach(([key, value]) => {
        css += `  --brand-gray-${key}: ${value};\n`
    })

    css += `\n  \n`
    css += `  --color-primary: var(--brand-green-500);\n`
    css += `  --color-secondary: var(--brand-blue-500);\n`
    css += `  --color-accent: var(--brand-orange-500);\n`
    css += `  --color-neutral: var(--brand-gray-500);\n`
    css += `}\n`

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

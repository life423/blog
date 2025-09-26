// generate-colors.js — Generate CSS variables from color objects
import { brandGreen, brandOrange, brandBlue, brandGray } from './colors.js';

export function generateColorsCSS() {
  let css = `:root {\n  /* Brand Colors Generated from JS */\n`;
  
  // Generate brand green variables
  Object.entries(brandGreen).forEach(([key, value]) => {
    css += `  --brand-green-${key}: ${value};\n`;
  });
  
  css += `\n`;
  
  // Generate brand orange variables
  Object.entries(brandOrange).forEach(([key, value]) => {
    css += `  --brand-orange-${key}: ${value};\n`;
  });
  
  css += `\n`;
  
  // Generate brand blue variables
  Object.entries(brandBlue).forEach(([key, value]) => {
    css += `  --brand-blue-${key}: ${value};\n`;
  });
  
  css += `\n`;
  
  // Generate brand gray variables
  Object.entries(brandGray).forEach(([key, value]) => {
    css += `  --brand-gray-${key}: ${value};\n`;
  });
  
  css += `\n  /* Core Colors */\n`;
  css += `  --color-primary: var(--brand-green-500);\n`;
  css += `  --color-secondary: var(--brand-blue-500);\n`;
  css += `  --color-accent: var(--brand-orange-500);\n`;
  css += `  --color-neutral: var(--brand-gray-500);\n`;
  css += `}\n`;

  // Inject styles
  const id = 'generated-colors';
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
  return css;
}
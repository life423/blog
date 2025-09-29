// spacing-scale.js — Generate spacing scale CSS variables
export function generateSpacingCSS({
  basePx = 16,            // base spacing unit
  ratio = 1.5,            // spacing ratio (1.5 = perfect fifth)
  steps = { min: -2, max: 6 }, // spacing steps
  rootPx = 16,
  name = "space",         // prefix for CSS vars: --space-0
  breakpoints = [         // responsive scaling
    { minWidth: 768, ratio: 1.414 },   // tablet - slightly smaller ratio
    { minWidth: 1200, ratio: 1.333 }   // desktop - even smaller ratio
  ],
  precision = 3
} = {}) {
  
  const round = (v) => Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision);
  const pxToRem = (px) => round(px / rootPx);

  // compute spacing for a ratio
  const compute = (r) => {
    const out = {};
    for (let s = steps.min; s <= steps.max; s++) {
      const sizePx = basePx * Math.pow(r, s);
      out[s] = `${pxToRem(sizePx)}rem`;
    }
    return out;
  };

  // create CSS content
  let css = `:root{\n  /* spacing base (${basePx}px) ratio:${ratio} */\n`;
  const baseSizes = compute(ratio);
  for (let s = steps.min; s <= steps.max; s++) {
    css += `  --${name}-${s}: ${baseSizes[s]};\n`;
  }
  css += `}\n\n`;

  // add responsive breakpoints
  for (const bp of breakpoints) {
    const sizes = compute(bp.ratio ?? ratio);
    css += `@media (min-width: ${bp.minWidth}px) {\n  :root{\n`;
    css += `    /* spacing ratio:${bp.ratio} @ ${bp.minWidth}px */\n`;
    for (let s = steps.min; s <= steps.max; s++) {
      css += `    --${name}-${s}: ${sizes[s]};\n`;
    }
    css += `  }\n}\n\n`;
  }

  // Generate utility classes
  css += `/* Spacing utility classes */\n`;
  
  // Margin utilities
  for (let s = steps.min; s <= steps.max; s++) {
    css += `.m-${s} { margin: var(--${name}-${s}); }\n`;
    css += `.mt-${s} { margin-top: var(--${name}-${s}); }\n`;
    css += `.mb-${s} { margin-bottom: var(--${name}-${s}); }\n`;
  }
  
  // Padding utilities
  for (let s = steps.min; s <= steps.max; s++) {
    css += `.p-${s} { padding: var(--${name}-${s}); }\n`;
  }
  
  // Gap utilities
  for (let s = steps.min; s <= steps.max; s++) {
    css += `.gap-${s} { gap: var(--${name}-${s}); }\n`;
  }
  
  css += `\n/* Default element spacing */\n`;
  css += `h1, h2, h3, h4, h5, h6 { margin-top: var(--${name}-3); margin-bottom: 0; }\n`;
  css += `h1:first-child, h2:first-child, h3:first-child, h4:first-child { margin-top: 0; }\n`;
  css += `p { margin-top: 0; margin-bottom: var(--${name}-2); }\n`;
  css += `p:last-child { margin-bottom: 0; }\n`;
  css += `section { margin-bottom: var(--${name}-5); }\n`;
  css += `article { margin-bottom: var(--${name}-4); }\n`;

  // inject styles
  const id = `spacing-scale-${name}`;
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
  return css;
}
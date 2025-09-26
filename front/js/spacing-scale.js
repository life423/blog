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
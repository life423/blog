// modular-scale.js — ES module (vanilla JS)
export function generateScaleCSS({
  basePx = 16,            // mobile base font-size
  ratio = 1.25,           // modular ratio
  steps = { min: -2, max: 4 }, // steps to generate
  rootPx = 16,
  name = "ms",            // prefix for CSS vars: --ms-step-0
  breakpoints = [         // mobile-first breakpoints (min-width)
    { minWidth: 768, ratio: 1.333 },   // tablet
    { minWidth: 1200, ratio: 1.414 }   // desktop
  ],
  precision = 3
} = {}) {
  // helper to round
  const round = (v) => Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision);

  const pxToRem = (px) => round(px / rootPx);

  // compute sizes for a ratio
  const compute = (r) => {
    const out = {};
    for (let s = steps.min; s <= steps.max; s++) {
      const sizePx = basePx * Math.pow(r, s);
      out[s] = `${pxToRem(sizePx)}rem`;
    }
    return out;
  };

  // create style content
  let css = `:root{\n  /* base (${basePx}px) ratio:${ratio} */\n`;
  const baseSizes = compute(ratio);
  for (let s = steps.min; s <= steps.max; s++) {
    css += `  --${name}-step-${s}: ${baseSizes[s]};\n`;
  }
  css += `}\n\n`;

  // add breakpoints overrides
  for (const bp of breakpoints) {
    const sizes = compute(bp.ratio ?? ratio);
    css += `@media (min-width: ${bp.minWidth}px) {\n  :root{\n`;
    css += `    /* ratio:${bp.ratio} @ ${bp.minWidth}px */\n`;
    for (let s = steps.min; s <= steps.max; s++) {
      css += `    --${name}-step-${s}: ${sizes[s]};\n`;
    }
    css += `  }\n}\n\n`;
  }

  // inject style tag (idempotent)
  const id = `modular-scale-${name}`;
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
  return css; // useful for debugging
}
# Editorial foundation and next steps

## Preserve the approved direction

Beyond the Stack is Drew Clark's engineering journal: development, DevOps, and
learning with AI. Keep the approved green/orange/blue/gray palette and the headline
“Full Stack Web Development”. The publication brief informs hierarchy and craft;
its alternative colors and headlines do not replace those decisions.

## Foundation implemented locally

- Shared semantic tokens for color roles, typography, spacing, content widths,
  controls, layers and motion. Reader and admin load the same tokens and Montserrat.
- A single horizontally scrolling topic rail, with the selected topic brought into
  view. These are normal links, so filtering and history work without client routing.
- A featured-story container query with a twelve-column wide layout and a stacked
  narrow layout. Reading text stays within a 70ch column.
- Mobile navigation without JavaScript through a plain navigation fallback.
- Public footer focuses on reader destinations; administration remains at /admin.
- Preserve the approved drawer, separate clickable QR row and orange footer detail.

## Next priorities

1. Publish real articles through the existing private admin workflow. Samples remain
   explicitly labeled local previews, never production content.
2. Reading orientation is implemented locally: active sections, larger section
   targets, an article-body progress line, and a topic-specific next-reading link.
   Validate with genuinely long published articles before further refinement.
3. Develop one useful lab demonstration with real, attributed inputs and a static
   SVG fallback. No invented simulation results or decorative fake metrics.
4. Evaluate native dialog migration separately against the existing drawer's focus,
   scroll, safe-area and responsive behavior; changing elements alone is not a benefit.
5. Measure production Core Web Vitals and asset sizes before adding animation libraries,
   canvas or WebGL. LCP 2.5s, INP 200ms and CLS 0.1 are targets, not measured results.
6. Add responsive image derivatives when real uploaded cover images warrant them.

Use short transitions for state feedback, keep reduced-motion support, and keep
essential content server rendered. Any cross-document view transitions must avoid
duplicate transition names and preserve ordinary navigation in unsupported browsers.

## Release boundary

The foundation is on codex/editorial-foundation. Production remains the separately
verified main deployment until this new pass is merged. This document records a
sequence of work, not a claim that all publication enhancements are complete.


## User-approved motion direction

First pass implemented: animated editorial cards, headline masks, drawer
choreography and directional links. Next: shared-element article transitions,
then an explicitly illustrative or evidence-backed CUDA visualization. Sliding
category indicators remain planned. Existing reading progress/section tracking
continues to work independently. Reference: https://github.com/jonasschmedtmann/advanced-css-course
Borrow composition and motion principles; preserve this publication's own brand.


Page progress refinement: public pages now use a CSS root-scroll timeline with a
green/cyan/blue/orange palette progression, plus a JavaScript fallback. This replaces
the earlier article-body-only progress line; active article sections remain separate.
The seven-stop adaptation intentionally differs from the portfolio's 26-stop HSL
algorithm. Verify unsupported browsers and reduced motion before release.


Shared-element phase implemented locally on codex/article-view-transitions:
CSP-safe native document navigation pairs each card illustration with its hero.
320ms geometry transition, static chrome, clean single-image rendering, ordinary
links and reduced-motion/unsupported-browser fallback. Real desktop transition
captured; phone keyboard navigation and tablet directory transition reviewed.
Animated CUDA diagrams and sliding category indicators remain planned.

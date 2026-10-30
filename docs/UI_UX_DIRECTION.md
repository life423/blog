# UI/UX research and blog direction

Research date: October 30, 2026. This is a design brief, not an implementation or
approval to add every feature. The approved palette remains unchanged. The latest
headline is **Full Stack Web Development**; the brand is **Beyond the Stack**.

## Scope and evidence

Reviewed Jonas Schmedtmann's public course description, jonas.io teaching philosophy,
Omnifood responsive CSS, and The Wild Oasis final form/dialog/delete components.
This was a source/documentation review, not a full course viewing or rendered
interaction audit. Recommendations below are our application of those sources,
not quotes or a claim that Jonas prescribes this blog design.

Primary sources:
- https://jonas.io/
- https://www.udemy.com/course/design-and-develop-a-killer-website-with-html5-and-css3/
- https://github.com/jonasschmedtmann/html-css-course/blob/master/final/08-Omnifood-Responsive/css/general.css
- https://github.com/jonasschmedtmann/html-css-course/blob/master/final/08-Omnifood-Responsive/css/style.css
- https://github.com/jonasschmedtmann/html-css-course/blob/master/final/08-Omnifood-Responsive/css/queries.css
- https://github.com/jonasschmedtmann/ultimate-react-course/blob/main/17-the-wild-oasis/final-6-final/src/ui/FormRow.jsx
- https://github.com/jonasschmedtmann/ultimate-react-course/blob/main/17-the-wild-oasis/final-6-final/src/ui/ConfirmDelete.jsx
- https://github.com/jonasschmedtmann/ultimate-react-course/blob/main/17-the-wild-oasis/final-6-final/src/ui/Modal.jsx
- https://www.nngroup.com/articles/ten-usability-heuristics/
- https://web.dev/learn/design/typography
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://web.dev/articles/vitals

## Observations from Jonas's work

- Omnifood declares coordinated font sizes, line heights, weights, letter spacing,
  colors, radii and spacing before reusable components. Different heading sizes
  have different line heights. Uppercase subheadings have modest tracking.
- Its outline-button hover uses an inset shadow so adding the outline does not
  move surrounding content. Links share a consistent underline treatment.
- Repeated icons have explicit dimensions; flex alignment and consistent gaps
  organize icon/text rows. Image wrappers contain zoom effects.
- Responsive rules alter columns, content order, spacing and button padding.
- Wild Oasis FormRow groups a label, input and error; first and last rows remove
  surplus outer padding. Delete confirmation names the resource and separates
  Cancel from Delete, disabling actions while requested.
- Modal renders at body level and has a close-button hover state. The reviewed
  component does not itself implement full dialog semantics, keyboard focus
  containment, Escape handling or focus restoration; these must be added.
- Jonas's published philosophy emphasizes explaining why, deliberate project
  planning, real projects and clear diagrams.

Do not copy the course's entire visual vocabulary, global root-font reductions,
large card lifts, transition: all, or viewport-height assumptions. Keep normal
browser text preferences, targeted transitions, reduced motion, dynamic viewport
sizing and current accessibility requirements.

## Proposed application, in priority order

### 1. Reading and navigation

- One featured story; compact introduction; clear route from homepage to article.
- Article text starts around 18-20px equivalent, 60-70ch measure and 1.6-1.75 line
  height as prototype values to test, not universal standards.
- Define heading/body/metadata roles; compare serif headings with the current
  Montserrat identity in rendered prototypes before choosing new fonts.
- Use spacing to group category, headline and excerpt; larger gaps between stories.
- Show publication date and genuinely meaningful update date distinctly.
- Use real project images and diagrams with captions and preserved proportions.
  Generated concept art must not be presented as an actual project screenshot.
- Keep Development, DevOps and AI & Experiments discoverable. Topic state should
  survive navigation/back through URLs when filtering is implemented.

### 2. Small details that support tasks

- Underline reading links; clear keyboard focus; no movement when borders change.
- Optional read-link arrow movement of 2-3px on hover/focus, around 150ms, disabled
  for reduced motion; the label and target stay stationary.
- Code blocks: language label, accessible Copy button, Copied feedback, recoverable
  clipboard failure, and contained horizontal scroll rather than page overflow.
- Long articles: section anchors and a contents list only where useful. Mobile
  contents can collapse with a visible label. Anchor targets clear any header.
- Reserve media dimensions and avoid font-induced shifts.
- Search only when content justifies it: labeled input, loading/no-results/failure
  states, preserved query, keyboard access. No decorative nonfunctional controls.

### 3. Publishing confidence

- Editor: explicit Draft/Published state, Preview and Publish hierarchy.
- Saved indicator must reflect confirmed persistence. Retain draft text on failure;
  provide retry and unsaved-change protection. Avoid announcing every keystroke.
- Visible labels; field-specific errors programmatically connected to fields.
- Separate archive/unpublish from permanent deletion. Confirm irreversible deletion
  with the article title; avoid confirmations for harmless reversible actions.
- Login supports password managers/paste and clear errors without exposing secrets.

## Accessibility and validation

Aim for at least 44x44 CSS pixel touch controls as the user's comfort target.
WCAG 2.2 AA target minimum is 24x24 with defined exceptions; do not confuse them.
Keep focus visible and unobscured; dialogs contain focus, allow Escape, make the
background inert and restore focus. Test contrast for actual palette pairings.

Before implementation completion, inspect phone/tablet/desktop, long titles,
200% text enlargement, keyboard focus, reduced motion, empty/loading/error states
and mobile drawer behavior. Measure rather than claim performance: good Core Web
Vitals targets are LCP <=2.5s, INP <=200ms and CLS <=0.1, assessed at the 75th
percentile in field data. Lab checks are useful but cannot establish field results.

## Critique of the generated concept

These are visual-review recommendations, not measured usability findings:
1. Reduce the phone hero's surplus blank space so the featured story appears sooner.
2. Render metadata at readable sizes; mockup legibility does not prove real contrast.
3. Replace generated pond/learning-curve art with genuine project evidence.
4. Test serif headings against the existing brand before adopting them.
5. Detail the article and admin failure/keyboard states before polishing decoration.

No UI was changed by this research. Next concrete design deliverable should pair a
homepage prototype with an article page, including real interaction states.


## Advanced CSS follow-up and orange placement

Reviewed Natours/final-after-S06 Sass: base/_animations.scss,
components/_button.scss, _card.scss, _composition.scss, _story.scss and
layout/_header.scss in jonasschmedtmann/advanced-css-course (master).

Observed: transform/opacity entrance keyframes with slight overshoot; button hover
lift and a scaling/fading ::after layer; shallower pressed elevation; perspective
and backface-visibility for rotating cards, replaced with always-visible content
for hover:none; polygon clipping on header/card artwork; circular clipping plus
shape-outside for portrait text wrapping; counter-skewed readable story content;
image/caption transitions. These are examples, not all appropriate blog features.

Proposed use: 150-200ms link/icon and button state transitions; at most a 1-2px
button lift with keyboard equivalent, smaller press feedback, stationary hit area;
200ms drawer travel with backdrop fade; optional mild thumbnail zoom only where
cropping does not remove project evidence. All motion respects reduced motion.
Keep article content immediately available; no recurring scroll reveals or hidden
hover-only metadata. No flip cards in the reader UI.

Clip-path is optional: prototype one shallow angled notch on an isolated feature
artwork frame or a small orange section accent. Keep text, controls, focus rings
and actual project screenshots unclipped. Start with a rectangular fallback.
Do not assume clip-path animation is compositor-only; profile before adopting it.

Orange roles: #FF6B00 intro dash; one small feature marker; selected endpoints and
paths in technical diagrams; #FFF2E8 with #993F00 text and an orange rule for a
labeled Insight callout. Consider a tiny orange navigation detail only if it
helps orientation; keep the existing green topic selection coherent.
Primary buttons remain green; links blue; success green. Never encode status
only through orange, and avoid assigning it to unrelated controls indiscriminately.
Contrast calculation: white on #FF6B00 is about 2.86:1, #18181B on #FF6B00 about
6.21:1, and #993F00 on #FAFAFA about 6.56:1 (recompute actual pairings if changed).
Orange-500 is not a suitable background for normal-size white button text.

The revised featured image uses geometric simulation nodes and paths. The user
rejected the organic tadpole/sperm-like illustration; preserve that direction.



## Implementation feedback, October 30

The user caught low-contrast blue links in the mobile drawer. Preserve explicit
light-mint drawer link styles against the global link color, and verify states in
the actual rendered cascade. The user supplied Coolors as an optional checker.
The user requested more noticeable hover/touch feedback: drawer labels now glide
inside stationary targets, with orange marker and press feedback; reduced motion
removes movement. The user also requested easy article discovery and real admin
login: keep the article directory, topic navigation, username/password sign-in,
recoverable trash and restore workflows. The development sign-in bypass was
removed. See VALIDATION.md for evidence and remaining limits.


The user requested a more deliberate Jonas-inspired View blog control: use the
rounded outline button, back-arrow motion, small hover lift, press feedback and
visible focus ring rather than reverting to a tiny underlined header link.
The user then rejected top-clustered drawer links with a large unused lower area.
The navigation group now fills the available space and centers vertically, with
12px inter-link gaps; header/close remain at top and caption at bottom. The group
has a minimum content height so short landscape viewports scroll instead of overlap.
A mobile-only header QR code links to https://blog.drewclark.io; retain its white
quiet zone, high contrast, and desktop-hidden treatment. The code is generated
locally, not fetched from a third party, and has been independently decoded.


## Latest drawer revision — supersedes centered navigation/header QR

The user explicitly moved the QR **inside the drawer**, rejecting the public header
placement, and rejected the vertically centered links. Current agreed layout:
compact header/QR/close, links around 110-140px from the top, and an intentional
Drew Clark / Software Engineer / Development. DevOps. Always learning footer.
Use subtle translucent mint rows (19px text, 56px targets), arrows, active-location
mint marker, restrained spring-like slide and staggered 8px entrance, gentle green
800-to-900 gradient and a translucent right border. A 4px backdrop blur stays behind
the crisp drawer. Reduced-motion CSS disables the entrance and movement. These
explicit later requests supersede earlier notes favoring a flat drawer or vertical
centering. The normal mobile header is again just the wordmark and hamburger.


Latest placement refinement: QR occupies its own fully clickable horizontal row
between header and Articles, with an 88px image, explanatory text, visible destination,
12px radius and restrained translucent background. Header orange underline removed.
A small orange segment now sits within the footer divider above Drew Clark, carrying
the accent down the drawer without adding a competing separator. This supersedes
notes placing the QR beside the close button or in the public page header.

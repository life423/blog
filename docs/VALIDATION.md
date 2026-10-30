# First implementation verification

October 30, 2026. Local Node preview at http://127.0.0.1:3188/ connects to the
provisioned drewblogdata Azure account. Nothing has been deployed to the public
blog.drewclark.io site. Sample stories are visibly labeled preview content.

## Automated checks

- `npm run check`: Node syntax checks for server, storage, views, admin and reader JS.
- `npm test`: five passing tests. They exercise sanitized Markdown, content
  validation, correct/incorrect credentials, authentication and CSRF denial,
  draft privacy, publish/unpublish, optimistic concurrency, recoverable delete,
  restore-as-draft, rejection of untrusted identity headers, and salted scrypt.
- npm install audit: zero reported vulnerabilities at installation.
- PowerShell preparation script parses successfully; ConfigureApp has not run.
- `git diff --check`: no whitespace errors (Windows line-ending notices only).

## Real Azure checks

- Created Standard_LRS StorageV2 account with HTTPS/TLS1.2, no public blobs and
  shared-key authentication disabled; metadata table and private containers exist.
- SDK smoke test passed draft create/read/list/update, rejected stale writes and
  media upload/read; all transient smoke-test data was cleaned up.
- Browser editor saved a private draft to Azure, showed Saved, and reloaded it
  after signing in through the real username/password form.
- Browser preview displayed the saved Markdown and orange insight styling.
- Browser Move to trash hid the editor and offered Restore as draft; restoration
  returned to a private editable draft. The unchanged verification-only draft and
  its bodies were removed afterward; no user articles were removed/published.

## Browser observations

Using the in-app browser's supported UI controls and viewport capability:
- Reader homepage inspected at 390x844 phone, 744x1024 tablet and 1280x900 desktop.
- Drawer inspected open and keyboard-focused: light mint links on evergreen,
  crisp foreground, orange focus marker, visible focus border, focus entry and
  Escape dismissal. Earlier implementation also checked focus wrapping and resize.
- Article anchors navigate to their sections; Copy code changes to Copied with an
  accessible status announcement. Article content and orange insight block inspected.
- Article directory inspected on phone; DevOps filters to one sample story and
  browser Back restores all three. URLs retain topic state.
- Admin login, desktop editor, narrow editor, native preview dialog and Escape
  dismissal were inspected. Real username/password login and logout were verified.
- Initial drawer contrast regression was caught by the user and corrected: the
  global blue link color no longer overrides drawer-specific light text.
- Screenshots: screenshots/home-desktop.jpg, screenshots/articles-mobile.jpg,
  screenshots/admin-login.jpg. They are actual local rendered results, not mockups.

## Contrast and animation

Computed using WCAG relative luminance, for the actual opaque palette pairings:
- Drawer links #D1FAE5 on #065F46: 6.78:1.
- Drawer light hover text #ECFDF5 on base #065F46: 7.29:1; translucent hover/press
  background variants still require their blended backgrounds to be considered.
- Drawer focus outline #6EE7B7 on #065F46: 5.04:1.
- Drawer caption #A7F3D0 on #065F46: 5.99:1.
- White on orange #FF6B00 is only 2.86:1: never use it for normal white button text.

Drawer labels move inside stationary 52px-high link targets. Hover/focus reveals
an orange marker, while press changes the tint and compresses the label slightly.
Reduced-motion CSS removes movement/transitions. A static screenshot cannot prove
animation timing; physical touch and OS reduced-motion switching remain to test.
The user's contrast-checker link could not be fetched by the research tool (403);
ratios above were computed directly rather than claimed to come from that site.

## Conservative design review

These are internal review heuristics, not measured usability scores. Each score
below 9 has a concrete follow-up; no claim of finished visual perfection.

| Dimension | First-pass score | Evidence and next improvement |
| --- | --- | --- |
| Usability | 8 | Directory/topic/back flow works; test a reader finding a specific article with real content and longer lists. |
| Hierarchy | 8 | Feature/secondary stories and editorial spacing are visible; test long real titles and more than one screen of results. |
| Accessibility | 8 | Drawer contrast/focus fixed; complete screen-reader, 200% text and physical touch/reduced-motion checks. |
| Consistency | 8 | Shared colors and interactions; reader uses Montserrat while admin currently falls back to system sans-serif. Unify after font review. |
| Responsiveness | 8 | Representative screenshots inspected; verify real iOS safe areas, virtual keyboard and landscape controls. |
| Feedback | 8 | Saved/copy/login/restore states verified; test interrupted uploads and slow/failing networks in the UI. |
| Performance | 6 | Lightweight server-rendered pages, reserved image sizes; no LCP/INP/CLS field evidence yet. Measure before release claims. |

## Release limitations

- Production HTTPS authentication, managed identity, secrets, ingress port migration
  from 80 to 8080, image deployment and rollback have not been validated.
- Docker daemon is not running on this machine; the new container has not been built
  or started locally. The code was tested directly with Node 22.18.0.
- Physical touch, real iOS Safari, actual screen-reader output, 200% text enlargement,
  long/dense articles, concurrency across deployed replicas and field Core Web Vitals
  have not been verified. No exhaustive WCAG compliance claim is made.
- Login is for a single owner, with no public registration. Password reset and
  permanent deletion UI are not implemented. Trash retains data and storage cost.
- Article body versions accumulate in Blob Storage; retention/export policy remains
  to be designed before high-volume autosave or long-term deletion guarantees.


## Final UI follow-ups

- View blog is now a rounded outline control with a proper arrow, 44px minimum
  height, hover lift, active state and keyboard focus treatment. Header/login
  screenshot refreshed. CSS honors reduced motion; hover timing is not measurable
  from a still image.
- Drawer group centered vertically with larger spacing; inspected in the phone
  browser after the user's feedback, with close control remaining at top.
- Mobile QR header inspected with the entire white quiet zone visible at page top.
  QR generation was independently decoded with jsQR to https://blog.drewclark.io.
  Physical camera scanning has not been tested. Actual render evidence:
  screenshots/home-mobile-qr.jpg. Desktop treatment is CSS-hidden below the
  mobile breakpoint; no external QR tracking service is involved.


## Latest drawer follow-up (supersedes previous layout screenshots)

QR is now inside the drawer header; no QR remains in the public header. Links start
around 110px down, with mint surfaces, 19px type, arrows and current-location marker.
Header/footer use normal flex flow; bottom branding includes Drew Clark and Software
Engineer. Captured settled result in screenshots/drawer-refined.jpg. Browser checked
initial close-button focus, reverse wrapping to GitHub and forward wrapping to close.
Stagger uses 8px/opacity keyframes; focused links override interim opacity/position
without restarting their animation. Gradient is limited to the approved green scale.


Latest placement refinement: QR occupies its own fully clickable horizontal row
between header and Articles, with an 88px image, explanatory text, visible destination,
12px radius and restrained translucent background. Header orange underline removed.
A small orange segment now sits within the footer divider above Drew Clark, carrying
the accent down the drawer without adding a competing separator. This supersedes
notes placing the QR beside the close button or in the public page header.


## Azure production rollout follow-up

The user authorized Azure CLI configuration and deployment after the initial merge.
The existing Container App now runs Node on HTTPS/8080 with managed storage access
and secret-referenced admin configuration. GitHub built the container successfully,
which supersedes the earlier local-Docker validation limit for that image (the local
Docker daemon still was not used). Initial live authentication and private draft
operations passed. The malformed-version 500 discovered during live validation was
corrected with an explicit version check and a regression assertion. See the repeatable
scripts/verify-production.js for post-deployment authentication, private CRUD, conflicts,
CSRF, media and logout verification. Test objects use unique IDs and are cleaned up.
GitHub's missing old Azure credential is replaced by scoped OIDC; the empty legacy
workflow is removed. The live blog intentionally contains no sample posts.


## Editorial foundation — October 30, 2026

Local branch codex/editorial-foundation: syntax checks and all five backend tests
pass. Rendered homepage reviewed at 390×844, 820×1180 and 1280×900. Measured
document widths stayed within each viewport; the feature changes from stacked to
twelve-column composition. The phone topic rail scrolls horizontally and keeps
AI & Experiments visible after selection. Phone article and admin login layouts
were inspected. Drawer Shift+Tab wraps from close to GitHub; Escape closes and
returns focus to the menu button. The QR and orange footer segment remain clear.

No-JavaScript fallback is present in server-rendered HTML and the menu toggle is
progressively enabled; a browser session with scripting disabled has not yet been
run. This pass did not repeat live CRUD or authenticated editor browser scenarios.
Production smoke verification after main deployment b213703 passed authentication,
private CRUD, publish visibility, stale/malformed versions, CSRF, media and logout;
test data was cleaned up. New foundation changes have not been deployed.

Conservative internal review: usability 8/10, hierarchy 8/10, accessibility 8/10,
consistency 9/10, responsiveness 8/10, feedback 8/10, performance 6/10. These are
heuristics, not measured quality. Priorities: validate no-script and text enlargement
with assistive technology; assess long real articles for navigation/reading feedback;
measure field performance and real cover-image payloads before adding effects.
Evidence: screenshots/foundation-desktop.jpg and screenshots/foundation-drawer.jpg.


## Article reading pass — October 30, 2026

Added optional active-section tracking (aria-current=location plus a green edge
and background), 44px section targets, a decorative 3px orange reading progress
line and a topic-specific next-reading link. Native section anchors and the
server-rendered article remain functional without these enhancements. Progress
excludes the thank-you/footer and is hidden by the reduced-motion media query.
Articles without contents now use one centered reading column.

Reviewed the sample article at 390×844, 820×1180 and 1280×900; document width
remained within viewport. Confirmed keyboard Enter navigates to section-3 and
updates the current section. Confirmed the next-topic link opens the filtered
AI & Experiments directory. Corrected early section advancement on tall screens
and premature progress at body entry during review. Screenshot: reading-desktop.jpg.
Syntax checks include the new reading module. All five backend suites pass.
Reduced-motion styling was inspected in source, not through OS emulation; long
real articles, screen-reader announcements and no-script browser sessions remain
follow-up validation. No production content or deployment changed in this pass.

Internal review: usability 8, hierarchy 8, accessibility 8, consistency 9,
responsiveness 8, feedback 8, performance 6 (out of 10; heuristics only). Prioritize
long-article and assistive-technology checks, then measured scrolling/field performance.
The small dependency-free enhancement batches passive scroll updates per animation
frame; this is an implementation choice, not a measured performance claim.


## Editorial motion pass — October 30, 2026

Implemented the first three priorities from the user's eight-feature direction:
card illustration zoom (1.025), orange corner reveal, masked two-line headline
entrance (420ms/80ms stagger), and QR/link/footer drawer choreography. Directional
read-link underlines and arrows complement these effects. Cards retain real links;
a stretched title anchor makes the card surface clickable. Keyboard focus activates
the same card treatment with one parent outline; touch gets a static corner state.
Motion is gated to prefers-reduced-motion:no-preference. No animation dependency.

Verified rendered phone drawer at 390×844 with named QR/footer animations and
85ms first-link delay; Escape returns focus. Verified full-card navigation at
820×1180 to the correct article. At 1280×900 verified keyboard card focus, settled
1.025 image transform, revealed corner, complete headline and a single focus outline.
Captured screenshots/editorial-motion-desktop.jpg. Syntax and five backend tests
pass. Hover motion rules and reduced-motion gates were inspected, but pointer-hover
and OS reduced-motion emulation were not independently exercised. No performance
benchmark or screen-reader claim is made. These changes remain local.

Review heuristics remain usability/hierarchy/accessibility/responsiveness/feedback
8, consistency 9 and performance 6. Prioritize pointer/reduced-motion device checks,
then actual motion/performance measurements; avoid increasing decoration to chase
scores. Shared-element navigation, moving category indicators and animated CUDA
diagrams are subsequent work, not implemented by this pass. Preserve static SVG
fallbacks and clearly distinguish illustrative paths from experimental results.


## Native page scroll progress — October 30, 2026

Replaced the article-body-only orange bar with one decorative page-progress bar
on public reader pages. Root scroll progress now reaches 100% at page bottom.
Supporting browsers animate scaleX and color using a CSS scroll(root block) timeline;
no JavaScript progress scroll listener is registered on that path. Article section
tracking remains independent. Unsupported browsers use a passive rAF fallback,
resize/content/font updates, clamped scroll math and seven RGB color anchors.
The fallback is not an exact port of the portfolio's HSL/vibrance algorithm.

Reviewed original portfolio HorizontalProgressBar.jsx, useScrollPosition.js and
colorInterpolate.js on GitHub. The source contains 26 stops (not 25). This blog
uses seven anchors: green500, green350, cyan, blue500, blue700, orange200, orange500.
The palette progression is preserved; detailed interpolation differs. CSS timeline
reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline/scroll

Browser verification: native timeline supported, scale=0 at top, scale=1 and
rgb(255,107,0) at bottom; at 0.719888 scroll fraction scale also equals 0.719888
and the color is blue. At 390px the bar is hidden while the drawer is open and
visible after Escape closes it, without document overflow. Screenshot scroll-progress.jpg.
Seven tests pass, including short/non-scroll pages, elastic overscroll and fallback
color anchors; syntax checks pass. Unsupported-browser fallback math is unit tested,
not independently rendered in a non-supporting browser. Reduced-motion CSS hides
the bar; OS emulation and performance tracing remain unverified. No claim of measured
main-thread or field-performance improvement. Not deployed.

Review heuristics unchanged: 8 for usability, hierarchy, accessibility, responsiveness
and feedback; 9 consistency; 6 performance. Next checks: unsupported browser and
reduced-motion device behavior, then actual performance measurements. This section
supersedes the earlier article-body progress measurement and orange-only behavior.


## Sticky navbar — October 30, 2026

Public navbar now uses sticky top:0 at layer40, below backdrop60/drawer70.
Shared header-height token is 76px desktop/64px phone, plus safe-area top padding.
Scroll progress sits immediately under it; anchor scroll padding and the sticky
article contents offset account for the header.
Verified desktop at scrollY714: header top0/bottom76 and bar top76. Article section-3
anchor top116 remains below header76; contents top92 remains visible. Phone390px
at page end: header top0, bar top64. Drawer layer70 remains above header40; bar
hides while open and Escape closes it. Syntax/diff checks pass. Screenshot:
screenshots/sticky-navbar.jpg. Safe-area CSS is present but a physical notched phone
was not tested. Internal review remains 8 usability/accessibility/responsiveness;
follow up with text enlargement and real-device safe-area testing. Not deployed.


## Viewport-triggered social icons — October 30, 2026

Read the five requested portfolio sources (Footer.jsx, useIntersection.js,
styles/plugins/animations.js, tailwind.config.js, styles/constants.js) before
implementation. Adapted to the Node/server-rendered blog; no React or animation
dependency. Preserve existing Portfolio and GitHub destinations and visible text.
Added decorative 24px SVG icons inside stable semantic links with 44px targets.

Reusable initInViewAnimation shares one observer across groups, starts at ratio .1
with bottom rootMargin -12px, resets at zero visibility (hysteresis), and supports
explicit disposal, idempotent remount, configurable replay/threshold/rootMargin,
and live reduced-motion changes. Generation guards reject stale observer callbacks.
CSS custom properties configure duration, stagger, colors and easing. No sequencing
timers: removing the class cancels active and delayed CSS animations immediately.
Pulse: 2000ms, delays0/800ms, scales1/1.15/1.2/1.15/1, forestgreen to orange and
back; 3px/35%-opacity orange drop-shadow only near peak; easing(.4,0,.2,1), once
per entry. No permanent will-change and no layout-property animation. Reduced
motion and missing IntersectionObserver leave functional static links.

Browser evidence: before entry animation=none; after entry both durations2s,
delays0/.8s and iterationcount1. After completion transforms/filter none and colors
rgb(6,95,70). Home scroll resets class and animations; End replays. Footer reviewed
at390×844,820×1180 and1280×900 without document overflow; both targets44px.
Tab reaches GitHub and its outline is solid. Screenshot social-footer-mobile.jpg.
CSS defines peak scale/glow; peak-time pixels were not separately captured.

All11 Node tests pass, including mocked observer threshold/hysteresis, re-entry,
disposal, remount, stale callbacks, initial/dynamic reduced motion, missing observer,
non-replay and multiple groups sharing one observer. Syntax/diff checks pass.
No build/lint/typecheck scripts exist; no dependency or build step was introduced.
OS reduced-motion rendering and screen-reader testing remain unverified; behavior
is covered with mocked media-query changes and the CSS motion gate. No performance
trace or measured CLS/main-thread-overhead claim; target layout remains fixed while
only icon transforms/color/filter animate. Not deployed.

Review heuristics: usability8, hierarchy8, accessibility8, consistency9,
responsiveness8, feedback8, performance6. Follow up with actual reduced-motion
devices/screen readers and a performance trace; retain text labels and avoid
expanding the effect to unrelated navigation.


## Shared-element article transitions — October 30, 2026

Local branch codex/article-view-transitions adds native cross-document transitions
from homepage/directory card illustrations to article heroes. Each story gets a
stable hex-encoded slug identifier, unique even when image URLs repeat. External
CSS reads data-transition-name through typed attr(), respecting the existing CSP
(no inline styles or weakened policy). Both pages opt in through @view-transition
only when typed attr is supported and reduced motion is not requested.

Artwork travels for320ms using shared timing tokens; page chrome does not animate.
One clean incoming image replaces the double-image crossfade; unrelated outgoing
snapshots are hidden. Links, Back, direct loads and modifier/new-tab navigation stay
native: no router interception, fetch, timers, added JavaScript or dependencies.
Admin does not opt in. Browsers without both cross-document transitions and typed
attr retain ordinary navigation. Reduced motion explicitly disables navigation
transitions. References: MDN View Transition API/Using and CSS/Reference/Values/attr.

Browser verification in IAB: three distinct computed names on homepage/directory;
hero name matches source. Captured actual mid-flight card-to-CUDA-hero image at
1280×900 (screenshots/shared-element-desktop.jpg), then verified clean settled page.
Phone390×844 keyboard Enter opens the correct article without document overflow.
Tablet820×1180 directory-to-DevOps transition was captured during flight; Back
returns to the directory. Initial tests exposed blocked inline styling, duplicate
image crossfade and floating unrelated snapshots; corrected before final review.

All13 Node tests pass, including unique names across home/directory/detail and
CSS-safe stable identifiers independent of cover URLs. Syntax/diff checks pass.
Non-supporting browser and OS reduced-motion rendering are not independently
emulated; fallbacks verified in source. No screen-reader or performance-trace
claims. Transition coverage on physically notched devices and slow uncached media
remains follow-up work. No production articles were added; this pass is local.

Review heuristics: usability8, hierarchy8, accessibility8, consistency9,
responsiveness8, feedback8, performance6. Priorities: real-device reduced-motion
and unsupported-browser checks, then slow-image/performance tracing. Keep this
brief enhancement rather than adding blocking loaders or artificial delays.

Earlier foundation/motion/scroll/navbar/social changes were deployed via PR5 and
cache-refresh PR6. Main0f79f03 deployed successfully; production authentication,
private CRUD/privacy/conflicts/CSRF/media/logout checks passed after credential
configuration. Normal live reload confirmed sticky header and footer pulse delays.
That deployment is separate from the new local shared-element pass.

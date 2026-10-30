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

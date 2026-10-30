# Beyond the Stack

Drew Clark's engineering journal: **Full Stack Web Development**, DevOps, and
learning with AI. Node.js 22 + Express serve the reader pages and admin API.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env
node scripts/setup-admin.js
npm run dev
```

Open http://127.0.0.1:3188/ and http://127.0.0.1:3188/admin.
The admin has a real username/password login. Setup creates a salted scrypt hash
and a strong session secret in ignored `.env`; the generated initial credentials
are handed off privately in ignored `.azure-local/admin-login.txt`. Save the password
in your password manager and remove that handoff file afterward. The UI supports
password-manager autocomplete. No plaintext password is stored in application config.
Design-preview articles are labeled samples and never inserted into Azure automatically.

Without AZURE_STORAGE_ACCOUNT, development drafts persist in ignored
`.data/posts.json`. To use Azure, sign in with `az login`, add
`AZURE_STORAGE_ACCOUNT=drewblogdata` to `.env`, and restart the server. The Azure
SDK uses your CLI identity locally and managed identity in production; no storage
connection strings or account keys are used. The current machine's ignored `.env`
is already connected to drewblogdata.

## Implemented

- Server-rendered homepage, article directory, topic navigation and article pages.
- Approved green/orange/blue/gray palette; clipped feature artwork corner with
  orange edge, orange featured marks and article insight callouts.
- Root-level modal drawer: backdrop layer 60, drawer layer 70, dynamic viewport
  height, independent scrolling, page scroll lock, inert background, focus
  containment/return, Escape/backdrop/link dismissal and desktop resize cleanup.
- Mobile-only drawer-header QR code for https://blog.drewclark.io, generated locally
  and independently decoded. Drawer links start directly below the compact header.
- Drawer hover/focus text glide and orange marker; touch press feedback; reduced
  motion support. Drawer links are mint on evergreen, not global blue links.
- Markdown editor, explicit draft saves, publish/update, unpublish, recoverable trash and restore, private preview,
  unsaved-change protection, upload feedback and stale-save conflict rejection.
- Sanitized article HTML and CSRF checks on writes. Cover upload accepts PNG/JPEG/
  WebP up to 5 MB; blobs remain private and images are served by the Node API.

## Storage and deployment

Read [the Azure architecture and release checklist](docs/AZURE_ARCHITECTURE.md).
Azure Table Storage holds metadata; private Blob Storage holds article bodies and
images. The storage account is provisioned and smoke-tested. **The Node application is deployed at https://blog.drewclark.io.** It uses the
existing Container App and domain, with production storage and admin secrets configured.

Production requires AZURE_STORAGE_ACCOUNT and a managed identity with scoped
Table/Blob data roles. Store ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET as
Container App secrets; set ADMIN_USERNAME and PUBLIC_ORIGIN. Cookies are secure,
HTTP-only and SameSite Strict in production. Sign-in attempts are rate-limited.
Microsoft Entra Easy Auth remains an optional alternative; never enable
TRUST_AZURE_AUTH without that platform authentication sidecar.

The container now runs Node rather than NGINX. The GitHub workflow runs checks and tests, publishes immutable image tags, and
uses a blog-scoped OIDC managed identity for Azure deployment. Missing production
settings cause an explicit deployment skip. No long-lived Azure login secret is needed.

```powershell
npm run check
npm test
# Explicit cloud write/read/conflict/media smoke test with cleanup:
$env:AZURE_STORAGE_ACCOUNT='drewblogdata'
node scripts/verify-storage.js
```

## Design decisions

Use the exact green, orange, blue and gray scales in `front/js/colors.js` and
`front/style/colors.css` for reader and admin UI. All 42 values match, including
green 350 (#51DDA8) and 950 (#015338). Green 950 is lighter than 900 despite its
label. Choose actual text/background pairings by measured contrast.

- Green: navigation and primary actions. Orange: selective editorial emphasis.
- Blue: reading links. Gray: reading surfaces, text and rules.
- Preserve the approved geometric simulation art direction; no organic
  tadpole/sperm-like hero illustrations.
- Research and motion/clip-path decisions: [UI_UX_DIRECTION.md](docs/UI_UX_DIRECTION.md).
- Verification evidence and remaining work: [VALIDATION.md](docs/VALIDATION.md).

`back/views.js` owns reader HTML, `front/admin.html` the editor shell. The old
`front/index.html` is retained for history but `/index.html` redirects to the
server-rendered homepage. Use the Node server, not a static file server.


## Production verification

Production uses 0.25 vCPU / 0.5 GiB, scale-to-zero with max 2 replicas, HTTPS ingress
on 8080 and HTTP startup/readiness checks on `/health`. Admin credentials match the
private local handoff; only their hash and session secret are stored as Azure secrets.
No design-preview stories are published automatically; the live journal starts empty.
`node scripts/verify-production.js` explicitly tests live private CRUD and media,
then removes only its uniquely named test objects. It needs the private handoff and
an Azure CLI identity authorized to clean up those test records.

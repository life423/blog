# Azure architecture and first release

Updated October 30, 2026. This is a first implementation, not a live release.

## What is provisioned

Azure CLI is signed in to the drewclark.io subscription. Existing public hosting is
Container App `blogportfolio` in `portfolio-apps`, East US 2, with the custom domain
`blog.drewclark.io`. Its current NGINX image is still running. No live image,
custom-domain binding, scaling configuration or authentication setting was changed.

Created `drewblogdata` in the same group/region, StorageV2 / Standard_LRS / Hot:
- Table `posts`: article metadata and optimistic-concurrency ETags.
- Private container `articles`: versioned Markdown bodies; avoids Table Storage's
  individual string-property size constraints.
- Private container `media`: uploaded PNG/JPEG/WebP files.
- HTTPS-only, minimum TLS 1.2, anonymous blob access disabled, shared-key access
  disabled. CLI identity currently has scoped Table/Blob Data Contributor roles.
- Node SDK uses Azure CLI credentials locally. Production will use a system-assigned
  managed identity granted only the two required data roles on this account.

The local Node app is connected to real Azure storage. Test samples remain code-only
preview content and are never automatically published to the account.

## Why this choice

For a small single-author journal, Table + Blob avoids paying for an idle database
server. Metadata lookups use one partition and article slug keys. This has no SQL
joins/full-text engine; later scale/search needs may justify a different store.

Reuse the existing Container App rather than adding a second server/environment or
registry. Target 0.25 vCPU / 0.5 GiB, min replicas 0, max 2 for the first release,
subject to load/memory checks. Scale to zero saves idle compute but introduces cold
starts. These settings are prepared, not yet applied. Container Apps free grants
are subscription-wide and shared with the user's other apps, so they are not a
promise that this blog's hosting is free.

Static Web Apps Free plus a Node Functions API is a lower fixed-hosting-cost
alternative worth keeping open. It would require changing the serving/auth/deploy
architecture. Reusing existing hosting is the selected practical starting point,
not proof of the absolute cheapest configuration at every traffic level. No
always-on SQL/PostgreSQL tier, new ACR, Front Door, or Redis was created.

## Pricing snapshot, not a bill forecast

Queried Microsoft's Azure Retail Prices API for East US 2, USD consumption on
October 30, 2026. Relevant meters:

| Meter | Retail price |
| --- | --- |
| Standard LRS Tables data | $0.045 / GB-month |
| Standard LRS Tables reads/writes/list/scan/delete | $0.00036 / 10,000 operations |
| General Block Blob v2, Hot LRS, first storage tier | $0.0184 / GB-month |
| Hot LRS blob read operations | $0.004 / 10,000 |
| Hot LRS blob write operations | $0.05 / 10,000 |

Illustrative storage-only workload: 1 GB blobs + 0.1 GB metadata + 100,000 blob
reads + 100,000 table operations + 1,000 blob writes is about $0.072/month at those
meters. This excludes compute, logging, egress, retrieval patterns, extra operations,
retained old bodies and taxes. It is not an estimate of the total Azure bill.

Sources:
- https://prices.azure.com/api/retail/prices
- https://azure.microsoft.com/en-us/pricing/details/storage/tables/
- https://azure.microsoft.com/en-us/pricing/details/storage/blobs/
- https://azure.microsoft.com/en-us/pricing/details/container-apps/
- https://learn.microsoft.com/en-us/azure/container-apps/billing
- https://learn.microsoft.com/en-us/azure/static-web-apps/plans

## CRUD and authentication

Reader routes are server-rendered: `/`, `/articles`, `/articles/:slug`.
Public APIs expose published posts only. Topic links retain filter state in URLs.
Admin routes and every admin data operation require an authenticated session.

| Operation | API | Behavior |
| --- | --- | --- |
| Create | PUT /api/admin/posts/:slug | Create draft or explicitly publish |
| Read | GET /api/posts or admin posts endpoints | Public published-only; admin all statuses |
| Update | PUT /api/admin/posts/:slug | Version checked; stale writes return 409 |
| Delete | DELETE /api/admin/posts/:slug | Move to recoverable trash, hide publicly |
| Restore | POST /api/admin/posts/:slug/restore | Restore as private draft |
| Preview | POST /api/admin/preview | Sanitized Markdown, no save required |
| Upload | POST /api/admin/media | Authenticated, size/signature checks |

There is no permanent-delete UI yet. Trash retains bodies and images, which continue
to incur storage charges; a future retention/export policy should be explicit.

The user requested a real login form after rejecting the development shortcut.
Username/password login now uses salted scrypt password hashes, rate-limited attempts,
HTTP-only signed session cookies, SameSite Strict and Secure cookies in production,
and Origin plus custom-header checks on API writes. Session signing secret must be
shared across replicas. No plaintext password is stored in application configuration.
`node scripts/setup-admin.js` initializes credentials without overwriting an existing
password. Its private initial handoff is `.azure-local/admin-login.txt`, excluded
from Git/Docker. Store it in a password manager and remove the handoff file afterward.

Microsoft Entra Easy Auth remains an optional alternative, not a completed setup.
Only enable TRUST_AZURE_AUTH behind the platform sidecar; never trust these headers
on a directly exposed Node port.

## Release steps still required

1. Complete review of the reader and editor using real content; samples are not posts.
2. Run `scripts/prepare-azure.ps1 -ConfigureApp` after reviewing its concrete changes:
   assign managed identity, scoped storage roles, Azure secret references, owner login,
   production flags, public origin, and proposed small/scale-to-zero resource limits.
   This changes app settings but does not upload a new code image.
3. Build the Node container, verify non-root startup and health with production-like
   storage/secrets, deploy an immutable image, and validate the domain/ingress port.
   The former NGINX image listened on 80; Node listens on 8080. Update ingress to
   target 8080 as part of rollout. Do not deploy with the old ingress target.
4. Verify real HTTPS sign-in/sign-out, anonymous draft/trash denial, persistent CRUD,
   image uploads, rollback and all representative reader/admin screens on Azure.
5. Measure actual request/cold-start/log usage and add a reviewed cost-alert threshold.
   Budget alerts are notifications, not hard spending caps.

Current CI runs syntax checks and tests. A preflight refuses Node deployment until
storage is configured. Production credentials, managed identity and port migration
must also be completed before approving a release. No deployment was attempted.


Merge workflow protection: pull requests run application checks. Main builds publish
only immutable commit-SHA image tags, never overwrite the live app's legacy `latest`
tag. Missing production configuration produces an explicit successful preflight skip
and job summary, rather than a partial rollout or intentionally failing the build.

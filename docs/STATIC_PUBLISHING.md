# Static public blog and private editor

The user approved Azure Static Web Apps **Free** on November 21, 2026, while
retaining the existing editor, drafts, automatic publishing and GitHub CI/CD.
This supersedes the earlier prohibition on static publication copies. The
no-always-on-compute requirement remains: backend minimum replicas **0**,
maximum **2**, 0.25 vCPU and 0.5 GiB. Do not change to a paid SWA plan.

## Hosting

- Public app: `beyond-the-stack`, resource group `portfolio-apps`, Free SKU.
- Azure public URL: `https://polite-smoke-0976b660f.6.azurestaticapps.net`.
- Live custom domain: `https://blog.drewclark.io` (verified HTTPS, Free SKU).
- Editor: `https://blogportfolio.victoriouspebble-1de6fe12.eastus2.azurecontainerapps.io/admin`.
- Public `/admin` redirects to that editor; login credentials and private storage
  stay in the existing Container App. The editor can still have a cold start.
- Storage remains `drewblogdata`, with its existing managed identity/RBAC and
  private `articles` and `media` containers. No account keys are enabled.

## Publication and privacy

Public create/update, unpublish and trash atomically commit a publication request
alongside the article metadata in one Azure Table transaction. `_publication` is
a reserved row in the `post` partition, explicitly excluded from article lists.
Draft saves and restoring a draft do not request public deployment.

The backend asynchronously renders a **complete replacement** of the public
site. Only published articles and images referenced by the rendered public HTML
are exported. The private editor, draft metadata, ETags, blob keys and Markdown
source are excluded. Topic navigation uses generated paths; older `?topic=`
bookmarks are redirected by public-site JavaScript. Unknown/removed articles
return HTTP 404; there is no SPA fallback exposing another article.

A 60-second Azure Blob lease, renewed every 20 seconds during work, serializes
deployments across backend replicas, local recovery and CI. A request arriving
during deployment triggers another pass with current storage content. Changed
article versions/statuses abort the export instead of leaking a new draft.
Deployments retry three times. Pending requests survive process loss and resume
on backend startup or an authenticated status check. No recurring keepalive or
public-reader request is needed. Persistent failure is shown in the editor with
a Retry action; saved text is retained. Publishing is asynchronous: the previous
public release remains visible until the atomic SWA deployment finishes.

Microsoft's official `StaticSitesClient` is pinned to build
`a58ffd5ddfced557500b295844f2490acc313951`, SHA-256 verified during the Docker
build. The runtime is Node 22 on Debian Bookworm with the native client libraries.
The deployment token is a Container App secret and a child environment value,
never a public file or command argument. The child receives only deployment
settings, not admin credentials or managed-identity endpoint credentials.

## CI/CD

The existing GitHub workflow still checks/tests, builds an immutable Docker image,
smoke-tests it, and deploys the backend through scoped Azure OIDC. It then waits
for readiness and calls the backend's serialized publication path. The published
`deployment.json` identifies the source release and publication request.

`EDITOR_ORIGIN` is a repository variable. `PUBLIC_DEPLOY_TRIGGER_SECRET` is a
separate repository/Container App secret authorizing only a public rebuild/status
check, not draft access. `SWA_DEPLOYMENT_TOKEN` lives only in the backend's Azure
secret. Do not store a personal GitHub token or storage account key for publishing.
Workflow concurrency prevents older main releases overtaking newer ones.

## Recovery and rollback

Use `node scripts/refresh-public-site.js` with the CI origin/trigger credential to
refresh from the deployed backend. `node scripts/deploy-static-site.js` is an
explicit local bootstrap/recovery route using an authorized Azure CLI identity,
the same lease, and private environment configuration. Never print credentials.

Keep the original Container App custom-domain binding and certificate during DNS
propagation and rollback. Restoring the previous CNAME returns public readers to
the existing dynamic server. Neither rollback nor DNS changes should modify
article data, draft visibility, login secrets, storage RBAC or minimum replicas.

## Verification at implementation

27 source tests and five bundled backend checks pass locally and in GitHub CI. New cases exercise
private-data exclusion, image export, unpublish removal, changed-draft rejection,
serialization across replicas, newer changes during deployment, failure/restart
recovery, public mutation triggers and transactional outbox creation.

The initial real-content export has two published articles. Its Azure URL serves
the homepage, article JSON and real 404s, and `/admin` redirects to the existing
backend. Initial HTML response was 0.29 seconds. This is one response-time sample,
not a complete browser rendering benchmark or a percentile.

## Completed production migration — November 21, 2026

Deployed application release: `f0dccff19a0bc299bffaa222c2c16349108bf6cb`,
healthy Container App revision `blogportfolio--0000023`.
[GitHub CI/CD run 44941426332](https://github.com/life423/blog/actions/runs/44941426332)
passed all check, image build/container smoke and backend/static deployment jobs.
PRs #20–22 contain the migration and integration corrections. The first rollout
exposed a readiness race and the native deployment client's need for a writable
working directory; both were corrected and subsequently deployed successfully.
CI requests now identify their intended release so retiring replicas cannot
consume a newer release request.

After Squarespace SMS reauthentication, the blog CNAME was changed to
`polite-smoke-0976b660f.6.azurestaticapps.net` with TTL 300 seconds.
`_dnsauth.blog` contains the SWA ownership proof. Azure reports the custom domain
**Ready** with its automatically managed HTTPS certificate. Authoritative DNS and
Google DNS return the new CNAME. No Ascend Avoid, Connect, CUDA or portfolio
routing records were changed. The old blog binding/certificate remain intact
for propagation and rollback; previously cached records had a four-hour TTL.

Fresh Node HTTPS requests through the normal `blog.drewclark.io` hostname verified
`data-static-public` on the homepage, directory, topic pages and CUDA article.
The first request including HTML download took 413ms; subsequent connection-reused
page requests took 60–63ms. Five independent curl processes against the static
Azure hostname measured 191–223ms TTFB. These small samples are response timings,
not field Core Web Vitals or latency percentiles. The browser profile and Windows
curl used earlier in the investigation still reused the former server during
the immediate cutover; the original backend remains available for those clients.

An authenticated live smoke test used a uniquely named temporary article and
image against the real backend and temporary SWA URL. It verified:

- Draft save did not enqueue deployment or expose the draft; private preview worked.
- Publish exported the article, homepage entry and uploaded image (37.64s).
- Updating replaced the article text and directory title (22.30s).
- Unpublishing returned the article and its exported image to HTTP 404, removed
  listing entries, and preserved the private draft and preview (59.27s, overlapping
  the final code rollout).
- Trash/restore kept the article private; unauthenticated private API access was
  rejected; logout worked. Only that test's records, body versions and image were
  deleted. Final public JSON and deployment metadata contain the original two
  published articles and no temporary validation article.

The separate existing production smoke script also passed real login/secure
cookies, draft CRUD, trash/restore, stale-version rejection, CSRF and media tests.
Browser login succeeded at the editor's direct HTTPS origin with the existing
credentials; its public-site status displayed "Public site is up to date."
`blog.drewclark.io/admin` returns the expected editor redirect.

Rendered checks used the static Azure URL while the custom domain's browser
connection cache was transitioning: phone 390×844, tablet 820×1180, and large
desktop. No horizontal document overflow or broken rendered images was observed.
Mobile drawer open/Escape/focus return and generated topic/article navigation
worked. Phone/tablet editor status remained readable without overflow. Screenshots
and raw timing receipts are in ignored `.azure-local/validation/` and
`.azure-local/static-live-evidence.json`. Native cross-document View Transition
aborted/opt-in-disabled messages appeared during browser navigation; content and
navigation still worked. Do not report a zero-console-error result.

Conservative internal review of the small editor status addition, not measured
quality scores: usability 9, hierarchy 9, consistency 9, responsiveness 9,
feedback 9, accessibility 8, performance 8. Recommendations below 9, in priority
order: (1) complete manual screen-reader/live-region and enlarged-text checks
before claiming full WCAG conformance; (2) measure real browser LCP/INP/CLS and
investigate the existing View Transition console messages separately. No field
Core Web Vitals or exhaustive accessibility audit was performed in this migration.

Final infrastructure check: backend min/max **0/2**, image as above, SWA **Free**.
Public visits do not call the backend. The private editor can still cold-start;
there is no keepalive, paid SWA upgrade, or always-running replica requirement.

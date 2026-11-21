# Static public blog and private editor

The user approved Azure Static Web Apps **Free** on November 21, 2026, while
retaining the existing editor, drafts, automatic publishing and GitHub CI/CD.
This supersedes the earlier prohibition on static publication copies. The
no-always-on-compute requirement remains: backend minimum replicas **0**,
maximum **2**, 0.25 vCPU and 0.5 GiB. Do not change to a paid SWA plan.

## Hosting

- Public app: `beyond-the-stack`, resource group `portfolio-apps`, Free SKU.
- Azure public URL: `https://polite-smoke-0976b660f.6.azurestaticapps.net`.
- Intended custom domain: `https://blog.drewclark.io`.
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

25 source tests and five bundled backend checks pass locally. New cases exercise
private-data exclusion, image export, unpublish removal, changed-draft rejection,
serialization across replicas, newer changes during deployment, failure/restart
recovery, public mutation triggers and transactional outbox creation.

The initial real-content export has two published articles. Its Azure URL serves
the homepage, article JSON and real 404s, and `/admin` redirects to the existing
backend. Initial HTML response was 0.29 seconds. This is one response-time sample,
not a complete browser rendering benchmark or a percentile.

Production backend rollout, publish/update/unpublish smoke testing, custom-domain
certificate/DNS cutover and responsive browser verification must be recorded
before calling the migration complete. Squarespace requested SMS reauthentication
before the domain-validation record could be added.

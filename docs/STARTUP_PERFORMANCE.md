# Startup investigation — November 1, 2026

The user wants faster first visits without higher hosting cost. Keep 0.25 vCPU,
0.5 GiB, minimum replicas 0, maximum 2. Do not introduce keepalive traffic,
always-on replicas, static publication copies, caching of article state, or a new
hosting service to mask the problem.

## Evidence and diagnosis

Both the portfolio and blog use Container Apps with minimum replicas 0. Ascend
Avoid and My Private Teacher have minimum 1 and are not equivalent cold-start
comparisons. The blog's existing 74,238,144-byte image pulled in 308ms in one
Azure startup trace; startup probes saw connection refused at one and three
seconds. These observations identify a readiness delay, not its complete cause.

The source server eagerly loads Azure Table, Blob and Identity SDKs before
listening. A production bundle resolves 1,028 source/dependency modules at build
time instead of opening them individually in each fresh server process. Storage
reads, authentication, validation, publishing and all routes remain runtime work.
This moves module-resolution work to the build; it does not defer that work to
the first public request or falsely declare an uninitialized app ready.

Five fresh-process comparisons on this Windows development machine:

| Measurement | Source | Bundled |
| --- | ---: | ---: |
| Median listening | 533ms | 152ms |
| Median successful HTTP health response from spawn | 539ms | 157ms |

An earlier separate five-run comparison measured blog source 704ms and portfolio
442ms; a later bundle/portfolio comparison measured 163ms and 527ms. Different
runs have different filesystem/CPU conditions. Use the paired source/bundle run
for the improvement estimate (~71% lower local process-start latency). These are
local warm-filesystem, fresh-process measurements, not Azure cold-start or page
render benchmarks. They exclude image allocation, ingress readiness, cloud
identity token acquisition and storage latency.

Reproduce with `npm run build` then `node scripts/benchmark-startup.js`. This
benchmark starts only ephemeral loopback listeners, checks health and terminates
every child. It reads no real articles and makes no Azure requests.

## Implementation and validation

The Docker build bundles the Node backend as ESM for Node 22, preserving the
back/front layout for import.meta-relative assets. The runtime image contains
the bundle, package metadata and frontend, with no node_modules tree or build
tool. Dev execution remains unbundled for normal watch behavior. Startup logs
include process age when listening, without credentials or user data.

All 15 existing tests pass, then the five backend tests are repeated against the
production bundle: authentication, private drafts, publish/unpublish, optimistic
concurrency, CSRF, password hashing, Markdown sanitization and static assets.
The bundled app also read the real Azure-backed homepage and Ascend article
locally through Azure CLI credentials. Cloud managed identity still needs the
production smoke check after deployment. Docker Desktop's Linux engine was not
running locally; the actual Linux image is built by the existing CI workflow.

Deployment must retain scaling/resources, verify managed-identity storage access,
public articles/media, private publishing and healthy revision. End-to-end cold
startup can still include platform allocation, identity and storage costs. Do not
promise instant uncached first loads or a specific Azure improvement from local
import benchmarks alone.

# Cold-start comparison — November 1, 2026

## Confirmed baseline

Both apps use the same Container Apps environment and Consumption profile, minimum
replicas 0, maximum 2, 0.25 vCPU and 0.5 GiB. No keepalive, larger instance or new
service is authorized for this investigation.

After the control plane reported no replicas:

| Request | Time to first byte | Total |
| --- | ---: | ---: |
| Blog article, revision 0000009 | 26.252s | 26.252s |
| Same article immediately afterward | 0.223s | 0.224s |
| Portfolio homepage, separate genuine cold request | 9.274s | 9.274s |

The cold and warm article HTML were byte-identical. The portfolio request began
at 17:51:25.673 UTC. These are individual observations, not cold-start percentiles.

Use actual event timestamps (`time_t`/`TimeStamp_s`) when reading Log Analytics,
not `TimeGenerated`: events can arrive later and in batches.

Blog replica n9nn6: assigned 17:49:34.568; application container started
17:49:53.840, a 19.27-second gap. The image pull itself took 201ms. Node logged
listening at 17:49:55.198, process startup 1,361ms. Portfolio replica 7mfxz:
assigned 17:51:26.990; application container started 17:51:33.264, a 6.27-second
gap; image pull 209ms. This isolates a substantial pre-application provisioning
delay. It does not identify Azure's internal implementation as a proven cause.
The blog uses system-assigned managed identity; the portfolio does not. Do not
remove secure storage authentication based solely on that correlation.

## Bounded change under test

Keep the existing HTTP `/health` checks. Remove initial readiness delay and check
startup/readiness every second instead of waiting two/five seconds. Keep the
nominal startup window at 60 seconds and readiness failure window at 15 seconds.
The deployment patch preserves the current complete template, credentials,
resources and scale settings, changing only the image and probes together.
This can shorten readiness gating; it cannot eliminate a platform scheduling gap.

Public page/API responses also expose only the storage-read duration through
`Server-Timing: storage;dur=...`. No content is cached or copied, no authentication
is deferred, no tokens/IDs are logged, and no background traffic is added.

All 15 source tests and the five repeated bundled backend tests pass, including a
check for the timing header. Syntax and whitespace checks pass. Deployment and
fresh zero-replica measurements must establish whether the probe adjustment helps.

## Reproducing a cold comparison

1. Read replica counts through Azure's control plane; do not poll public URLs.
2. Wait for both apps to have no replicas. Keep the apps unvisited while waiting.
3. Run `node scripts/measure-cold-request.js unique-label` exactly once. It requests
   the blog health endpoint and article concurrently, plus the portfolio homepage.
4. Inspect the stored UTC start/end times, curl DNS/TLS/TTFB durations, response
   headers and public HTML under ignored `.azure-local/cold-trace/unique-label`.
5. Correlate the replica's real event timestamps with the startup console log.

Concurrent blog health/article requests distinguish readiness from the first
storage read without comparing one cold request with an already-warmed app.
Treat failed or interrupted measurement runs as invalid and repeat after a new
natural scale-down. Do not claim a full solution from one improved observation.

## Follow-up isolation

Revision 0000010, confirmed zero replicas before 18:08:25 UTC: health TTFB
18.391s, article 21.743s, first storage read 3,046ms, immediate warm article
0.307s / storage 33.5ms. Application container started at 18:08:43.142,
roughly 17.24s after the request began. The improvement versus the earlier
26.25s observation includes variable platform provisioning time and cannot
all be attributed to probes.

Normalized the existing Docker Hub registry server from `index.docker.io` to
`docker.io`, matching the image prefix, Microsoft's container configuration
example, and the portfolio. Retained the existing username/secret reference;
no new registry or credentials. After confirming zero replicas again, the
18:19:12 UTC request took 19.086s for health and 22.296s for the article,
with 2,908ms storage time. This did not materially improve cold startup and
must not be described as the performance fix. Portfolio TTFB in that run was
9.038s, but its replica count was not checked immediately before that run;
the earlier independently confirmed cold sample remains the valid comparison.

The next diagnostic separates `auth`, `table`, and `blob` durations using
request-local AsyncLocalStorage. `table`/`blob` include their authentication
work; `auth` is a nested duration, not an additional duration to sum. Headers
contain numeric timings only, with no tokens, account names, or article data.
Concurrent requests are isolated, and private operations expose no new headers.

On newly deployed revision 0000011's first article read (not a zero-replica
measurement), auth took 2,750ms; table including auth 2,805ms; blob 73.5ms.
Selecting only `ManagedIdentityCredential` via `AZURE_TOKEN_CREDENTIALS` on
revision 0000012 retained the same identity/permissions and reduced the login
chain. Its first article read still spent 2,718ms on auth, table 2,762ms,
blob 97.4ms. The unused credential chain is therefore not the main delay.
The explicit production credential setting is retained for predictable auth;
local development keeps the normal default chain.

Important correction to the registry test above: its events subsequently showed
the pre-existing revision still referring to the old generated image-pull secret
while Azure reconciled the app-level registry change. Thus that run is confounded
and cannot establish the effect of canonicalizing the registry. New revisions
use the new configuration. Check for image-pull-secret warnings before accepting
the next cold measurement.

The initial `auth_http` policy hook did not run: ManagedIdentityCredential
replaces `additionalPolicies` with its own IMDS retry policy. Replace that hook
with a wrapper around the SDK's standard `createDefaultHttpClient` transport.
This records `auth_http` without inspecting request/response bodies or headers,
distinguishing token network time from SDK work. It is nested in `auth`;
durations are not additive. No auth retry/timeout policy is changed. A fake
managed-identity transport test verifies the hook executes and token caching
still prevents a second network request. The pipeline dependency was already
installed transitively at 1.25.0 and is now declared directly at the same version.

Azure's supported identity lifecycle `Main` is also under investigation. There
are no user init containers; restricting identity access to the main container
retains the same identity and storage RBAC. The raw ARM API confirms the setting
(the installed Container Apps CLI's model omits it from `show`). This is a
restrictive configuration experiment, not a proven cold-start optimization.

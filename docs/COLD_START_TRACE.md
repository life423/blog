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

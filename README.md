# Controlled merge-queue protocol lab

**SIMULATED REVIEW, NOT MODEL REVIEW.** This is a temporary public protocol lab.
Its `Automated Code Review` job checks only inert fixture structure and allowed
paths on a native PR event. It is not a model review or a GitHub approval.
Its `Unit, build, E2E, and package` job runs one real fixture guard, not those
production suites. Exact check names test queue protection identities only.

Owner task: `7163ffa5-facc-4f69-a30a-e3f1a9546a60`.
Repository: `hearsay-tools/cezar-queue-lab-7163ffa5`.
Public helpers copied unchanged from public `hearsay-tools/cezarion` commit
`e49be8dc4dfdc43795986f651bd29a261f243df5`; hashes are in `lab/manifest.json`.
No product code runs. No model, package publisher, custom runner or secret is used.
Git blobs contain comments only; candidate code is never executed.

The fixture starts at 1,500 lines. A removes 100 lines. B removes the same 100
and adds 80 elsewhere. Each PR shrinks its original base. After A lands, B's
combined tree grows the integrated source from 1,400 to 1,480 and must fail.
The unchanged queue admission helper checks official live rules, entry and native
run evidence. Any refusal stops the experiment; it is never bypassed to reach merge.

Literal equality of the merge-group head SHA, landed commit SHA and main-push SHA
is required. Tree or ancestor equivalence is not enough. The reduced job roster
cannot supply positive production reuse. Main-push fallback must run. Its work
job is explicitly a sentinel, not production heavy work. No successful lab result
proves production model review integration or successful production-roster reuse.

Budget: six total workflow attempts including bootstrap, 20 runnable jobs maximum,
60 runner-minutes, two PRs, one ruleset, zero models, 90-minute wall deadline.
No retries or replacement pushes. Preserve all failures. Evidence artifacts include
only explicitly selected event/queue/run/job/rule fields. Never upload complete
GitHub context, environment, credentials, signed URLs or unrelated repository data.
All actions are pinned; tokens are read-only. The owner retains local snapshots.
No automatic repository deletion or resource cleanup is authorized.

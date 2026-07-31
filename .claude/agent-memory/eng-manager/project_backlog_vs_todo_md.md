---
name: project-backlog-vs-todo-md
description: The Linear LOY board was reset on 2026-07-30 after going stale; TODO.md is the real near-term backlog — always reconcile Linear, TODO.md, and the repo before triaging
metadata:
  type: project
---

The LOY board and the repo drift apart in a consistent direction: **Linear tends to accumulate
coarse, one-line epics that are not updated as work lands, while `TODO.md` holds the actual
near-term backlog.** Neither alone is trustworthy.

**Board reset on 2026-07-30.** At the first triage of this board, all 9 issues (LOY-1..9) had been
created 2026-07-02 and were untouched since 2026-07-07, while ~20 commits of real API work landed.
Five of them (controllers/services/repos, IoC, unit/integration/e2e tests) sat in Backlog while
the repo showed them substantially delivered; 7 of 9 had empty descriptions and no priority,
estimate, or project. Karim said he would rather delete stale issues outright than reconcile them
one by one — but **as of 2026-07-30 LOY-1..9 all still exist** (LOY-1/LOY-2 In Progress, LOY-3..9
Backlog with no project). The cleanup was agreed and never executed, so treat those nine as known
dead weight rather than signal. LOY-10 (`GET /balances/{id}/transactions`) is the first issue of
the rebuilt board; LOY-11/12/13 followed.

**Why:** this is a solo project where work happens in the editor and the board is updated only
when someone remembers. The board is a planning artifact, not a system of record. Karim would
rather bulk-delete a misleading backlog than maintain fiction in it.

**How to apply:**

- Never report Linear status as current state. For any triage or "what's next" question,
  cross-check three sources — Linear, `TODO.md`, and the repo (`git log`, controller decorators,
  `find` for test files) — and lead with the discrepancies; those are the highest-value finding.
- `TODO.md` drifts too, just less (it listed `GET /balances` unchecked when the controller
  already had `@Get("/")`). Verify its checkboxes against code before citing them.
- When proposing cleanup of a stale issue, offer deletion/closure as a real option — he has
  already chosen that once over incremental reconciliation.

Two themes survived the reset as genuinely unstarted and worth re-filing when he's ready:
**authz** (the `roles`/`permissions`/`role_permissions`/`user_roles` tables shipped 2026-07-15,
but there's no written model, no `@Security()`, and no auth middleware — it blocks meaningful e2e
coverage), and **controller-level unit tests** for organisations and users (balances has one;
they don't).

See [[reference-linear-workspace]] and [[user-role]].

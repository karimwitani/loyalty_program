---
name: project-loyalty-domain-model
description: The loyalty domain model — two reward program types, balances keyed to programs not orgs, and the product rule that the reward/program split is hidden from API consumers
metadata:
  type: project
---

The product supports **two kinds of loyalty program**, both rows in `reward_programs`
discriminated by `type`:

- **`reward_program`** — a stamp card. Exactly one bound reward; `rewards.required_points` is the
  threshold ("6 stamps, free coffee"). `reward_id` must be set.
- **`point_program`** — open-ended point accumulation, redeemed against arbitrary rewards from the
  merchant's catalogue. `reward_id` must be NULL.

**Key product rule (Karim, 2026-07-30): the reward/program separation is an implementation detail
and must be hidden from API consumers — they should "work together seamlessly" in the UI.** This
drove the decision that `POST /reward_programs` takes a *nested* `reward` object and creates both
rows atomically (via a Postgres function, mirroring `fn_increment_balance`), and that reads always
embed the full reward rather than exposing a bare `reward_id`. `/rewards` stays a real resource
but is primarily the catalogue for point programs.

**Ownership chain:** `balances` are keyed to a **reward program**, not an organisation — the org
relationship is derived transitively via `reward_programs.org_id`. Karim chose this explicitly
over keeping `org_id` on balances, because a merchant running both a stamp card and a points
program would otherwise give each user one shared balance across both.

**Why:** these are product-shape decisions made in conversation, not recoverable from the schema —
the schema as written permits all the invalid states (no CHECK on type↔reward_id, no unique
constraint on balances, no `org_id` on rewards).

**How to apply:** when scoping anything touching rewards, programs, or balances, preserve the
"one call, one object" ergonomics and the program-scoped balance grain. Two deliberate deferrals
to remember: list endpoints have **no pagination yet** (should adopt LOY-10's cursor convention —
`page_size`/`starting_after`/`{data, has_more, next_cursor}` — in a later pass), and **no
authorization exists anywhere**, so `org_id` is client-supplied and unverified on every endpoint.

Build order agreed 2026-07-30: LOY-11 (re-key balances) → LOY-12 (`/rewards`) → LOY-13
(`/reward_programs`), with LOY-10 (transactions pagination) after LOY-11 so it's written against
the final balance shape. See [[reference-linear-workspace]].

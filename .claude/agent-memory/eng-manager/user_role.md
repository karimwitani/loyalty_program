---
name: user-role
description: Karim is the solo developer and project lead on loyalty_apps — owns the Linear board, writes the code, and uses TODO.md as a learning log as well as a backlog
metadata:
  type: user
---

Karim Itani (karimitani.primo@gmail.com) is effectively the **solo developer and project lead**
on `loyalty_apps`: he is the lead on the "API Endpoints" project and the only assignee on the
LOY board, and every commit in the repo is his.

Notable about how he works:

- `TODO.md` mixes a real delivery backlog with a **personal learning list** — entries like
  "learn the difference between `Omit` and `Pick`", "research what `bind.toSelf()` means",
  "research how Stripe does API versioning". These are genuine open questions, not filler.
- He invests unusually heavily in written architecture rationale — `docs/api_design.md` is a
  32KB Diátaxis-structured doc with a full "Explanation" section arguing *why* each convention
  exists (four test tiers, Symbol DI tokens, service-role-only Supabase client).

**How to apply:** he is technically strong and opinionated about design, so skip beginner
framing and engage with tradeoffs directly. Because he is the only person on the board,
"who should do this" is never the useful question — sequencing and scope-splitting are. When a
TODO line is a learning item rather than deliverable work, don't convert it into a Linear issue
without asking; it may belong in a doc or nowhere.

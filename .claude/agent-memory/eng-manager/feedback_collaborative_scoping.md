---
name: feedback-collaborative-scoping
description: Sketch the design and scope in conversation and get a reaction before creating any Linear issue or PRD — Karim wants to co-design, not review finished artifacts
metadata:
  type: feedback
---

**Discuss design and scope with Karim before writing anything to Linear.** Open with a short
sketch — API shape, layering, in/out of scope, rough size — and wait for a reaction. Only call
`save_issue` / `save_document` once he's signed off.

**Why:** on 2026-07-30 he asked me to scope `GET /balances/{id}/transactions` and I went straight
from request to a fully-specified LOY-10 in one shot. The content wasn't the problem — the process
was. Real design decisions (cursor vs. offset pagination, query params replacing the body params
he'd actually asked for, adding an index migration to scope) got made unilaterally and surfaced
as fait-accompli "open questions" at the bottom of a finished issue. He asked me to update my own
agent definition to prompt for more back-and-forth. He wants to co-design, not review.

**How to apply:**

- Lead with the two or three genuine forks in the road, say which way I'd lean and why, and let
  him pick. Don't bury choices at the bottom of a document.
- If the request as stated won't work (e.g. body params on a `GET`), raise it in conversation
  *before* writing it down — never silently correct it inside an issue body.
- One question at a time; a quick exchange beats a numbered list of nine questions.
- Keep sketches short. Full brief detail comes *after* the shape is agreed.
- Read the room: "just file this" means file it. Don't force a design discussion onto something
  he's already decided.

He is technically strong and opinionated about design (see [[user-role]]), so the discussion is
the valuable part — the written artifact is just the residue of it.

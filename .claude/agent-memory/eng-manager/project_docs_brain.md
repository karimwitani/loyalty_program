---
name: project-docs-brain
description: The "Docs Brain" Linear project (LOY-19..22) — turning docs/ into an agent-traversable frontmatter graph; records the schema decisions agreed on 2026-07-30 so they aren't re-litigated
metadata:
  type: project
---

**Project "Docs Brain"** (id `0c1e73a3-9476-4534-b37a-af42488b383f`, LOY team) turns `docs/` into a
queryable semantic graph via enforced Markdown frontmatter. Scoped with Karim on 2026-07-30 from a
reference "machine-readable note template" he brought in.

Issues, in dependency order: **LOY-19** (note standard + Zod schema + warn-only `docs:lint` in a new
`packages/docs-lint`) -> **LOY-20** (topic cut of `api_design.md`) -> **LOY-22** (generated index, CI
enforcement, agent-def rewrite). **LOY-21** (domain-model nodes) needs only LOY-19.

**Why:** the three agent definitions currently hand-roll doc traversal (grep `^#` for a heading map,
`Read` with offset/limit). The initiative's acceptance test is that those heuristics get *deleted*
and replaced by frontmatter queries. Karim's framing: deterministic identity + vector-dense
summaries + typed edges + temporal validity, so agents stop relying on fuzzy LLM parsing.

**Schema decisions already made — don't reopen without cause:**

- Required core: `id, title, type, status, summary, tags, relations, source_paths, updated`.
  Cut `owner`/`maintainers`/`visibility`/`domain`/`version`/`created` from the reference template —
  solo repo, all internal, and `git log`/`blame` is authoritative, so those duplicate state that
  rots silently.
- `type`: `concept | domain | adr | runbook | index`.
- Edges: `relates_to`, `depends_on`/`required_by`, `explains`/`explained_by`,
  `supersedes`/`superseded_by`. **Authors declare one direction; the linter materializes reverses.**
- `source_paths` (globs -> the code a node describes) is an addition to Karim's template that he
  accepted. It gives the reverse lookup "which notes describe this file" and turns a renamed or
  deleted module into a CI failure — a much sharper staleness signal than the 180-day timer.
- `api_design.md` is cut **by topic, not by Diataxis quadrant**. Quadrant nodes have unwriteable
  summaries ("assorted how-tos" embeds to nothing) and scatter what/why pairs across files.
  Diataxis survives as `##` sections *inside* each topic node.
- `api_design.md` survives as a `type: index` stub — three agent definitions reference it by name.

**Deliberately out of scope:** the authz node and the API-versioning ADR. Both are blocked on
decisions Karim hasn't made, and writing them is design work wearing a docs costume.

See [[reference-linear-workspace]], [[project-backlog-vs-todo-md]].

---
name: project-loyalty-apps-api-conventions
description: Non-obvious gotchas in apps/api not fully spelled out by docs/api_design.md
metadata:
  type: project
---

Learned implementing LOY-10 (GET /balances/{id}/transactions cursor pagination), on top of what
`docs/api_design.md` already documents:

- **Declarative schema, not hand-written migrations.** `supabase/config.toml` sets
  `db.migrations.schema_paths = ["./schema.sql"]`. To add a table/column/index: edit
  `supabase/schema.sql` first (there are `-- SECTION: ...` banners, e.g. `SECTION: INDEXES`), then
  run `supabase db diff -f <name>` to auto-generate the migration file by diffing a shadow DB
  against your migrations vs. schema.sql. Never hand-write a migration filename/timestamp.
  **Why:** hand-authored migrations can drift from schema.sql, and the timestamp ordering matters
  for `supabase db reset`. **How to apply:** always edit schema.sql → `supabase db diff -f name` →
  `supabase db reset` to verify it applies cleanly and re-running `db diff` shows no further
  drift for your change.
- **`supabase db diff` is noisy.** It sometimes emits unrelated `REVOKE ALL ON FUNCTION ... FROM
  service_role` lines (pre-existing drift between schema.sql's declared privileges and the
  migration-built DB's actual privileges, unrelated to whatever you just changed). Confirm by
  running `db diff` again after your migration is applied/committed — if the same stray line
  reappears with zero schema changes of your own, it's pre-existing and safe to strip from your
  generated migration file (keep only the statement(s) for your actual change).
- **UUIDv7 ordering must be replicated in in-memory fakes.** Tables using
  `fn_gen_random_uuid_v7()` (e.g. `balance_transactions.id`) rely on ids being time-ordered so
  `ORDER BY id DESC` = newest-first with no separate sort column. An in-memory fake backing such
  a table needs ids that preserve this ordering under a plain string/lexicographic sort — a
  `randomUUID()` (v4) won't do it. Pattern used: a monotonic counter encoded into the leading hex
  digits of a fake UUID string, e.g. `${counter.toString(16).padStart(12,"0")}-...`.
- **Read-only domain tables need a seed helper on their fake repo.** When a table is only ever
  written by a Postgres RPC/trigger (not a service-layer create endpoint), the
  `IXRepository` interface has no `create`, but the in-memory fake still needs a way for tests to
  populate fixture rows. Add a method that's *not* part of the interface (e.g.
  `seedTransaction(...)`) directly on the concrete fake class, and access it in component tests via
  `iocContainer.get<ConcreteFakeClass>(TYPES.IXRepository)` (the same singleton-scoped instance
  bound into the app under `USE_FAKE_REPOSITORIES=true`).
- **Repository/service classes don't need `@injectable()` unless they have `@inject()`
  constructor params.** Only classes with injected dependencies (services, controllers) carry
  `@injectable()`; plain repositories with no constructor deps (`BalancesRepository`,
  `OrganisationsRepository`, and the new `BalanceTransactionsRepository`) don't have it in this
  codebase, and `container.bind().to()` still works.
- **Zod schemas with `.default()` need two exported types, not one.** For a query/body schema
  with a `.default(...)` field (e.g. `page_size`), export both `z.input<typeof Schema>` (pre-parse,
  field optional — used as the controller/service parameter type before `.parse()` is called) and
  `z.infer<typeof Schema>` (post-parse, field guaranteed present — used for what gets passed
  further down, e.g. into a repository). Using only `z.infer` for the pre-parse parameter makes
  TypeScript require the defaulted field even though callers should be allowed to omit it.
- **`packages/database-schema` needs a manual `tsc` build in a fresh worktree/checkout** before
  `apps/api` will typecheck (`Cannot find module '@repo/database-schema'`) — it's not wired into
  turbo's `check-types`/`build` dependency graph in a way that runs automatically here; run
  `npx tsc` inside `packages/database-schema` once.
- **`pnpm turbo run check-types --filter=api` and `pnpm turbo run test --filter=api` both no-op** —
  `apps/api/package.json` has no `check-types` script and there's no root `test` task in
  `turbo.json`. Typecheck with `npx tsc --noEmit` directly in `apps/api`, and run tests with the
  package-local `npm test` (`vitest run --project unit --project component`) /
  `npm run test:integration` / `npm run test:e2e`.

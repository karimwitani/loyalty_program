---
name: loyalty-apps-api-build-setup
description: Order of operations to get apps/api typechecking/building in a fresh worktree/checkout of loyalty_apps
metadata:
  type: project
---

In a fresh clone or worktree of `loyalty_apps`, `pnpm --filter api run build` (which is
`tsoa spec-and-routes && tsc`) fails at first with
`Cannot find module '@repo/database-schema'` even after `pnpm install`. This isn't a real
type error — `apps/api` depends on the workspace package `@repo/database-schema` by its built
`dist/` output (see its `package.json`: `"main": "./dist/index.js"`), and nothing triggers that
build automatically.

**Why:** `packages/database-schema` only ships compiled output for consumers; there's no
prebuild/postinstall hook wiring `apps/api`'s build to it. Turbo's `build` task does declare
`dependsOn: ["^build"]`, so running the build *through turbo* (e.g. `pnpm build` at the repo
root) would order this correctly — but `pnpm --filter api run build` calls the package script
directly and skips that ordering.

**How to apply:** before typechecking/building `apps/api` standalone, run
`pnpm --filter @repo/database-schema run build` first (or just run `turbo run build` /
`pnpm build` from the repo root, which handles the dependency order). Also remember `apps/api`
has no `check-types` script of its own — `pnpm --filter api run build` (tsoa + tsc) is the
closest thing to a typecheck for that package. See also [[harness_worktree_cwd_pinned]] for the
related constraint on where these commands can actually run from.

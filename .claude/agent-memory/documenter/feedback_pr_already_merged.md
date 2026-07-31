---
name: feedback-pr-already-merged
description: What to do when the target PR/branch for a doc-review run has already been merged into main by the time the run starts
metadata:
  type: feedback
---

When told to check out a specific PR's branch and push doc fixes onto it, first check the PR's
merge state (`gh pr view <number> --json state,mergedAt`) before assuming it's still open. In this
repo's workflow, a coding-agent's PR can be merged into `main` before the documentation-review
pass runs against it (observed on LOY-11 / PR #2 — merged ~4 min after review was requested).

**Why:** the instructed workflow ("commit onto that same branch and push so it lands on PR #2")
assumes the PR is still open. If it's already merged, the head branch is dead — pushing to it
creates an orphan commit not part of any PR and does not update `main`. Diffing against
`main...HEAD` also breaks because `HEAD` (the merged branch) *is* `main` at that point; diff the
feature commit against its parent instead (e.g. `git diff <parent-sha>..<feature-tip-sha>`), found
via `git log --oneline` around the merge commit.

**How to apply:** if `gh pr view` shows `MERGED`, don't push to the stale branch. Instead branch
off current `origin/main`, make the doc fix, and open a small new PR against `main` (e.g.
`docs/loy-XX-<topic>-doc-fix`). Note the situation explicitly in both the new PR body and the
Linear comment so the audit trail is clear about why a second PR exists instead of a push to the
original one. Since branch worktree names can collide with another agent's checkout of the exact
same branch (`git checkout` fails with "already used by worktree"), don't fight that — just fetch
and diff without checking out the literal branch name if needed, or use a differently-named local
branch tracking the same commit.

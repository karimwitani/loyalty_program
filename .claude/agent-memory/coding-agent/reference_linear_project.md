---
name: reference-linear-project
description: Where LOY issues and the API design doc live for loyalty_apps
metadata:
  type: reference
---

`loyalty_apps` issues are tracked in Linear team "Loyalty Cards" (issue prefix `LOY-`), project
"API Endpoints". Well-formed issues in this project include a full implementation brief:
Problem, Design (with explicit rationale for API/schema choices), Implementation brief with a
numbered file-by-file change list and a target LOC size, a Test plan broken out by tier, an
Out-of-scope list, Acceptance criteria, and sometimes Open questions.

The authoritative architecture/convention doc for `apps/api` is `docs/api_design.md` — read it in
full before touching anything in that app. See [[project-loyalty-apps-api-conventions]] for the
gotchas that aren't obvious just from reading it once.

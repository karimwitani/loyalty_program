# Coding Agent Memory

- [Linear project reference](reference_linear_project.md) — LOY issues live in "Loyalty Cards" team, "API Endpoints" project; docs/api_design.md is authoritative for apps/api.
- [apps/api conventions](project_loyalty_apps_api_conventions.md) — declarative schema.sql + `supabase db diff`, UUIDv7 fake ordering, seed helpers on read-only fakes, z.input vs z.infer for defaulted fields, build gotchas.
- [loyalty_apps api build setup](loyalty_apps_api_build_setup.md) — build `@repo/database-schema` before `apps/api` standalone, or use root `turbo run build`.

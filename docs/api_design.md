# API application (`apps/api`)

This document explains how `apps/api` works and how it is structured. It follows the
[Diataxis](https://diataxis.fr) framework: a **tutorial** to build a feature end-to-end, **how-to
guides** for common tasks, **reference** material for the concrete shapes and configs, and an
**explanation** of the architectural decisions.

Status note: `balances` is currently the only fully-wired vertical slice
(`GET /balances/{id}` and `POST /balances`). Other methods on it (list, update, delete) are
stubs returning `501`. A four-tier test suite (unit/component/integration/e2e, see
[Reference → Testing](#testing)) covers this slice end-to-end and is enforced in CI
(`.github/workflows/test.yml`) — treat it as the pattern to extend as new slices land, not a
one-off for `balances`.

---

## Tutorial: build a new resource end-to-end

This walks through adding a new domain, `widgets`, following the same shape as the existing
`balances` slice. Work top-down: schema → repository → service → controller → DI wiring.

### 1. Define the domain schema

Create `apps/api/src/domain/types/widgets.types.ts`:

```ts
import { z } from "zod";

const WidgetCoreField = z.object({
  org_id: z.uuid(),
  name: z.string().min(1),
});

export const WidgetSchema = WidgetCoreField.extend({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}).strict();

export const WidgetCreateSchema = WidgetCoreField.strict();

export const WidgetUpdateSchema = WidgetCoreField
  .omit({ org_id: true })
  .partial()
  .strict();

export type Widget = z.infer<typeof WidgetSchema>;
export type WidgetCreate = z.infer<typeof WidgetCreateSchema>;
export type WidgetUpdate = z.infer<typeof WidgetUpdateSchema>;
```

See [Reference → Zod schema pattern](#zod-schema-pattern-core-fields--full--create--update) for why this shape exists.

### 2. Add a repository

Create `apps/api/src/repositories/widgets.repository.ts` (don't repeat the existing
`repositorty` typo in new files — see [Reference → known issues](#known-issues)):

```ts
import { injectable } from "inversify";
import { supabase } from "@/lib/supabase-client";
import { WidgetSchema, Widget } from "@/domain/types/widgets.types";
import { toPostgrestError } from "@/utils/postgres-error-handler";

export interface IWidgetsRepository {
  findById(id: string): Promise<Widget | null>;
  create(payload: WidgetCreate): Promise<Widget>;
}

@injectable()
export class WidgetsRepository implements IWidgetsRepository {
  async findById(id: string) {
    const { data, error } = await supabase.from("widgets").select("*").eq("id", id).maybeSingle();
    if (error) throw toPostgrestError(error);
    return data ? WidgetSchema.parse(data) : null;
  }

  async create(payload: WidgetCreate) {
    const { data, error } = await supabase.from("widgets").insert(payload).select().single();
    if (error) throw toPostgrestError(error);
    return WidgetSchema.parse(data);
  }
}
```

The repository is the only layer that talks to Supabase. It parses rows back through the zod
schema so bad data from the DB fails loudly instead of leaking untyped `any`s upward.

### 3. Add a service

Create `apps/api/src/services/widgets.service.ts`:

```ts
import { injectable, inject } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types";
import { IWidgetsRepository } from "@/repositories/widgets.repository";
import { WidgetCreateSchema, WidgetCreate } from "@/domain/types/widgets.types";

@injectable()
export class WidgetService {
  constructor(@inject(TYPES.IWidgetsRepository) private repo: IWidgetsRepository) {}

  getWidgetById(id: string) {
    return this.repo.findById(id);
  }

  createWidget(payload: WidgetCreate) {
    const validated = WidgetCreateSchema.parse(payload);
    return this.repo.create(validated);
  }
}
```

The service owns business logic and re-validation; it never touches Supabase directly.

### 4. Add a controller

Create `apps/api/src/controllers/widgets.controller.ts`:

```ts
import { Body, Controller, Get, Path, Post, Route, SuccessResponse, Tags } from "tsoa";
import { injectable, inject } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types";
import { WidgetService } from "@/services/widgets.service";
import { WidgetCreate } from "@/domain/types/widgets.types";

@injectable()
@Tags("widgets")
@Route("widgets")
export class WidgetsController extends Controller {
  constructor(@inject(TYPES.WidgetsService) private widgetService: WidgetService) {
    super();
  }

  @SuccessResponse(200)
  @Get("{id}")
  public async getWidgetById(@Path() id: string) {
    const widget = await this.widgetService.getWidgetById(id);
    if (!widget) {
      this.setStatus(404);
      return null;
    }
    return widget;
  }

  @SuccessResponse(201, "Created")
  @Post()
  public async createWidget(@Body() body: WidgetCreate) {
    return this.widgetService.createWidget(body);
  }
}
```

### 5. Wire it into the IoC container

Add tokens to `apps/api/src/domain/types/di-tokens.types.ts`:

```ts
export const TYPES = {
  IBalancesRepository: Symbol.for("IBalancesRepository"),
  BalancesService: Symbol.for("BalancesService"),
  IWidgetsRepository: Symbol.for("IWidgetsRepository"),
  WidgetsService: Symbol.for("WidgetsService"),
};
```

Register bindings in `apps/api/src/inversify.config.ts`:

```ts
container.bind<IWidgetsRepository>(TYPES.IWidgetsRepository).to(WidgetsRepository);
container.bind<WidgetService>(TYPES.WidgetsService).to(WidgetService);
container.bind<WidgetsController>(WidgetsController).toSelf();
```

Note controllers are bound with `.toSelf()` keyed by the class, everything else by a `Symbol`
token — see [Explanation → why Symbol tokens](#why-symbol-tokens-for-di).

### 6. Regenerate routes and run

```bash
cd apps/api
npm run dev   # runs `tsoa spec-and-routes` then starts the server via nodemon
```

`tsoa spec-and-routes` reads every `src/controllers/*controller.ts` file and regenerates
`src/generated/routes.ts` and `build/swagger.json`. You never hand-edit `generated/routes.ts`.
Visit `/docs` to see the new `widgets` routes in Swagger UI.

---

## How-to guides

### How to run the API locally

```bash
cd apps/api
cp .env.example .env   # fill in Supabase service-role credentials
npm run dev
```

`nodemon.json` watches `src` (excluding `*.spec.ts` and `src/generated`), and re-runs
`tsoa spec-and-routes && ts-node -r tsconfig-paths/register ./src/server.ts` on change.

### How to add a new endpoint to an existing controller

1. Add the method to the repository (data access), then the service (business logic + validation),
   then the controller (HTTP shape) — in that order, bottom-up.
2. Use the matching tsoa decorator (`@Get`, `@Post`, `@Patch`, `@Delete`) and parameter
   decorators (`@Path`, `@Body`, `@Query`).
3. Run `npm run dev` (or `npx tsoa spec-and-routes` directly) to regenerate
   `src/generated/routes.ts` — the route won't exist until you do.

### How to validate a request/response payload

Import the zod schema's `.parse()` (throws `ZodError` on failure, caught by the global error
handler and turned into a `422`) rather than hand-rolling checks. Controllers currently
re-`.parse()` in the service layer even though tsoa also validates against the inferred type —
keep doing this, since tsoa's static generation cannot enforce runtime rules like `.min()`/`.max()`.

### How to add a new domain object's schema

Follow the CORE_FIELDS pattern — see
[Reference → Zod schema pattern](#zod-schema-pattern-core-fields--full--create--update). Don't
write the `FULL`, `CREATE`, and `UPDATE` schemas independently; always derive `CREATE` and
`UPDATE` from the same core-fields object the `FULL` schema extends, so a field added in one
place doesn't silently drift from the others.

### How to turn a Supabase/Postgres error into an HTTP response

Don't inspect `error.code` yourself in a repository or service. Call
`toPostgrestError(error)` on whatever Supabase returns and re-throw it; the global error handler
in `app.ts` calls `postgrestErrorToHttpStatus(err.code)` to pick the right status. See
[Reference → error handling](#error-handling) for the code-to-status table.

### How to return a domain-specific HTTP error (403/404/etc.) from a service

Throw a subclass of `AppError` from `apps/api/src/domain/errors/base.errors.ts`
(`NotFoundError`, `AuthorizationError`, or a new subclass with its own `statusCode`). The global
error handler checks `err instanceof AppError` and uses `err.statusCode`/`err.message` directly.

### How to run the tests

```bash
cd apps/api
pnpm test                # unit + component — fast, no services needed

pnpm supabase:start      # from repo root, once — starts the local Supabase/Postgres stack
pnpm test:integration    # repository vs. real local DB
pnpm test:e2e            # full HTTP surface vs. real local DB
```

`pnpm test` is safe to run anywhere, anytime — it's what CI runs on every push. The other two
need `supabase/config.toml`'s local stack running first (`pnpm test:integration`/`test:e2e` both
have a `pretest` hook that regenerates `apps/api/.env.test` from `supabase status`, so you never
hand-edit that file — see [Reference → Testing](#testing)).

### How to add tests for a new endpoint

Follow the same bottom-up order as building the feature (repository → service → controller),
writing the matching test at each tier:

1. **Unit** — construct the service/controller directly (`new BalanceService(fakeRepo)`), no
   container involved. Build a fake for the repository interface only (see
   `InMemoryBalancesRepository` for the shape to copy); stub the service by hand for controller
   tests. Assert on return values and thrown errors only.
2. **Component** — drive the real `app` (from `@/app`) with `supertest`, but the test's own
   `vitest.config.ts` project sets `USE_FAKE_REPOSITORIES=true`, so no DB is touched. This is
   where you catch tsoa validation and global-error-handler bugs cheaply.
3. **Integration** — construct the real repository directly (`new BalancesRepository()`), no
   Express, against the real local Supabase started by `pnpm supabase:start`. Seed/clean up
   prerequisite rows through the same `supabase` client the repository itself uses — see the
   `balances.repository.integration.test.ts` `beforeAll`/`afterEach`/`afterAll` for the pattern.
4. **E2E** — same real DB, but drive the full app over HTTP with `supertest`, matching
   `balances.controller.e2e.test.ts`.

Name the file `<domain>.<layer>.<tier>.test.ts` (e.g. `widgets.service.unit.test.ts`) and put it
in a `__tests__` folder next to the source it covers — `vitest.config.ts`'s per-project
`include` globs key off the `.unit.`/`.component.`/`.integration.`/`.e2e.` suffix, not the
folder, so get the suffix right.

---

## Reference

### Directory layout

```
apps/api/
├── tsoa.json                    # tsoa config: entry file, controller globs, iocModule, output paths
├── nodemon.json                 # dev watch/rebuild config
├── vitest.config.ts             # unit/component/integration/e2e project definitions
├── .env.test                    # generated by `pnpm env:test` — gitignored, never hand-edited
├── build/swagger.json           # generated OpenAPI 3 spec, served at GET /docs
└── src/
    ├── server.ts                 # entry point: dotenv + app.listen(PORT)
    ├── app.ts                    # express app: json body parsing, /docs, RegisterRoutes, global error handler
    ├── inversify.config.ts       # InversifyJS container + bindings; exported as `iocContainer`, used by tsoa
    ├── controllers/
    │   ├── balances.controller.ts
    │   ├── base.controller.ts    # GET /test — smoke-test controller, not on the DI pattern
    │   └── __tests__/
    │       ├── balances.controller.unit.test.ts
    │       ├── balances.controller.component.test.ts
    │       └── balances.controller.e2e.test.ts
    ├── services/
    │   ├── balances.service.ts
    │   └── __tests__/balances.service.unit.test.ts
    ├── repositories/
    │   ├── balances.repositorty.ts   # (sic — typo in filename, see Known issues)
    │   ├── __fakes__/
    │   │   └── in-memory-balances.repository.ts  # IBalancesRepository fake, unit tests only
    │   └── __tests__/balances.repository.integration.test.ts
    ├── domain/
    │   ├── types/
    │   │   ├── balances.types.ts     # zod schemas + z.infer types
    │   │   └── di-tokens.types.ts    # Symbol tokens for inversify bindings
    │   └── errors/
    │       └── base.errors.ts        # AppError, AuthorizationError, NotFoundError
    ├── lib/
    │   └── supabase-client.ts        # single service-role Supabase client, typed with Database
    ├── test/
    │   └── env.setup.ts               # loads .env.test — every vitest project's setupFiles
    ├── utils/
    │   └── postgres-error-handler.ts # toPostgrestError, postgrestErrorToHttpStatus
    └── generated/
        └── routes.ts              # tsoa-generated route registration — do not edit by hand
```

The convention per feature is one file per layer, named after the domain:
`controllers/<domain>.controller.ts` → `services/<domain>.service.ts` →
`repositories/<domain>.repository.ts`, with schemas in `domain/types/<domain>.types.ts`.

### Request flow

```
HTTP request
  → generated/routes.ts (tsoa-generated Express handler)
      resolves controller instance via iocContainer.get<Controller>(Controller)
      validates path/query/body params against controller method's TS types
  → Controller (tsoa decorators, HTTP concerns: status codes, request/response shape)
  → Service (business logic, re-validates payloads with zod .parse())
  → Repository (only layer touching Supabase; parses returned rows with zod .parse())
  → Supabase (Postgres via PostgREST, service-role client)
```

Errors thrown anywhere in this chain bubble up to the global error handler registered in
`app.ts` after `RegisterRoutes(app)`.

### Dependency injection (InversifyJS)

- Container: `apps/api/src/inversify.config.ts`, exported as `iocContainer`.
- `tsoa.json`'s `routes.iocModule` points at this file; tsoa's generated `routes.ts` imports
  `iocContainer` directly and resolves each controller per-request via
  `container.get<XController>(XController)`.
- Tokens: plain `Symbol.for("...")` values in `domain/types/di-tokens.types.ts`, collected under
  a single `TYPES` object.
- Bindings:
  - Repositories and services are bound by their `Symbol` token: `container.bind<IFoo>(TYPES.IFoo).to(Foo)`.
  - Controllers are bound `.toSelf()`, keyed by the class itself (tsoa resolves them this way,
    not via a token).
- Decorators: `@injectable()` on every class that participates in DI; `@inject(TYPES.X)` on
  constructor parameters that need to be resolved.
- `tsconfig.json` has `experimentalDecorators` and `emitDecoratorMetadata` enabled — required for
  both tsoa's and inversify's decorators to work at all.

### tsoa configuration and codegen

`apps/api/tsoa.json`:

```json
{
  "entryFile": "src/server.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "controllerPathGlobs": ["src/controllers/*controller.ts"],
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } },
  "spec": { "outputDirectory": "build", "specVersion": 3 },
  "routes": { "routesDir": "src/generated", "iocModule": "src/inversify.config.ts" }
}
```

- `npx tsoa spec-and-routes` (run automatically by `npm run dev` / `npm run build`) regenerates
  both `build/swagger.json` (OpenAPI spec) and `src/generated/routes.ts` from the controller
  files matched by `controllerPathGlobs`.
- Controller decorators used: `@Route`, `@Tags`, `@Get`, `@Post`, `@Path`, `@Body`, `@Request`,
  `@SuccessResponse`. All controllers extend tsoa's `Controller` base class (gives access to
  `this.setStatus(...)`).
- `noImplicitAdditionalProperties: "throw-on-extras"` makes tsoa's own request validation reject
  unknown body fields, in addition to zod's `.strict()` doing the same at the service layer.
- tsoa statically parses `z.infer<typeof XSchema>` type aliases and emits them into
  `generated/routes.ts` as `refAlias` models (e.g. `infer_typeofBalanceCreateSchema_`) — this is
  why controller method signatures should reference the exported `z.infer` type
  (`BalanceCreate`), not an inline type.

### Zod schema pattern: CORE_FIELDS → FULL / CREATE / UPDATE

Example, `apps/api/src/domain/types/balances.types.ts`:

```ts
const BalanceCoreField = z.object({
  org_id: z.uuid("org_id must be a valid UUID"),
  user_id: z.uuid("user_id must be a valid UUID"),
  balance: z.int("balance must be a valid integer").min(0).max(2147483647),
});

export const BalanceSchema = BalanceCoreField.extend({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}).strict();

export const BalanceCreateSchema = BalanceCoreField.strict();

export const BalanceUpdateSchema = BalanceCoreField
  .omit({ org_id: true, user_id: true }) // immutable on PATCH
  .partial()                              // all remaining fields optional
  .strict();                              // reject unknown keys

export type Balance = z.infer<typeof BalanceSchema>;
export type BalanceCreate = z.infer<typeof BalanceCreateSchema>;
export type BalanceUpdate = z.infer<typeof BalanceUpdateSchema>;
```

Rules of the pattern:
- A private "core fields" object holds every field shared across representations of the
  resource. It is not exported.
- `FULL` (the DB-row shape, e.g. `BalanceSchema`) = core fields `.extend()`ed with
  server-generated fields (`id`, `created_at`, `updated_at`), then `.strict()`.
- `CREATE` = core fields as-is, `.strict()`.
- `UPDATE` = core fields `.omit()`ing any field that must never change on PATCH, then
  `.partial()` (everything else becomes optional), then `.strict()`.
- Every schema ends in `.strict()` so unknown/extra keys are rejected rather than silently
  dropped.
- TypeScript types are never hand-written for these shapes — always `z.infer<typeof Schema>`, so
  the type and the runtime validator can't drift apart.

### Error handling

Two independent mechanisms feed the same global error handler in `app.ts`:

**`AppError` hierarchy** — `apps/api/src/domain/errors/base.errors.ts`:

```ts
export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
}
export class AuthorizationError extends AppError { statusCode = 403; }
export class NotFoundError extends AppError { statusCode = 404; }
```

Throw these from services for domain-specific failures; the handler reads `statusCode` and
`message` straight off the instance.

**Postgrest → HTTP mapping** — `apps/api/src/utils/postgres-error-handler.ts`:

- `toPostgrestError(error)` normalizes anything Supabase throws into a `PostgrestError`.
- `postgrestErrorToHttpStatus(code)` maps a Postgres error code to an HTTP status, checking exact
  codes first (`23505` unique violation → 409, `42501` insufficient privilege → 403, `42P01`
  undefined table → 404, `P0001` raised exception → 400, etc.), then falling back to matching on
  the two-character SQLSTATE class prefix (`08` connection exception → 503, `28` invalid
  authorization → 403, etc.), then defaulting to 400.

**Global handler** (`apps/api/src/app.ts`), registered after `RegisterRoutes(app)`, dispatches in
this order: `ZodError` → 422; tsoa `ValidateError` → 422 with `err.fields`; `AppError` → its own
`statusCode`; `PostgrestError` → `postgrestErrorToHttpStatus(err.code)`; anything else → its
numeric `.status` property if present, else 500 with a generic `"An internal error occurred"`
message (so raw internal errors are never leaked to the client).

### Supabase client

`apps/api/src/lib/supabase-client.ts` exports a single client constructed with the
**service-role key only** — there is no anon-key client anywhere in this app. All authorization
decisions therefore have to happen in application code (services/controllers), not in Postgres
RLS policies scoped to a request-bound user. The client is typed with `Database` from the
`@repo/database-schema` workspace package.

### Testing

Four tiers, split by whether they need a live Supabase instance (see
[Explanation → why four test tiers](#why-four-test-tiers-not-three)):

| Tier | Runs via | Container? | Needs live Supabase? |
|---|---|---|---|
| Unit | `pnpm test` | No — manual `new` | No |
| Component | `pnpm test` | Yes — real container, `USE_FAKE_REPOSITORIES=true` | No |
| Integration | `pnpm test:integration` | No — manual `new BalancesRepository()` | Yes |
| E2E | `pnpm test:e2e` | Yes — real container, real bindings | Yes |

- **Runner**: vitest, configured in `apps/api/vitest.config.ts` as four `test.projects` entries
  (`unit`, `component`, `integration`, `e2e`), one `test.include` glob each, matched by filename
  suffix (`*.unit.test.ts`, `*.component.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts`).
  `pnpm test` runs only the `unit` and `component` projects.
- **Env vars**: `apps/api/.env.test` holds `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` for the
  local stack. It's generated, not hand-written — `pnpm env:test` runs
  `supabase status -o env --override-name ...` and writes the two vars it needs; the
  `integration`/`e2e` npm scripts have a `pretest` hook that regenerates it automatically. It's
  gitignored (`apps/api/.gitignore`) since the values are tied to whatever local stack happens to
  be running.
- **`src/test/env.setup.ts`**: a `dotenv.config()` call, wired into every project's
  `setupFiles`, that loads `.env.test` before any test file's imports run. Even the `unit`/
  `component` projects need it — importing `@/app` (component tier) still imports
  `inversify.config.ts`, which unconditionally imports the real `BalancesRepository` module (to
  have it available for the non-fake binding), which imports `supabase-client.ts`, which throws
  at import time if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are unset — even when
  `USE_FAKE_REPOSITORIES=true` means that real repository is never actually instantiated.
- **Fakes**: `src/repositories/__fakes__/in-memory-balances.repository.ts` implements
  `IBalancesRepository` with a `Map`. It's wired in two ways: constructed directly in unit tests
  (`new BalanceService(new InMemoryBalancesRepository())`), or bound into the real container when
  `USE_FAKE_REPOSITORIES=true` (see [Reference → Dependency injection](#dependency-injection-inversifyjs)
  and [Explanation](#why-the-container-has-a-use_fake_repositories-flag)). It must stay
  behaviorally honest with the real repository (`null` on a miss, not a thrown error; rows
  round-tripped through `BalanceSchema`) or unit tests stop meaning anything.
- **CI**: `.github/workflows/test.yml` — a `test` job (unit + component, every push, no services)
  and a `test-db` job (integration + e2e, only on PRs targeting `main`, via the
  `supabase/setup-cli` action + `pnpm supabase:start` + `supabase stop`).
- **Seeding real rows**: integration/e2e tests create prerequisite `organisations`/`users` rows
  through the same `supabase` client the app itself uses (not a separate DB connection) — see
  `balances.repository.integration.test.ts`'s `beforeAll`. `service_role` needs
  `SELECT`/`INSERT`/`UPDATE`/`DELETE` on a table for this to work; if a future migration creates
  a table without granting those (the pattern every `create_table_*` migration follows is to
  grant only `MAINTAIN, REFERENCES, TRIGGER, TRUNCATE` — see
  `supabase/migrations/20260720125635_grant_service_role_select_insert_update.sql`, which had to
  retroactively add the missing CRUD grants schema-wide), both the app and its tests will fail
  with a Postgres `permission denied` error, not a test-framework error.

### Known issues

- `apps/api/src/repositories/balances.repositorty.ts` has a typo in the filename
  (`repositorty` instead of `repository`). Existing imports depend on this exact path; don't
  "fix" it without updating every import and the IoC binding.
- `apps/api/src/controllers/base.controller.ts` (`GET /test`) predates the DI pattern and isn't
  `@injectable`/DI-wired — it's a tsoa smoke test, not a template to copy.
- `npm run lint` is still a placeholder (`echo 'Add lint script here'`) — only `test` has real
  tooling behind it so far.
- `nodemon.json`'s `ignore` list still says `src/**/*.spec.ts`; actual test files are named
  `*.test.ts` (see [Reference → Testing](#testing)), so it doesn't currently exclude them from
  triggering a dev-server restart on save. Harmless, just noisy — update the glob if it gets
  annoying.
- E2E tests can't yet exercise an auth flow the way the reference pattern (a prior project's
  `credit-score` test) does, because `BalancesController` has no `@Security()` decorator and
  `app.ts` has no auth middleware. Add that coverage once auth is wired up.

---

## Explanation

### Why controller → service → repository

Each layer has exactly one reason to change:

- **Controller** — HTTP concerns only (status codes, path/body shape via tsoa decorators). It
  should never contain business logic or talk to Supabase directly.
- **Service** — business logic and validation. It's the only layer allowed to compose multiple
  repository calls or enforce domain rules (e.g. "PATCH can't change `org_id`").
- **Repository** — data access only. It's the sole place that imports the Supabase client, and
  the boundary where raw DB rows get parsed back into validated domain types before anything
  above it sees them.

This keeps HTTP framework code (tsoa), business rules, and persistence independently testable
and independently replaceable — e.g. the Supabase client could be swapped for a different backend
without touching services or controllers, as long as the repository interface is preserved.

### Why interfaces + Symbol tokens for DI

Services depend on repository *interfaces* (`IBalancesRepository`), not concrete classes, and
those interfaces are bound to implementations via `Symbol` tokens rather than the class itself.
TypeScript interfaces don't exist at runtime, so inversify can't resolve `IBalancesRepository`
directly — the `Symbol.for(...)` token is the runtime-visible stand-in that lets the container
map an abstract dependency to a concrete class. This is what makes it possible to substitute a
fake repository in tests without changing any service code — see
[`InMemoryBalancesRepository`](#testing) and the container's `USE_FAKE_REPOSITORIES` flag
[below](#why-the-container-has-a-use_fake_repositories-flag).

Controllers are the one exception, bound `.toSelf()` by class reference — this isn't a design
choice made by this codebase, it's a requirement of how tsoa's generated `routes.ts` resolves
controller instances (`container.get<XController>(XController)`).

### Why re-validate with zod inside the service when tsoa already validates

tsoa generates request validation from static TypeScript types (`noImplicitAdditionalProperties:
"throw-on-extras"` rejects unknown fields), but it has no visibility into runtime constraints
like `z.uuid()` format checks or `.min(0).max(2147483647)` numeric ranges — those only exist in
the zod schema. Calling `.parse()` again in the service is what actually enforces them; tsoa's
validation and zod's validation are complementary, not redundant.

### Why the CORE_FIELDS → FULL/CREATE/UPDATE pattern

Defining `FULL`, `CREATE`, and `UPDATE` as independent zod objects would let them drift — a field
renamed in one is easy to forget in another. Deriving all three from one core-fields object via
`.extend()`/`.omit()`/`.partial()` means a schema change (e.g. adding a field, tightening a
constraint) happens once and is reflected everywhere it's used, and the `.strict()` on each
guarantees payloads can't smuggle in fields (like `id` on a `POST`) that the schema didn't
intend to allow.

### Why a service-role-only Supabase client

Using only the service-role key (see [Reference → Supabase client](#supabase-client)) means
Postgres Row Level Security policies are bypassed entirely for API traffic — every authorization
decision has to be made explicitly in the service/controller layer. This is a deliberate
trade-off: it centralizes authorization logic in application code (visible, testable,
debuggable in TypeScript) rather than splitting it between RLS policies and app code, at the cost
of RLS providing no defense-in-depth if application-layer checks are missed.

### Why four test tiers, not three

The obvious split is "unit vs. everything else," but the fault line that actually matters
operationally is **does this tier need a live Supabase instance**. That's not the same axis as
"how many classes does it exercise":

- **Unit** and **integration** both exercise a single class in isolation — the difference is
  purely whether its dependency is faked (unit) or the real Postgres/PostgREST instance
  (integration). Integration is the only tier that can catch drift between a zod schema and the
  actual table, or a real Postgres error code being mapped to the wrong HTTP status — a fake
  repository can't be wrong about either of those by construction.
- **Component** and **e2e** both exercise the full Express/tsoa/DI stack over real HTTP — the
  difference is again whether the repository binding is faked (component) or real (e2e).
  Component exists specifically so that DI-wiring bugs, tsoa validation bugs, and global
  error-handler bugs are caught by a test that runs in milliseconds with no services, instead of
  only being caught by the slower, real-DB e2e tier.

Calling the no-DB, multi-class tier "component" rather than "integration" is deliberate: a prior
project's test suite called an equivalent full-HTTP/real-DB test "integration" when it was
actually exercising every layer over real HTTP against a real database — i.e. what this doc
calls e2e. Reserving "integration" for its classic meaning (verifying your code's integration
with one real external system) keeps the name unambiguous.

### Why the container has a `USE_FAKE_REPOSITORIES` flag

`inversify.config.ts` exports `buildContainer()`, a factory, rather than a single module-level
container instance. Two reasons:

1. **Per-test-file isolation.** A module-level singleton (the original shape) would be shared
   and mutated across every test file that imports it. `buildContainer()` gives e2e/component
   tests a fresh container each time, while `server.ts`/tsoa still get singleton behavior in
   production via `export const iocContainer = buildContainer()` at module load — zero behavior
   change there.
2. **Choosing an implementation is a container concern; choosing a database is not.** The
   container's job is picking *which class* implements `IBalancesRepository`. Which *database*
   that class talks to (local Supabase for tests vs. a hosted project) is a
   `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` environment concern, already handled by
   `supabase-client.ts` — it doesn't need a conditional binding. The one place a conditional
   binding earns its keep is `USE_FAKE_REPOSITORIES`: an explicit, opt-in flag that swaps
   `IBalancesRepository` to `InMemoryBalancesRepository`, used by the component test tier and
   available for local dev without a running Supabase instance. It's deliberately just an env
   flag and a ternary, not a strategy/module abstraction — that's all three consumers need.

The repository binding is also `.inSingletonScope()` — required for the in-memory fake to behave
like a persistent store across requests within one container/process (tsoa resolves a new
controller per request; without singleton scope, the fake's `Map` would be recreated, and
therefore emptied, on every request).

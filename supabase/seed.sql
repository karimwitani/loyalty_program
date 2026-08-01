---------------------------------
-- SEED: RBAC roles + permissions
---------------------------------
-- Idempotent: relies on uq_roles_name / uq_permissions_name /
-- pk_role_permissions to no-op on repeat `supabase db reset` runs.
-- Does not seed any user_roles rows - test fixtures create their own,
-- and org_id scoping means there's no sensible tenant to seed against here.

-- ROLES
INSERT INTO "public"."roles" ("name", "scope") VALUES
	('org_admin', 'org'),
	('cashier', 'org')
ON CONFLICT ("name") DO NOTHING;

-- PERMISSIONS
INSERT INTO "public"."permissions" ("name") VALUES
	('organisations:read'),
	('organisations:write'),
	('organisations:delete'),
	('reward_programs:read'),
	('reward_programs:write'),
	('reward_programs:delete'),
	('rewards:read'),
	('rewards:write'),
	('rewards:delete'),
	('balances:read'),
	('balances:create'),
	('balances:increment'),
	('balances:redeem'),
	('balances:delete'),
	('balance_transactions:read')
ON CONFLICT ("name") DO NOTHING;

-- ROLE_PERMISSIONS
-- org_admin: every permission above.
INSERT INTO "public"."role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "public"."roles" r
CROSS JOIN "public"."permissions" p
WHERE r.name = 'org_admin'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- cashier: balances:read, balances:create, balances:increment,
-- balances:redeem, balance_transactions:read.
INSERT INTO "public"."role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "public"."roles" r
CROSS JOIN "public"."permissions" p
WHERE r.name = 'cashier'
AND p.name IN (
	'balances:read',
	'balances:create',
	'balances:increment',
	'balances:redeem',
	'balance_transactions:read'
)
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

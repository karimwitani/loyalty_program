import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";

import { BalancesRepository } from "@/repositories/balances.repositorty";
import { supabase } from "@/lib/supabase-client";

// Exercises BalancesRepository against a real local Supabase/Postgres
// instance (`pnpm supabase:start`). No Express/HTTP involved - this is the
// one tier that can catch drift between BalanceSchema and the real table,
// or a real Postgres error code being mapped incorrectly.
describe("BalancesRepository (integration, real local Supabase)", () => {
    const repo = new BalancesRepository();

    let orgId: string;
    let userId: string;
    let authUserId: string;

    beforeAll(async () => {
        const { data: org, error: orgError } = await supabase
            .from("organisations")
            .insert({ name: `integration-org-${randomUUID()}` })
            .select("id")
            .single();
        if (orgError) throw orgError;
        orgId = org.id;

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: `integration-${randomUUID()}@test.com`,
            password: "password123",
            email_confirm: true,
        });
        if (authError) throw authError;
        authUserId = authUser.user!.id;
        userId = authUserId;

        const { error: userError } = await supabase
            .from("users")
            .insert({ id: userId, first_name: "Integration", last_name: "Test" });
        if (userError) throw userError;
    });

    afterEach(async () => {
        await supabase.from("balances").delete().eq("user_id", userId);
    });

    afterAll(async () => {
        await supabase.from("users").delete().eq("id", userId);
        await supabase.from("organisations").delete().eq("id", orgId);
        await supabase.auth.admin.deleteUser(authUserId);
    });

    describe("create", () => {
        it("persists a balance and returns it", async () => {
            const created = await repo.create({ org_id: orgId, user_id: userId, balance: 100 });

            expect(created?.org_id).toBe(orgId);
            expect(created?.user_id).toBe(userId);
            expect(created?.balance).toBe(100);
        });

        it("throws a foreign-key-violation error for an org_id that doesn't exist", async () => {
            await expect(
                repo.create({ org_id: randomUUID(), user_id: userId, balance: 10 }),
            ).rejects.toMatchObject({ code: "23503" });
        });
    });

    describe("findById", () => {
        it("returns null for an id that does not exist", async () => {
            const result = await repo.findById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the row created via create()", async () => {
            const created = await repo.create({ org_id: orgId, user_id: userId, balance: 50 });

            const found = await repo.findById(created!.id);

            expect(found).toEqual(created);
        });
    });

    describe("increment", () => {
        it("increments the balance via fn_increment_balance and returns the updated row", async () => {
            const created = await repo.create({ org_id: orgId, user_id: userId, balance: 20 });

            const result = await repo.increment(created!.id, 5);

            expect(result?.balance).toBe(25);
        });

        it("throws a foreign-key-violation error for a balance id that doesn't exist", async () => {
            await expect(repo.increment(randomUUID(), 5)).rejects.toMatchObject({ code: "23503" });
        });
    });

    describe("redeem", () => {
        it("decrements the balance via fn_decrement_balance and returns the updated row", async () => {
            const created = await repo.create({ org_id: orgId, user_id: userId, balance: 20 });

            const result = await repo.redeem(created!.id, 5);

            expect(result?.balance).toBe(15);
        });

        it("throws a check-constraint-violation error when redeeming more than the current balance", async () => {
            const created = await repo.create({ org_id: orgId, user_id: userId, balance: 20 });

            await expect(repo.redeem(created!.id, 21)).rejects.toMatchObject({ code: "23514" });
        });
    });
});

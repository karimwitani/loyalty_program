import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";

import { UsersRepository } from "@/repositories/users.repository";
import { supabase } from "@/lib/supabase-client";

// Exercises UsersRepository against a real local Supabase/Postgres instance
// (`pnpm supabase:start`). users.id is a foreign key to auth.users(id), so
// each case provisions a real auth user first via the admin API.
describe("UsersRepository (integration, real local Supabase)", () => {
    const repo = new UsersRepository();
    const createdUserIds: string[] = [];
    const createdAuthUserIds: string[] = [];

    async function makeAuthUserId(): Promise<string> {
        const { data, error } = await supabase.auth.admin.createUser({
            email: `integration-${randomUUID()}@test.com`,
            password: "password123",
            email_confirm: true,
        });
        if (error) throw error;
        createdAuthUserIds.push(data.user!.id);
        return data.user!.id;
    }

    afterEach(async () => {
        if (createdUserIds.length) {
            await supabase.from("users").delete().in("id", createdUserIds);
            createdUserIds.length = 0;
        }
    });

    afterAll(async () => {
        for (const id of createdAuthUserIds) {
            await supabase.auth.admin.deleteUser(id);
        }
    });

    describe("create", () => {
        it("persists a user and returns it", async () => {
            const id = await makeAuthUserId();

            const created = await repo.create({
                id,
                first_name: "Ada",
                last_name: "Lovelace",
                email: `test-${randomUUID()}@test.com`,
            });
            createdUserIds.push(created!.id);

            expect(created?.id).toBe(id);
            expect(created?.first_name).toBe("Ada");
        });

        it("throws a uniqueness-violation error when a user with the id already exists", async () => {
            const id = await makeAuthUserId();
            const payload = {
                id,
                first_name: "Ada",
                last_name: "Lovelace",
                email: `test-${randomUUID()}@test.com`,
            };
            const created = await repo.create(payload);
            createdUserIds.push(created!.id);

            await expect(
                repo.create({ ...payload, email: `other-${randomUUID()}@test.com` }),
            ).rejects.toMatchObject({ code: "23505" });
        });
    });

    describe("findById", () => {
        it("returns null for an id that does not exist", async () => {
            const result = await repo.findById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the row created via create()", async () => {
            const id = await makeAuthUserId();
            const created = await repo.create({
                id,
                first_name: "Grace",
                last_name: "Hopper",
                email: `test-${randomUUID()}@test.com`,
            });
            createdUserIds.push(created!.id);

            const found = await repo.findById(created!.id);

            expect(found).toEqual(created);
        });
    });

    describe("update", () => {
        it("updates and returns the user", async () => {
            const id = await makeAuthUserId();
            const created = await repo.create({
                id,
                first_name: "Grace",
                last_name: "Hopper",
                email: `test-${randomUUID()}@test.com`,
            });
            createdUserIds.push(created!.id);

            const updated = await repo.update(created!.id, { first_name: "Amazing Grace" });

            expect(updated?.first_name).toBe("Amazing Grace");
        });

        it("throws instead of silently returning null when the id doesn't exist", async () => {
            await expect(
                repo.update(randomUUID(), { first_name: "Nobody" }),
            ).rejects.toThrow();
        });
    });

    describe("delete", () => {
        it("deletes the user", async () => {
            const id = await makeAuthUserId();
            const created = await repo.create({
                id,
                first_name: "Delete",
                last_name: "Me",
                email: `test-${randomUUID()}@test.com`,
            });

            const result = await repo.delete(created!.id);
            expect(result).toBe(true);

            const found = await repo.findById(created!.id);
            expect(found).toBeNull();
        });

        it("cascades to a user's balances rows", async () => {
            const id = await makeAuthUserId();
            const created = await repo.create({
                id,
                first_name: "Cascade",
                last_name: "Delete",
                email: `test-${randomUUID()}@test.com`,
            });

            const { data: org, error: orgError } = await supabase
                .from("organisations")
                .insert({ name: `cascade-org-${randomUUID()}` })
                .select("id")
                .single();
            if (orgError) throw orgError;

            const { data: rewardProgram, error: rewardProgramError } = await supabase
                .from("reward_programs")
                .insert({ title: `cascade-program-${randomUUID()}`, org_id: org.id, type: "point_program" })
                .select("id")
                .single();
            if (rewardProgramError) throw rewardProgramError;

            const { data: balance, error: balanceError } = await supabase
                .from("balances")
                .insert({ reward_program_id: rewardProgram.id, user_id: created!.id, balance: 50 })
                .select("id")
                .single();
            if (balanceError) throw balanceError;

            await repo.delete(created!.id);

            const { data: remainingBalance } = await supabase
                .from("balances")
                .select("id")
                .eq("id", balance.id)
                .maybeSingle();
            expect(remainingBalance).toBeNull();

            await supabase.from("reward_programs").delete().eq("id", rewardProgram.id);
            await supabase.from("organisations").delete().eq("id", org.id);
        });
    });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";

import { RewardsRepository } from "@/repositories/rewards.repository";
import { supabase } from "@/lib/supabase-client";
import { postgrestErrorToHttpStatus } from "@/utils/postgres-error-handler";

// Exercises RewardsRepository against a real local Supabase/Postgres
// instance (`pnpm supabase:start`). No Express/HTTP involved - this is the
// tier that can catch drift between RewardSchema and the real table, or a
// real Postgres error being mapped to the wrong HTTP status.
describe("RewardsRepository (integration, real local Supabase)", () => {
    const repo = new RewardsRepository();

    let orgId: string;
    const createdIds: string[] = [];

    beforeAll(async () => {
        const { data: org, error } = await supabase
            .from("organisations")
            .insert({ name: `integration-org-${randomUUID()}` })
            .select("id")
            .single();
        if (error) throw error;
        orgId = org.id;
    });

    afterEach(async () => {
        if (createdIds.length) {
            await supabase.from("rewards").delete().in("id", createdIds);
            createdIds.length = 0;
        }
    });

    afterAll(async () => {
        await supabase.from("organisations").delete().eq("id", orgId);
    });

    describe("create", () => {
        it("persists a reward and returns it", async () => {
            const created = await repo.create({ org_id: orgId, name: "Free coffee", required_points: 6 });
            createdIds.push(created!.id);

            expect(created).toMatchObject({ org_id: orgId, name: "Free coffee", required_points: 6 });
        });

        it("throws a foreign-key-violation error for an org_id that doesn't exist", async () => {
            await expect(
                repo.create({ org_id: randomUUID(), name: "Free coffee", required_points: 6 }),
            ).rejects.toMatchObject({ code: "23503" });
        });

        it("throws a check-constraint-violation error for required_points of 0, mapped to a 4xx status", async () => {
            let caught: any;
            try {
                await repo.create({ org_id: orgId, name: "Free coffee", required_points: 0 });
            } catch (error) {
                caught = error;
            }

            expect(caught).toMatchObject({ code: "23514" });
            const status = postgrestErrorToHttpStatus(caught.code);
            expect(status).toBeGreaterThanOrEqual(400);
            expect(status).toBeLessThan(500);
        });
    });

    describe("findById / findAll", () => {
        it("findById returns null for an id that does not exist", async () => {
            expect(await repo.findById(randomUUID())).toBeNull();
        });

        it("findAll scopes results to the given org_id", async () => {
            const otherOrg = await supabase
                .from("organisations")
                .insert({ name: `integration-org-${randomUUID()}` })
                .select("id")
                .single();
            if (otherOrg.error) throw otherOrg.error;

            const created = await repo.create({ org_id: orgId, name: "Reward A", required_points: 1 });
            createdIds.push(created!.id);
            const otherReward = await repo.create({ org_id: otherOrg.data.id, name: "Reward B", required_points: 2 });

            expect(await repo.findAll(orgId)).toEqual([created]);

            await supabase.from("rewards").delete().eq("id", otherReward!.id);
            await supabase.from("organisations").delete().eq("id", otherOrg.data.id);
        });
    });

    describe("update / delete", () => {
        it("update persists changes and rejects an unknown id", async () => {
            const created = await repo.create({ org_id: orgId, name: "Old name", required_points: 6 });
            createdIds.push(created!.id);

            const updated = await repo.update(created!.id, { name: "New name" });
            expect(updated).toMatchObject({ name: "New name", org_id: orgId });

            await expect(repo.update(randomUUID(), { name: "x" })).rejects.toThrow();
        });

        it("delete removes the row", async () => {
            const created = await repo.create({ org_id: orgId, name: "To delete", required_points: 6 });

            expect(await repo.delete(created!.id)).toBe(true);
            expect(await repo.findById(created!.id)).toBeNull();
        });
    });

    describe("cascade delete", () => {
        it("removes rewards when the owning organisation is deleted", async () => {
            const { data: cascadeOrg, error } = await supabase
                .from("organisations")
                .insert({ name: `integration-cascade-org-${randomUUID()}` })
                .select("id")
                .single();
            if (error) throw error;

            const created = await repo.create({ org_id: cascadeOrg.id, name: "Cascade reward", required_points: 6 });

            await supabase.from("organisations").delete().eq("id", cascadeOrg.id);

            expect(await repo.findById(created!.id)).toBeNull();
        });
    });
});

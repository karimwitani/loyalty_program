import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";

import { RewardProgramsRepository } from "@/repositories/reward_programs.repository";
import { supabase } from "@/lib/supabase-client";
import { postgrestErrorToHttpStatus } from "@/utils/postgres-error-handler";

// Exercises RewardProgramsRepository against a real local Supabase/Postgres
// instance (`pnpm supabase:start`). No Express/HTTP involved - this is the
// tier that can catch drift between RewardProgramSchema and the real table,
// and it's the only tier that can verify DB-level invariants (the CHECK
// constraint, ON DELETE RESTRICT, and the atomicity of the create RPC) that
// a fake repository can't be wrong about by construction.
describe("RewardProgramsRepository (integration, real local Supabase)", () => {
    const repo = new RewardProgramsRepository();

    let orgId: string;
    const createdProgramIds: string[] = [];
    const createdRewardIds: string[] = [];

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
        // reward_programs.reward_id is ON DELETE RESTRICT - programs must be
        // removed before the rewards they're bound to.
        if (createdProgramIds.length) {
            await supabase.from("reward_programs").delete().in("id", createdProgramIds);
            createdProgramIds.length = 0;
        }
        if (createdRewardIds.length) {
            await supabase.from("rewards").delete().in("id", createdRewardIds);
            createdRewardIds.length = 0;
        }
    });

    afterAll(async () => {
        await supabase.from("organisations").delete().eq("id", orgId);
    });

    describe("createPointProgram", () => {
        it("persists a point_program with no bound reward", async () => {
            const created = await repo.createPointProgram({ title: "House Points", org_id: orgId });
            createdProgramIds.push(created.id);

            expect(created).toMatchObject({ title: "House Points", org_id: orgId, type: "point_program", reward: null });
        });
    });

    describe("createRewardProgramWithReward", () => {
        it("atomically creates the reward and the program, embedding the reward on read", async () => {
            const created = await repo.createRewardProgramWithReward({
                title: "Coffee Card",
                org_id: orgId,
                reward: { name: "Free coffee", required_points: 6 },
            });
            createdProgramIds.push(created.id);
            createdRewardIds.push(created.reward!.id);

            expect(created).toMatchObject({
                title: "Coffee Card",
                org_id: orgId,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6, org_id: orgId },
            });
        });

        it("is atomic: a forced failure on the reward leaves no orphan reward row", async () => {
            const rewardsBefore = await supabase.from("rewards").select("id").eq("org_id", orgId);
            const countBefore = rewardsBefore.data?.length ?? 0;

            // required_points of 0 trips rewards' check_required_points_positive
            // constraint inside the function body, forcing the whole
            // transaction (reward insert + program insert) to roll back.
            await expect(
                repo.createRewardProgramWithReward({
                    title: "Broken Card",
                    org_id: orgId,
                    reward: { name: "Free coffee", required_points: 0 },
                }),
            ).rejects.toMatchObject({ code: "23514" });

            const rewardsAfter = await supabase.from("rewards").select("id").eq("org_id", orgId);
            expect(rewardsAfter.data?.length ?? 0).toBe(countBefore);

            const programsAfter = await supabase.from("reward_programs").select("id").eq("org_id", orgId).eq("title", "Broken Card");
            expect(programsAfter.data ?? []).toHaveLength(0);
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

            const created = await repo.createPointProgram({ title: "Program A", org_id: orgId });
            createdProgramIds.push(created.id);
            const otherProgram = await repo.createPointProgram({ title: "Program B", org_id: otherOrg.data.id });

            expect(await repo.findAll(orgId)).toEqual([created]);

            await supabase.from("reward_programs").delete().eq("id", otherProgram.id);
            await supabase.from("organisations").delete().eq("id", otherOrg.data.id);
        });
    });

    // repo.update/repo.delete are split into a follow-up issue off LOY-13 -
    // cleanup in this file still uses raw `supabase.from("reward_programs")
    // .delete()` calls, not the repository method.

    describe("CHECK constraint (bypassing zod, direct insert)", () => {
        it("rejects a point_program row carrying a reward_id", async () => {
            const reward = await supabase
                .from("rewards")
                .insert({ org_id: orgId, name: "Orphan reward", required_points: 1 })
                .select("id")
                .single();
            if (reward.error) throw reward.error;
            createdRewardIds.push(reward.data.id);

            const { error } = await supabase
                .from("reward_programs")
                .insert({ title: "Bad point program", org_id: orgId, type: "point_program", reward_id: reward.data.id });

            expect(error).toMatchObject({ code: "23514" });
        });

        it("rejects a reward_program row with reward_id: null", async () => {
            const { error } = await supabase
                .from("reward_programs")
                .insert({ title: "Bad reward program", org_id: orgId, type: "reward_program", reward_id: null });

            expect(error).toMatchObject({ code: "23514" });
        });
    });

    describe("fk_reward_programs_reward_id ON DELETE RESTRICT", () => {
        it("refuses to delete a reward that a program depends on, mapped to a 409", async () => {
            const created = await repo.createRewardProgramWithReward({
                title: "Restrict Card",
                org_id: orgId,
                reward: { name: "Free coffee", required_points: 6 },
            });
            createdProgramIds.push(created.id);
            createdRewardIds.push(created.reward!.id);

            const { error } = await supabase.from("rewards").delete().eq("id", created.reward!.id);

            expect(error).toMatchObject({ code: "23503" });
            expect(postgrestErrorToHttpStatus(error?.code)).toBe(409);

            // the reward is still there, and the program still resolves it
            expect(await repo.findById(created.id)).toMatchObject({ reward: { id: created.reward!.id } });
        });
    });
});

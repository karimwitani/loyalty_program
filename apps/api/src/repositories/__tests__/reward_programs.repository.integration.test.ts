import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { Client } from "pg";

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

    // A raw pg connection, used only by the atomicity test below. Postgrest
    // (the `supabase` client used everywhere else in this file) can't run
    // DDL, and forcing fn_create_reward_program_with_reward's *second*
    // INSERT to fail - without also failing the first - requires a
    // constraint that isn't reachable through any combination of the RPC's
    // own parameters (see that test for why). SUPABASE_DB_URL is populated
    // by `pnpm env:test` alongside SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.
    const rawDb = new Client({ connectionString: process.env.SUPABASE_DB_URL });

    beforeAll(async () => {
        const { data: org, error } = await supabase
            .from("organisations")
            .insert({ name: `integration-org-${randomUUID()}` })
            .select("id")
            .single();
        if (error) throw error;
        orgId = org.id;

        await rawDb.connect();
    });

    afterAll(async () => {
        await rawDb.end();
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

        it("rejects a non-positive required_points before ever touching reward_programs", async () => {
            // fn_create_reward_program_with_reward's first statement is
            // `INSERT INTO rewards`, so required_points: 0 trips rewards' own
            // check_required_points_positive constraint immediately - the
            // second statement (INSERT INTO reward_programs) is never
            // reached. This is real, useful input-validation coverage, but
            // on its own it does NOT prove the function is atomic: a naive,
            // non-atomic two-statement implementation (plain repository code
            // issuing two separate `supabase.from(...).insert(...)` calls
            // with no transaction) would reject this exact payload the same
            // way, for the same reason - the first statement fails and the
            // second is simply never called. See the "is atomic" test below
            // for the case that actually distinguishes the two.
            await expect(
                repo.createRewardProgramWithReward({
                    title: "Broken Card",
                    org_id: orgId,
                    reward: { name: "Free coffee", required_points: 0 },
                }),
            ).rejects.toMatchObject({ code: "23514" });
        });

        it("is atomic: a forced failure on the second insert (reward_programs) rolls back the first (rewards)", async () => {
            // To actually exercise atomicity we need the function's FIRST
            // insert (`rewards`) to succeed and its SECOND insert
            // (`reward_programs`) to fail - only then does a rollback prove
            // the two statements run in one transaction rather than two
            // independent ones. Every reward_programs constraint reachable
            // through the RPC's own parameters (fk_reward_programs_org_id,
            // fk_reward_programs_reward_id, check_reward_programs_type_reward_id)
            // is guaranteed to pass: org_id is whatever was just used for the
            // rewards insert, reward_id is the id just returned by that
            // insert, and type is hardcoded to 'reward_program' inside the
            // function body. None of that is reachable from a test payload.
            //
            // So we add a temporary UNIQUE constraint on (org_id, title) -
            // requires DDL, hence the raw `pg` connection - and pre-occupy it
            // with a row for the exact (org_id, title) the RPC call below
            // will try to insert. The reward insert (statement 1) has no such
            // constraint and succeeds; the reward_programs insert (statement
            // 2) then hits a duplicate-key violation, forcing the whole
            // function to roll back.
            await rawDb.query(
                `ALTER TABLE reward_programs ADD CONSTRAINT test_only_unique_org_title UNIQUE (org_id, title)`,
            );

            try {
                const title = `Duplicate Card ${randomUUID()}`;

                const blocker = await supabase
                    .from("reward_programs")
                    .insert({ org_id: orgId, title, type: "point_program", reward_id: null })
                    .select("id")
                    .single();
                if (blocker.error) throw blocker.error;
                createdProgramIds.push(blocker.data.id);

                await expect(
                    repo.createRewardProgramWithReward({
                        title,
                        org_id: orgId,
                        reward: { name: "Orphan-if-not-atomic reward", required_points: 6 },
                    }),
                ).rejects.toMatchObject({ code: "23505" });

                // The real assertion: the reward from the RPC's first
                // (logically "succeeded") statement must not exist - if it
                // did, the function would not be atomic, regardless of
                // whether an error surfaced to the caller.
                const orphan = await supabase
                    .from("rewards")
                    .select("id")
                    .eq("org_id", orgId)
                    .eq("name", "Orphan-if-not-atomic reward");
                expect(orphan.data ?? []).toHaveLength(0);

                // And the blocker row is still the only reward_programs row
                // for this title - the RPC's own (failed) insert didn't
                // leave anything behind either.
                const programs = await supabase
                    .from("reward_programs")
                    .select("id")
                    .eq("org_id", orgId)
                    .eq("title", title);
                expect(programs.data ?? []).toHaveLength(1);
                expect(programs.data?.[0]?.id).toBe(blocker.data.id);
            } finally {
                await rawDb.query(`ALTER TABLE reward_programs DROP CONSTRAINT test_only_unique_org_title`);
            }
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

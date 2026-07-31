import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { supabase } from "@/lib/supabase-client";
import { RewardProgramSchema } from "@/domain/types/reward_programs.types";

// Full HTTP surface against a real local Supabase instance
// (`pnpm supabase:start`): real Express routing, real tsoa validation, the
// real global error handler, and the real (non-fake) IoC bindings.
// No auth flow yet - RewardProgramsController has no @Security() decorator.
describe("RewardProgramsController (e2e)", () => {
    let orgId: string;
    const createdProgramIds: string[] = [];
    const createdRewardIds: string[] = [];

    beforeAll(async () => {
        const { data: org, error } = await supabase
            .from("organisations")
            .insert({ name: `e2e-org-${randomUUID()}` })
            .select("id")
            .single();
        if (error) throw error;
        orgId = org.id;
    });

    afterEach(async () => {
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

    it("creates a stamp card in one call and reads it back with the reward embedded", async () => {
        const createResponse = await request(app)
            .post("/reward_programs")
            .send({
                title: `e2e-coffee-card-${randomUUID()}`,
                org_id: orgId,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6 },
            });
        expect(createResponse.status).toBe(201);
        createdProgramIds.push(createResponse.body.id);
        createdRewardIds.push(createResponse.body.reward.id);

        expect(() => RewardProgramSchema.parse(createResponse.body)).not.toThrow();
        expect(createResponse.body.reward).toMatchObject({ name: "Free coffee", required_points: 6, org_id: orgId });

        const getResponse = await request(app).get(`/reward_programs/${createResponse.body.id}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body).toEqual(createResponse.body);
    });

    it("creates a point program, and lists both programs filtered by org_id", async () => {
        const pointProgramResponse = await request(app)
            .post("/reward_programs")
            .send({ title: `e2e-house-points-${randomUUID()}`, org_id: orgId, type: "point_program" });
        expect(pointProgramResponse.status).toBe(201);
        createdProgramIds.push(pointProgramResponse.body.id);
        expect(pointProgramResponse.body.reward).toBeNull();

        const rewardProgramResponse = await request(app)
            .post("/reward_programs")
            .send({
                title: `e2e-coffee-card-${randomUUID()}`,
                org_id: orgId,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6 },
            });
        expect(rewardProgramResponse.status).toBe(201);
        createdProgramIds.push(rewardProgramResponse.body.id);
        createdRewardIds.push(rewardProgramResponse.body.reward.id);

        const listResponse = await request(app).get("/reward_programs").query({ org_id: orgId });
        expect(listResponse.status).toBe(200);
        const ids = listResponse.body.map((p: any) => p.id);
        expect(ids).toContain(pointProgramResponse.body.id);
        expect(ids).toContain(rewardProgramResponse.body.id);
    });

    it("returns 404 for get on an id that was never created", async () => {
        const missingId = randomUUID();

        expect((await request(app).get(`/reward_programs/${missingId}`)).status).toBe(404);
    });

    it("returns 422 for each invalid discriminated-union combination against the full stack", async () => {
        const pointWithReward = await request(app)
            .post("/reward_programs")
            .send({ title: "x", org_id: orgId, type: "point_program", reward: { name: "x", required_points: 1 } });
        expect(pointWithReward.status).toBe(422);

        const rewardProgramWithoutReward = await request(app)
            .post("/reward_programs")
            .send({ title: "x", org_id: orgId, type: "reward_program" });
        expect(rewardProgramWithoutReward.status).toBe(422);
    });

    // PATCH/DELETE e2e coverage (including the empty-body PATCH regression
    // case) is split into a follow-up issue off LOY-13.
});

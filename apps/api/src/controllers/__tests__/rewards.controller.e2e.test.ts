import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { supabase } from "@/lib/supabase-client";
import { RewardSchema } from "@/domain/types/rewards.types";

// Full HTTP surface against a real local Supabase instance
// (`pnpm supabase:start`): real Express routing, real tsoa validation, the
// real global error handler, and the real (non-fake) IoC bindings.
// No auth flow yet - RewardsController has no @Security() decorator.
describe("RewardsController (e2e)", () => {
    let orgId: string;
    const createdIds: string[] = [];

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
        if (createdIds.length) {
            await supabase.from("rewards").delete().in("id", createdIds);
            createdIds.length = 0;
        }
    });

    afterAll(async () => {
        await supabase.from("organisations").delete().eq("id", orgId);
    });

    it("supports create -> read -> filter -> update -> delete end to end", async () => {
        const createResponse = await request(app)
            .post("/rewards")
            .send({ org_id: orgId, name: `e2e-reward-${randomUUID()}`, required_points: 6 });
        createdIds.push(createResponse.body.id);
        expect(createResponse.status).toBe(201);
        expect(() => RewardSchema.parse(createResponse.body)).not.toThrow();

        const getResponse = await request(app).get(`/rewards/${createResponse.body.id}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body).toEqual(createResponse.body);

        const listResponse = await request(app).get("/rewards").query({ org_id: orgId });
        expect(listResponse.status).toBe(200);
        expect(listResponse.body.map((r: any) => r.id)).toContain(createResponse.body.id);

        const patchResponse = await request(app)
            .patch(`/rewards/${createResponse.body.id}`)
            .send({ name: "Updated name" });
        expect(patchResponse.status).toBe(200);
        expect(patchResponse.body.name).toBe("Updated name");

        const deleteResponse = await request(app).delete(`/rewards/${createResponse.body.id}`);
        expect(deleteResponse.status).toBe(204);

        const afterDelete = await request(app).get(`/rewards/${createResponse.body.id}`);
        expect(afterDelete.status).toBe(404);
    });

    it("returns 404 for get/patch/delete on an id that was never created", async () => {
        const missingId = randomUUID();

        expect((await request(app).get(`/rewards/${missingId}`)).status).toBe(404);
        expect((await request(app).patch(`/rewards/${missingId}`).send({ name: "x" })).status).toBe(404);
        expect((await request(app).delete(`/rewards/${missingId}`)).status).toBe(404);
    });

    it("returns 422 for an invalid create payload against the full stack", async () => {
        const response = await request(app)
            .post("/rewards")
            .send({ org_id: orgId, name: `e2e-reward-${randomUUID()}`, required_points: 0 });

        expect(response.status).toBe(422);
    });
});

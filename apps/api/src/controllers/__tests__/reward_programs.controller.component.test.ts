import { describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { RewardProgramSchema } from "@/domain/types/reward_programs.types";

describe("RewardProgramsController (component, fake repository)", () => {
    describe("POST /reward_programs", () => {
        it("creates a point_program and returns 201 with reward: null", async () => {
            const payload = { title: `House Points ${randomUUID()}`, org_id: randomUUID(), type: "point_program" as const };

            const response = await request(app).post("/reward_programs").send(payload);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({ ...payload, reward: null });
            expect(() => RewardProgramSchema.parse(response.body)).not.toThrow();
        });

        it("creates a reward_program with an embedded reward via a single call and returns 201", async () => {
            const payload = {
                title: `Coffee Card ${randomUUID()}`,
                org_id: randomUUID(),
                type: "reward_program" as const,
                reward: { name: "Free coffee", required_points: 6 },
            };

            const response = await request(app).post("/reward_programs").send(payload);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                title: payload.title,
                org_id: payload.org_id,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6, org_id: payload.org_id },
            });
            expect(response.body.reward.id).toBeTruthy();
            expect(() => RewardProgramSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 when point_program carries a reward key", async () => {
            const response = await request(app)
                .post("/reward_programs")
                .send({ title: "House Points", org_id: randomUUID(), type: "point_program", reward: { name: "x", required_points: 1 } });

            expect(response.status).toBe(422);
        });

        it("returns 422 when reward_program is missing its reward", async () => {
            const response = await request(app)
                .post("/reward_programs")
                .send({ title: "Coffee Card", org_id: randomUUID(), type: "reward_program" });

            expect(response.status).toBe(422);
        });

        it("returns 422 for an unrecognized type", async () => {
            const response = await request(app)
                .post("/reward_programs")
                .send({ title: "Coffee Card", org_id: randomUUID(), type: "other" });

            expect(response.status).toBe(422);
        });

        it("returns 422 when required fields are missing", async () => {
            const response = await request(app).post("/reward_programs").send({ type: "point_program" });

            expect(response.status).toBe(422);
        });
    });

    describe("GET /reward_programs", () => {
        it("returns only reward programs matching the org_id filter", async () => {
            const orgId = randomUUID();
            const createResponse = await request(app)
                .post("/reward_programs")
                .send({ title: `Program ${randomUUID()}`, org_id: orgId, type: "point_program" });
            await request(app)
                .post("/reward_programs")
                .send({ title: `Program ${randomUUID()}`, org_id: randomUUID(), type: "point_program" });

            const response = await request(app).get("/reward_programs").query({ org_id: orgId });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([createResponse.body]);
        });

        it("returns 422 for a malformed org_id filter", async () => {
            const response = await request(app).get("/reward_programs").query({ org_id: "not-a-uuid" });

            expect(response.status).toBe(422);
        });
    });

    describe("GET /reward_programs/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/reward_programs/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).get("/reward_programs/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("returns 200 with the embedded reward for a reward_program created via POST", async () => {
            const createResponse = await request(app)
                .post("/reward_programs")
                .send({
                    title: `Coffee Card ${randomUUID()}`,
                    org_id: randomUUID(),
                    type: "reward_program",
                    reward: { name: "Free coffee", required_points: 6 },
                });

            const getResponse = await request(app).get(`/reward_programs/${createResponse.body.id}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toEqual(createResponse.body);
        });
    });

    // PATCH /reward_programs/{id} and DELETE /reward_programs/{id} are split
    // into a follow-up issue off LOY-13.
});

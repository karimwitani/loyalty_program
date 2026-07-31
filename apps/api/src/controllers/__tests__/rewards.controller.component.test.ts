import { describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { RewardSchema } from "@/domain/types/rewards.types";

describe("RewardsController (component, fake repository)", () => {
    describe("POST /rewards", () => {
        it("creates a reward and returns 201", async () => {
            const payload = { org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 6 };

            const response = await request(app).post("/rewards").send(payload);

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject(payload);
            expect(() => RewardSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 when a required field is missing", async () => {
            const response = await request(app).post("/rewards").send({ required_points: 6 });

            expect(response.status).toBe(422);
        });

        it("returns 422 when required_points is not a positive integer", async () => {
            const response = await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: "Free coffee", required_points: 0 });

            expect(response.status).toBe(422);
        });
    });

    describe("GET /rewards", () => {
        it("returns only rewards matching the org_id filter", async () => {
            const orgId = randomUUID();
            const createResponse = await request(app)
                .post("/rewards")
                .send({ org_id: orgId, name: `reward-${randomUUID()}`, required_points: 6 });
            await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 4 });

            const response = await request(app).get("/rewards").query({ org_id: orgId });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([createResponse.body]);
        });

        it("returns 422 for a malformed org_id filter", async () => {
            const response = await request(app).get("/rewards").query({ org_id: "not-a-uuid" });

            expect(response.status).toBe(422);
        });
    });

    describe("GET /rewards/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/rewards/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).get("/rewards/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("returns 200 and the reward created via POST", async () => {
            const createResponse = await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 6 });

            const getResponse = await request(app).get(`/rewards/${createResponse.body.id}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toEqual(createResponse.body);
        });
    });

    describe("PATCH /rewards/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app)
                .patch(`/rewards/${randomUUID()}`)
                .send({ name: "New name" });

            expect(response.status).toBe(404);
        });

        it("returns 422 when the body contains an unknown field, or attempts to change org_id", async () => {
            const createResponse = await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 6 });

            const unknownField = await request(app)
                .patch(`/rewards/${createResponse.body.id}`)
                .send({ unknown_field: "nope" });
            expect(unknownField.status).toBe(422);

            const changeOrg = await request(app)
                .patch(`/rewards/${createResponse.body.id}`)
                .send({ org_id: randomUUID() });
            expect(changeOrg.status).toBe(422);
        });

        it("updates and returns the reward", async () => {
            const createResponse = await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 6 });

            const patchResponse = await request(app)
                .patch(`/rewards/${createResponse.body.id}`)
                .send({ name: "Updated name", required_points: 10 });

            expect(patchResponse.status).toBe(200);
            expect(patchResponse.body).toMatchObject({
                name: "Updated name",
                required_points: 10,
                org_id: createResponse.body.org_id,
            });
        });

        it("returns 200 and the unchanged reward for an empty body (no-op PATCH)", async () => {
            const createResponse = await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 6 });

            const patchResponse = await request(app).patch(`/rewards/${createResponse.body.id}`).send({});

            expect(patchResponse.status).toBe(200);
            expect(patchResponse.body).toEqual(createResponse.body);
        });
    });

    describe("DELETE /rewards/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).delete(`/rewards/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("deletes the reward and returns 204 with no body", async () => {
            const createResponse = await request(app)
                .post("/rewards")
                .send({ org_id: randomUUID(), name: `reward-${randomUUID()}`, required_points: 6 });

            const deleteResponse = await request(app).delete(`/rewards/${createResponse.body.id}`);

            expect(deleteResponse.status).toBe(204);
            expect(deleteResponse.body).toEqual({});

            const getResponse = await request(app).get(`/rewards/${createResponse.body.id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

import { describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { BalanceSchema } from "@/domain/types/balances.types";

describe("BalancesController (component, fake repository)", () => {
    describe("POST /balances", () => {
        it("creates a balance and returns 201", async () => {
            const payload = {
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 250,
            };

            const response = await request(app).post("/balances").send(payload);

            expect(response.status).toBe(201);
            expect(response.body.org_id).toBe(payload.org_id);
            expect(response.body.user_id).toBe(payload.user_id);
            expect(response.body.balance).toBe(payload.balance);
            expect(() => BalanceSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 when balance is negative", async () => {
            const response = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: -5,
            });

            expect(response.status).toBe(422);
        });

        it("returns 422 when a required field is missing", async () => {
            const response = await request(app).post("/balances").send({
                user_id: randomUUID(),
                balance: 10,
            });

            expect(response.status).toBe(422);
        });

        it("returns 422 when org_id is not a valid UUID", async () => {
            const response = await request(app).post("/balances").send({
                org_id: "not-a-uuid",
                user_id: randomUUID(),
                balance: 10,
            });

            expect(response.status).toBe(422);
        });

        it("returns 422 when user_id is not a valid UUID", async () => {
            const response = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: "not-a-uuid",
                balance: 10,
            });

            expect(response.status).toBe(422);
        });
    });

    describe("GET /balances", () => {
        it("returns 501 (not yet implemented)", async () => {
            const response = await request(app).get("/balances");

            expect(response.status).toBe(501);
        });
    });

    describe("GET /balances/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/balances/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).get("/balances/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("returns 200 and the balance created via POST", async () => {
            const payload = {
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 42,
            };
            const createResponse = await request(app).post("/balances").send(payload);

            const getResponse = await request(app).get(`/balances/${createResponse.body.id}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toEqual(createResponse.body);
        });
    });

    describe("POST /balances/{id}/increment", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app)
                .post(`/balances/${randomUUID()}/increment`)
                .send({ amount: 10 });

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app)
                .post("/balances/not-a-uuid/increment")
                .send({ amount: 10 });

            expect(response.status).toBe(422);
        });

        it("returns 422 when amount is 0", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/increment`)
                .send({ amount: 0 });

            expect(response.status).toBe(422);
        });

        it("increments the balance and returns the updated row", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/increment`)
                .send({ amount: 15 });

            expect(response.status).toBe(201);
            expect(response.body.balance).toBe(25);
        });

        it("returns 400 when incrementing would overflow the int4 column", async () => {
            // NB: this asserts the *intended* behavior. InMemoryBalancesRepository
            // throws a real PostgrestError here, but the real BalancesRepository
            // throws the raw (unwrapped) rpc error, which the global handler
            // doesn't recognize as a PostgrestError - so the e2e equivalent of
            // this test currently asserts 500, not 400. See the e2e test file.
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 2147483647,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/increment`)
                .send({ amount: 1 });

            expect(response.status).toBe(400);
        });
    });

    describe("POST /balances/{id}/redeem", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app)
                .post(`/balances/${randomUUID()}/redeem`)
                .send({ amount: 10 });

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app)
                .post("/balances/not-a-uuid/redeem")
                .send({ amount: 10 });

            expect(response.status).toBe(422);
        });

        it("returns 422 when amount is 0", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/redeem`)
                .send({ amount: 0 });

            expect(response.status).toBe(422);
        });

        it("redeems the balance and returns the updated row", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/redeem`)
                .send({ amount: 4 });

            expect(response.status).toBe(201);
            expect(response.body.balance).toBe(6);
        });

        it("returns 400 when redeeming more than the current balance", async () => {
            // NB: asserts intended behavior; see the equivalent note on the
            // increment-overflow test above - the e2e version of this case
            // currently asserts 500 due to the unwrapped-error bug in the
            // real BalancesRepository.
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/redeem`)
                .send({ amount: 11 });

            expect(response.status).toBe(400);
        });
    });

    describe("DELETE /balances/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).delete(`/balances/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).delete("/balances/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("deletes the balance and returns 204 with no body", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const deleteResponse = await request(app).delete(`/balances/${createResponse.body.id}`);

            expect(deleteResponse.status).toBe(204);
            expect(deleteResponse.body).toEqual({});

            const getResponse = await request(app).get(`/balances/${createResponse.body.id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

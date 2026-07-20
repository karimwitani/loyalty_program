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
    });

    describe("GET /balances/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/balances/${randomUUID()}`);

            expect(response.status).toBe(404);
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
});

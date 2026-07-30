import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { supabase } from "@/lib/supabase-client";
import { BalanceSchema } from "@/domain/types/balances.types";

// Full HTTP surface against a real local Supabase instance
// (`pnpm supabase:start`): real Express routing, real tsoa validation, the
// real global error handler, and the real (non-fake) IoC bindings.
// No auth flow yet - BalancesController has no @Security() decorator.
describe("BalancesController (e2e)", () => {
    let orgId: string;
    let userId: string;
    let authUserId: string;

    beforeAll(async () => {
        const { data: org, error: orgError } = await supabase
            .from("organisations")
            .insert({ name: `e2e-org-${randomUUID()}` })
            .select("id")
            .single();
        if (orgError) throw orgError;
        orgId = org.id;

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: `e2e-${randomUUID()}@test.com`,
            password: "password123",
            email_confirm: true,
        });
        if (authError) throw authError;
        authUserId = authUser.user!.id;
        userId = authUserId;

        const { error: userError } = await supabase
            .from("users")
            .insert({ id: userId, first_name: "E2E", last_name: "Test" });
        if (userError) throw userError;
    });

    afterEach(async () => {
        await supabase.from("balances").delete().eq("user_id", userId);
    });

    afterAll(async () => {
        await supabase.from("users").delete().eq("id", userId);
        await supabase.from("organisations").delete().eq("id", orgId);
        await supabase.auth.admin.deleteUser(authUserId);
    });

    describe("POST /balances", () => {
        it("creates a balance and returns 201", async () => {
            const response = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
                balance: 300,
            });

            expect(response.status).toBe(201);
            expect(() => BalanceSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 when balance exceeds the int4 column limit", async () => {
            const response = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
                balance: 2147483648,
            });

            expect(response.status).toBe(422);
        });

        it("returns 409 when org_id references a row that doesn't exist", async () => {
            const response = await request(app).post("/balances").send({
                org_id: randomUUID(),
                user_id: userId,
                balance: 10,
            });

            expect(response.status).toBe(409);
        });
    });

    describe("GET /balances/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/balances/${randomUUID()}`);
            expect(response.status).toBe(404);
        });

        it("returns 200 and the balance created via POST", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
                balance: 75,
            });

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

        it("increments the balance via fn_increment_balance and returns the updated row", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/increment`)
                .send({ amount: 15 });

            expect(response.status).toBe(201);
            expect(response.body.balance).toBe(25);
        });

        it("returns 400 when incrementing would overflow the int4 column", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
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

        it("redeems the balance via fn_decrement_balance and returns the updated row", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/redeem`)
                .send({ amount: 4 });

            expect(response.status).toBe(201);
            expect(response.body.balance).toBe(6);
        });

        it("returns 400 when redeeming more than the current balance", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
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

        it("deletes the balance and returns 204", async () => {
            const createResponse = await request(app).post("/balances").send({
                org_id: orgId,
                user_id: userId,
                balance: 10,
            });

            const deleteResponse = await request(app).delete(`/balances/${createResponse.body.id}`);
            expect(deleteResponse.status).toBe(204);

            const getResponse = await request(app).get(`/balances/${createResponse.body.id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

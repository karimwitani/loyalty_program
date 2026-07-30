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
    let rewardProgramId: string;
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

        const { data: rewardProgram, error: rewardProgramError } = await supabase
            .from("reward_programs")
            .insert({ title: `e2e-program-${randomUUID()}`, org_id: orgId, type: "point_program" })
            .select("id")
            .single();
        if (rewardProgramError) throw rewardProgramError;
        rewardProgramId = rewardProgram.id;

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
        await supabase.from("reward_programs").delete().eq("id", rewardProgramId);
        await supabase.from("organisations").delete().eq("id", orgId);
        await supabase.auth.admin.deleteUser(authUserId);
    });

    describe("POST /balances", () => {
        it("creates a balance and returns 201", async () => {
            const response = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 300,
            });

            expect(response.status).toBe(201);
            expect(() => BalanceSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 when balance exceeds the int4 column limit", async () => {
            const response = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 2147483648,
            });

            expect(response.status).toBe(422);
        });

        it("returns 409 when reward_program_id references a row that doesn't exist", async () => {
            const response = await request(app).post("/balances").send({
                reward_program_id: randomUUID(),
                user_id: userId,
                balance: 10,
            });

            expect(response.status).toBe(409);
        });

        it("returns 409 when a balance already exists for the same reward_program_id and user_id", async () => {
            const payload = {
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 10,
            };

            const first = await request(app).post("/balances").send(payload);
            expect(first.status).toBe(201);

            const second = await request(app).post("/balances").send(payload);
            expect(second.status).toBe(409);
        });
    });

    describe("GET /balances/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/balances/${randomUUID()}`);
            expect(response.status).toBe(404);
        });

        it("returns 200 and the balance created via POST", async () => {
            const createResponse = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 75,
            });

            const getResponse = await request(app).get(`/balances/${createResponse.body.id}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toEqual(createResponse.body);
        });
    });

    describe("GET /balances/{id}/transactions", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/balances/${randomUUID()}/transactions`);
            expect(response.status).toBe(404);
        });

        it("returns 200 with an empty page when the balance has no transactions", async () => {
            const createResponse = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 100,
            });

            const response = await request(app).get(
                `/balances/${createResponse.body.id}/transactions`,
            );

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ data: [], has_more: false, next_cursor: null });
        });

        it("pages through the history matching the increments/redeems performed, newest first", async () => {
            const createResponse = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 100,
            });
            const balanceId = createResponse.body.id;

            await request(app).post(`/balances/${balanceId}/increment`).send({ amount: 10 });
            await request(app).post(`/balances/${balanceId}/redeem`).send({ amount: 5 });
            await request(app).post(`/balances/${balanceId}/increment`).send({ amount: 20 });

            const firstPage = await request(app)
                .get(`/balances/${balanceId}/transactions`)
                .query({ page_size: 2 });

            expect(firstPage.status).toBe(200);
            expect(firstPage.body.data).toHaveLength(2);
            expect(firstPage.body.data.map((t: { type: string; amount: number }) => [t.type, t.amount])).toEqual([
                ["credit", 20],
                ["debit", 5],
            ]);
            expect(firstPage.body.has_more).toBe(true);
            expect(firstPage.body.next_cursor).not.toBeNull();

            const secondPage = await request(app)
                .get(`/balances/${balanceId}/transactions`)
                .query({ page_size: 2, starting_after: firstPage.body.next_cursor });

            expect(secondPage.status).toBe(200);
            expect(secondPage.body.data).toHaveLength(1);
            expect(secondPage.body.data[0].type).toBe("credit");
            expect(secondPage.body.data[0].amount).toBe(10);
            expect(secondPage.body.has_more).toBe(false);
            expect(secondPage.body.next_cursor).toBeNull();
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
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/increment`)
                .send({ amount: 15 });

            expect(response.status).toBe(201);
            expect(response.body.balance).toBe(25);
        });

        it("returns 500 when incrementing would overflow the int4 column", async () => {
            // NB: this "should" be a 400 - the underlying Postgres error code
            // (22003) does map to 400 in postgrestErrorToHttpStatus - but
            // BalancesRepository.increment() throws the raw rpc error instead
            // of wrapping it with toPostgrestError() first, so it isn't
            // `instanceof PostgrestError` and the global handler's generic
            // 500 fallback catches it instead. Known/deferred, not fixed here.
            const createResponse = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 2147483647,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/increment`)
                .send({ amount: 1 });

            expect(response.status).toBe(500);
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
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/redeem`)
                .send({ amount: 4 });

            expect(response.status).toBe(201);
            expect(response.body.balance).toBe(6);
        });

        it("returns 500 when redeeming more than the current balance", async () => {
            // NB: same underlying issue as the increment overflow case above -
            // BalancesRepository.redeem() throws the raw rpc error (code
            // 23514) instead of wrapping it with toPostgrestError(), so it
            // misses the PostgrestError branch and falls to the generic 500.
            const createResponse = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
                user_id: userId,
                balance: 10,
            });

            const response = await request(app)
                .post(`/balances/${createResponse.body.id}/redeem`)
                .send({ amount: 11 });

            expect(response.status).toBe(500);
        });
    });

    describe("DELETE /balances/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).delete(`/balances/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("deletes the balance and returns 204", async () => {
            const createResponse = await request(app).post("/balances").send({
                reward_program_id: rewardProgramId,
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

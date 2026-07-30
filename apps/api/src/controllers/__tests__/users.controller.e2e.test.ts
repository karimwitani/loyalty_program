import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { supabase } from "@/lib/supabase-client";
import { UserSchema } from "@/domain/types/users.types";

// Full HTTP surface against a real local Supabase instance
// (`pnpm supabase:start`): real Express routing, real tsoa validation, the
// real global error handler, and the real (non-fake) IoC bindings.
// No auth flow yet - UsersController has no @Security() decorator.
// users.id is a foreign key to auth.users(id), so each case provisions a
// real auth user first via the admin API.
describe("UsersController (e2e)", () => {
    const createdUserIds: string[] = [];
    const createdAuthUserIds: string[] = [];

    async function makeAuthUserId(): Promise<string> {
        const { data, error } = await supabase.auth.admin.createUser({
            email: `e2e-${randomUUID()}@test.com`,
            password: "password123",
            email_confirm: true,
        });
        if (error) throw error;
        createdAuthUserIds.push(data.user!.id);
        return data.user!.id;
    }

    function makeUserPayload(id: string, overrides: Record<string, unknown> = {}) {
        return {
            id,
            first_name: "Ada",
            last_name: "Lovelace",
            email: `e2e-${randomUUID()}@test.com`,
            ...overrides,
        };
    }

    afterEach(async () => {
        if (createdUserIds.length) {
            await supabase.from("users").delete().in("id", createdUserIds);
            createdUserIds.length = 0;
        }
    });

    afterAll(async () => {
        for (const id of createdAuthUserIds) {
            await supabase.auth.admin.deleteUser(id);
        }
    });

    describe("POST /users", () => {
        it("creates a user and returns 201", async () => {
            const id = await makeAuthUserId();

            const response = await request(app).post("/users").send(makeUserPayload(id));
            createdUserIds.push(response.body.id);

            expect(response.status).toBe(201);
            expect(() => UserSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 for an invalid email", async () => {
            const id = await makeAuthUserId();

            const response = await request(app)
                .post("/users")
                .send(makeUserPayload(id, { email: "not-an-email" }));

            expect(response.status).toBe(422);
        });

        it("returns 422 when a required field is missing", async () => {
            const response = await request(app).post("/users").send({ first_name: "Ada" });

            expect(response.status).toBe(422);
        });

        it("returns 409 when a user with the same id already exists", async () => {
            const id = await makeAuthUserId();
            const payload = makeUserPayload(id);

            const created = await request(app).post("/users").send(payload);
            createdUserIds.push(created.body.id);

            const response = await request(app)
                .post("/users")
                .send({ ...payload, email: `other-${randomUUID()}@test.com` });

            expect(response.status).toBe(409);
        });
    });

    describe("GET /users/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/users/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 200 and the user created via POST", async () => {
            const id = await makeAuthUserId();
            const createResponse = await request(app).post("/users").send(makeUserPayload(id));
            createdUserIds.push(createResponse.body.id);

            const getResponse = await request(app).get(`/users/${createResponse.body.id}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toEqual(createResponse.body);
        });
    });

    describe("PATCH /users/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app)
                .patch(`/users/${randomUUID()}`)
                .send({ first_name: "New name" });

            expect(response.status).toBe(404);
        });

        it("returns 422 when the body includes an id field", async () => {
            const id = await makeAuthUserId();
            const createResponse = await request(app).post("/users").send(makeUserPayload(id));
            createdUserIds.push(createResponse.body.id);

            const response = await request(app)
                .patch(`/users/${id}`)
                .send({ id: randomUUID(), first_name: "New name" });

            expect(response.status).toBe(422);
        });

        it("updates and returns the user", async () => {
            const id = await makeAuthUserId();
            const createResponse = await request(app).post("/users").send(makeUserPayload(id));
            createdUserIds.push(createResponse.body.id);

            const patchResponse = await request(app)
                .patch(`/users/${id}`)
                .send({ first_name: "Augusta" });

            expect(patchResponse.status).toBe(200);
            expect(patchResponse.body.first_name).toBe("Augusta");
        });
    });

    describe("DELETE /users/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).delete(`/users/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("deletes the user and returns 204", async () => {
            const id = await makeAuthUserId();
            await request(app).post("/users").send(makeUserPayload(id));

            const deleteResponse = await request(app).delete(`/users/${id}`);
            expect(deleteResponse.status).toBe(204);

            const getResponse = await request(app).get(`/users/${id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

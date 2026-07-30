import { describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { UserSchema } from "@/domain/types/users.types";

function makeUserPayload(overrides: Record<string, unknown> = {}) {
    return {
        id: randomUUID(),
        first_name: "Ada",
        last_name: "Lovelace",
        email: `ada-${randomUUID()}@test.com`,
        ...overrides,
    };
}

describe("UsersController (component, fake repository)", () => {
    describe("POST /users", () => {
        it("creates a user and returns 201", async () => {
            const payload = makeUserPayload();

            const response = await request(app).post("/users").send(payload);

            expect(response.status).toBe(201);
            expect(response.body.id).toBe(payload.id);
            expect(response.body.email).toBe(payload.email);
            expect(() => UserSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 for an invalid email format", async () => {
            const response = await request(app).post("/users").send(makeUserPayload({ email: "not-an-email" }));

            expect(response.status).toBe(422);
        });

        it("returns 422 when a required field is missing", async () => {
            const response = await request(app).post("/users").send({ first_name: "Ada" });

            expect(response.status).toBe(422);
        });

        it("returns 409 when a user with the same id already exists", async () => {
            const payload = makeUserPayload();
            const firstResponse = await request(app).post("/users").send(payload);
            expect(firstResponse.status).toBe(201);

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

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).get("/users/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("returns 200 and the user created via POST", async () => {
            const createResponse = await request(app).post("/users").send(makeUserPayload());

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

        it("returns 422 for a malformed id", async () => {
            const response = await request(app)
                .patch("/users/not-a-uuid")
                .send({ first_name: "New name" });

            expect(response.status).toBe(422);
        });

        it("returns 422 when the body includes an id field", async () => {
            const createResponse = await request(app).post("/users").send(makeUserPayload());

            const response = await request(app)
                .patch(`/users/${createResponse.body.id}`)
                .send({ id: randomUUID(), first_name: "New name" });

            expect(response.status).toBe(422);
        });

        it("updates and returns the user", async () => {
            const createResponse = await request(app).post("/users").send(makeUserPayload());

            const patchResponse = await request(app)
                .patch(`/users/${createResponse.body.id}`)
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

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).delete("/users/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("deletes the user and returns 204 with no body", async () => {
            const createResponse = await request(app).post("/users").send(makeUserPayload());

            const deleteResponse = await request(app).delete(`/users/${createResponse.body.id}`);

            expect(deleteResponse.status).toBe(204);
            expect(deleteResponse.body).toEqual({});

            const getResponse = await request(app).get(`/users/${createResponse.body.id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

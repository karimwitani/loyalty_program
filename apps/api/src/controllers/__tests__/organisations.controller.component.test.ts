import { describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { OrganisationSchema } from "@/domain/types/organisations.types";

describe("OrganisationsController (component, fake repository)", () => {
    describe("POST /organisations", () => {
        it("creates an organisation and returns 201", async () => {
            const payload = { name: `org-${randomUUID()}` };

            const response = await request(app).post("/organisations").send(payload);

            expect(response.status).toBe(201);
            expect(response.body.name).toBe(payload.name);
            expect(() => OrganisationSchema.parse(response.body)).not.toThrow();
        });

        it("returns 422 when name is missing", async () => {
            const response = await request(app).post("/organisations").send({});

            expect(response.status).toBe(422);
        });
    });

    describe("GET /organisations/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).get(`/organisations/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).get("/organisations/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("returns 200 and the organisation created via POST", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `org-${randomUUID()}` });

            const getResponse = await request(app).get(`/organisations/${createResponse.body.id}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toEqual(createResponse.body);
        });
    });

    describe("PATCH /organisations/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app)
                .patch(`/organisations/${randomUUID()}`)
                .send({ name: "New name" });

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app)
                .patch("/organisations/not-a-uuid")
                .send({ name: "New name" });

            expect(response.status).toBe(422);
        });

        it("returns 422 when the body contains an unknown field", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `org-${randomUUID()}` });

            const response = await request(app)
                .patch(`/organisations/${createResponse.body.id}`)
                .send({ unknown_field: "nope" });

            expect(response.status).toBe(422);
        });

        it("updates and returns the organisation", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `org-${randomUUID()}` });

            const patchResponse = await request(app)
                .patch(`/organisations/${createResponse.body.id}`)
                .send({ name: "Updated name" });

            expect(patchResponse.status).toBe(200);
            expect(patchResponse.body.name).toBe("Updated name");
        });
    });

    describe("DELETE /organisations/{id}", () => {
        it("returns 404 for an id that was never created", async () => {
            const response = await request(app).delete(`/organisations/${randomUUID()}`);

            expect(response.status).toBe(404);
        });

        it("returns 422 for a malformed id", async () => {
            const response = await request(app).delete("/organisations/not-a-uuid");

            expect(response.status).toBe(422);
        });

        it("deletes the organisation and returns 204 with no body", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `org-${randomUUID()}` });

            const deleteResponse = await request(app).delete(`/organisations/${createResponse.body.id}`);

            expect(deleteResponse.status).toBe(204);
            expect(deleteResponse.body).toEqual({});

            const getResponse = await request(app).get(`/organisations/${createResponse.body.id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

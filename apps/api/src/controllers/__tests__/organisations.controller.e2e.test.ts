import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "@/app";
import { supabase } from "@/lib/supabase-client";
import { OrganisationSchema } from "@/domain/types/organisations.types";

// Full HTTP surface against a real local Supabase instance
// (`pnpm supabase:start`): real Express routing, real tsoa validation, the
// real global error handler, and the real (non-fake) IoC bindings.
// No auth flow yet - OrganisationsController has no @Security() decorator.
describe("OrganisationsController (e2e)", () => {
    const createdIds: string[] = [];

    afterEach(async () => {
        if (createdIds.length) {
            await supabase.from("organisations").delete().in("id", createdIds);
            createdIds.length = 0;
        }
    });

    describe("POST /organisations", () => {
        it("creates an organisation and returns 201", async () => {
            const response = await request(app)
                .post("/organisations")
                .send({ name: `e2e-org-${randomUUID()}` });
            createdIds.push(response.body.id);

            expect(response.status).toBe(201);
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

        it("returns 200 and the organisation created via POST", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `e2e-org-${randomUUID()}` });
            createdIds.push(createResponse.body.id);

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

        it("updates and returns the organisation", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `e2e-org-${randomUUID()}` });
            createdIds.push(createResponse.body.id);

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

        it("deletes the organisation and returns 204", async () => {
            const createResponse = await request(app)
                .post("/organisations")
                .send({ name: `e2e-org-${randomUUID()}` });

            const deleteResponse = await request(app).delete(`/organisations/${createResponse.body.id}`);
            expect(deleteResponse.status).toBe(204);

            const getResponse = await request(app).get(`/organisations/${createResponse.body.id}`);
            expect(getResponse.status).toBe(404);
        });
    });
});

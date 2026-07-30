import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";

import { OrganisationsRepository } from "@/repositories/organisations.repository";
import { supabase } from "@/lib/supabase-client";

// Exercises OrganisationsRepository against a real local Supabase/Postgres
// instance (`pnpm supabase:start`). No Express/HTTP involved - this is the
// tier that can catch drift between OrganisationSchema and the real table,
// or a real Postgres error being silently swallowed instead of thrown.
describe("OrganisationsRepository (integration, real local Supabase)", () => {
    const repo = new OrganisationsRepository();
    const createdIds: string[] = [];

    afterEach(async () => {
        if (createdIds.length) {
            await supabase.from("organisations").delete().in("id", createdIds);
            createdIds.length = 0;
        }
    });

    describe("create", () => {
        it("persists an organisation and returns it", async () => {
            const name = `integration-org-${randomUUID()}`;
            const created = await repo.create({ name });
            createdIds.push(created!.id);

            expect(created?.name).toBe(name);
        });
    });

    describe("findById", () => {
        it("returns null for an id that does not exist", async () => {
            const result = await repo.findById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the row created via create()", async () => {
            const created = await repo.create({ name: `integration-org-${randomUUID()}` });
            createdIds.push(created!.id);

            const found = await repo.findById(created!.id);

            expect(found).toEqual(created);
        });
    });

    describe("update", () => {
        it("updates and returns the organisation", async () => {
            const created = await repo.create({ name: `integration-org-${randomUUID()}` });
            createdIds.push(created!.id);

            const updated = await repo.update(created!.id, { name: "renamed" });

            expect(updated?.name).toBe("renamed");
        });

        it("throws instead of silently returning null when the id doesn't exist", async () => {
            await expect(
                repo.update(randomUUID(), { name: "does not matter" }),
            ).rejects.toThrow();
        });
    });

    describe("delete", () => {
        it("deletes the organisation", async () => {
            const created = await repo.create({ name: `integration-org-${randomUUID()}` });

            const result = await repo.delete(created!.id);
            expect(result).toBe(true);

            const found = await repo.findById(created!.id);
            expect(found).toBeNull();
        });
    });
});

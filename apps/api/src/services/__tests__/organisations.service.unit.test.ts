import { describe, expect, it, beforeEach, vi } from "vitest";
import { randomUUID } from "crypto";

import { OrganisationsService } from "@/services/organisations.service";
import { InMemoryOrganisationsRepository } from "@/repositories/__fakes__/in-memory-organisations.repository";
import type { IOrganisationsRepository } from "@/repositories/organisations.repository";
import type { OrganisationCreate } from "@/domain/types/organisations.types";

describe("OrganisationsService", () => {
    let repo: InMemoryOrganisationsRepository;
    let service: OrganisationsService;

    beforeEach(() => {
        repo = new InMemoryOrganisationsRepository();
        service = new OrganisationsService(repo);
    });

    describe("getOrganisationById", () => {
        it("returns null when no organisation exists for the id", async () => {
            const result = await service.getOrganisationById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the organisation created via the repository", async () => {
            const created = await service.createOrganisation({ name: "Acme" });

            const result = await service.getOrganisationById(created!.id);

            expect(result).toEqual(created);
        });
    });

    describe("createOrganisation", () => {
        it("persists a valid organisation and returns it", async () => {
            const payload: OrganisationCreate = { name: "Acme Corp" };

            const result = await service.createOrganisation(payload);

            expect(result?.name).toBe(payload.name);
        });
    });

    describe("updateOrganisation", () => {
        it("throws NotFoundError when the organisation does not exist", async () => {
            await expect(
                service.updateOrganisation(randomUUID(), { name: "New name" }),
            ).rejects.toThrow(/not found/i);
        });

        it("updates and returns the organisation when it exists", async () => {
            const created = await service.createOrganisation({ name: "Old name" });

            const updated = await service.updateOrganisation(created!.id, { name: "New name" });

            expect(updated?.name).toBe("New name");
        });

        it("propagates a repository error instead of swallowing it", async () => {
            const failingRepo: IOrganisationsRepository = {
                findById: vi.fn().mockResolvedValue({
                    id: randomUUID(),
                    name: "x",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
                create: vi.fn(),
                update: vi.fn().mockRejectedValue(new Error("db exploded")),
                delete: vi.fn(),
            };
            const failingService = new OrganisationsService(failingRepo);

            await expect(
                failingService.updateOrganisation(randomUUID(), { name: "New name" }),
            ).rejects.toThrow("db exploded");
        });
    });

    describe("deleteOrganisation", () => {
        it("throws NotFoundError when the organisation does not exist", async () => {
            await expect(service.deleteOrganisation(randomUUID())).rejects.toThrow(/not found/i);
        });

        it("deletes and returns true when the organisation exists", async () => {
            const created = await service.createOrganisation({ name: "To delete" });

            const result = await service.deleteOrganisation(created!.id);

            expect(result).toBe(true);
        });
    });
});

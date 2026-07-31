import { describe, expect, it, beforeEach, vi } from "vitest";
import { randomUUID } from "crypto";

import { RewardsService } from "@/services/rewards.service";
import { InMemoryRewardsRepository } from "@/repositories/__fakes__/in-memory-rewards.repository";
import type { IRewardsRepository } from "@/repositories/rewards.repository";

describe("RewardsService", () => {
    let repo: InMemoryRewardsRepository;
    let service: RewardsService;
    let orgId: string;

    beforeEach(() => {
        repo = new InMemoryRewardsRepository();
        service = new RewardsService(repo);
        orgId = randomUUID();
    });

    describe("getRewardById", () => {
        it("returns null when no reward exists for the id", async () => {
            expect(await service.getRewardById(randomUUID())).toBeNull();
        });

        it("returns the reward created via the repository", async () => {
            const created = await service.createReward({ org_id: orgId, name: "Free coffee", required_points: 6 });

            expect(await service.getRewardById(created!.id)).toEqual(created);
        });
    });

    describe("getRewards", () => {
        it("filters by org_id when passed, and returns everything otherwise", async () => {
            const created = await service.createReward({ org_id: orgId, name: "Reward A", required_points: 1 });
            await service.createReward({ org_id: randomUUID(), name: "Reward B", required_points: 2 });

            expect(await service.getRewards(orgId)).toEqual([created]);
            expect(await service.getRewards()).toHaveLength(2);
        });
    });

    describe("createReward", () => {
        it("persists a valid reward and returns it", async () => {
            const result = await service.createReward({ org_id: orgId, name: "Free coffee", required_points: 6 });

            expect(result).toMatchObject({ org_id: orgId, name: "Free coffee", required_points: 6 });
        });

        it("throws a ZodError for required_points of 0", async () => {
            await expect(
                service.createReward({ org_id: orgId, name: "Free coffee", required_points: 0 }),
            ).rejects.toThrow();
        });
    });

    describe("updateReward", () => {
        it("throws NotFoundError when the reward does not exist", async () => {
            await expect(
                service.updateReward(randomUUID(), { name: "New name" }),
            ).rejects.toThrow(/not found/i);
        });

        it("updates and returns the reward when it exists, without touching org_id", async () => {
            const created = await service.createReward({ org_id: orgId, name: "Old name", required_points: 6 });

            const updated = await service.updateReward(created!.id, { name: "New name" });

            expect(updated).toMatchObject({ name: "New name", org_id: orgId });
        });

        it("short-circuits an empty payload instead of forwarding it to the repository", async () => {
            // RewardUpdateSchema accepts {} as a valid no-op PATCH, but
            // PostgREST rejects an empty .update({}) with PGRST116. The
            // service must never forward an empty payload to repo.update -
            // verified here with a spy repo so the fake's leniency (it
            // happily accepts {}) can't mask a regression.
            const updateSpy = vi.fn();
            const spyRepo: IRewardsRepository = {
                findById: vi.fn().mockResolvedValue({
                    id: "reward-id",
                    org_id: orgId,
                    name: "Unchanged",
                    required_points: 6,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
                findAll: vi.fn(),
                create: vi.fn(),
                update: updateSpy,
                delete: vi.fn(),
            };
            const spyService = new RewardsService(spyRepo);

            const result = await spyService.updateReward("reward-id", {});

            expect(result).toMatchObject({ id: "reward-id", name: "Unchanged" });
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("propagates a repository error instead of swallowing it", async () => {
            const failingRepo: IRewardsRepository = {
                findById: vi.fn().mockResolvedValue({
                    id: randomUUID(),
                    org_id: orgId,
                    name: "x",
                    required_points: 6,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
                findAll: vi.fn(),
                create: vi.fn(),
                update: vi.fn().mockRejectedValue(new Error("db exploded")),
                delete: vi.fn(),
            };
            const failingService = new RewardsService(failingRepo);

            await expect(
                failingService.updateReward(randomUUID(), { name: "New name" }),
            ).rejects.toThrow("db exploded");
        });
    });

    describe("deleteReward", () => {
        it("throws NotFoundError when the reward does not exist", async () => {
            await expect(service.deleteReward(randomUUID())).rejects.toThrow(/not found/i);
        });

        it("deletes and returns true when the reward exists", async () => {
            const created = await service.createReward({ org_id: orgId, name: "To delete", required_points: 6 });

            expect(await service.deleteReward(created!.id)).toBe(true);
        });
    });
});

import { describe, expect, it, beforeEach, vi } from "vitest";
import { randomUUID } from "crypto";

import { RewardProgramsService } from "@/services/reward_programs.service";
import { InMemoryRewardProgramsRepository } from "@/repositories/__fakes__/in-memory-reward-programs.repository";
import { InMemoryRewardsRepository } from "@/repositories/__fakes__/in-memory-rewards.repository";
import type { IRewardProgramsRepository } from "@/repositories/reward_programs.repository";

describe("RewardProgramsService", () => {
    let rewardProgramsRepo: InMemoryRewardProgramsRepository;
    let service: RewardProgramsService;
    let orgId: string;

    beforeEach(() => {
        rewardProgramsRepo = new InMemoryRewardProgramsRepository(new InMemoryRewardsRepository());
        service = new RewardProgramsService(rewardProgramsRepo);
        orgId = randomUUID();
    });

    describe("getRewardProgramById", () => {
        it("returns null when no reward program exists for the id", async () => {
            expect(await service.getRewardProgramById(randomUUID())).toBeNull();
        });

        it("returns the reward program created via the repository", async () => {
            const created = await service.createRewardProgram({ title: "House Points", org_id: orgId, type: "point_program" });

            expect(await service.getRewardProgramById(created.id)).toEqual(created);
        });
    });

    describe("getRewardPrograms", () => {
        it("filters by org_id when passed, and returns everything otherwise", async () => {
            const created = await service.createRewardProgram({ title: "House Points", org_id: orgId, type: "point_program" });
            await service.createRewardProgram({ title: "Other org", org_id: randomUUID(), type: "point_program" });

            expect(await service.getRewardPrograms(orgId)).toEqual([created]);
            expect(await service.getRewardPrograms()).toHaveLength(2);
        });
    });

    describe("createRewardProgram", () => {
        it("branches to createPointProgram for type: point_program, with reward: null", async () => {
            const spyRepo: IRewardProgramsRepository = {
                findById: vi.fn(),
                findAll: vi.fn(),
                createPointProgram: vi.fn().mockResolvedValue({ id: "id", title: "House Points", org_id: orgId, type: "point_program", reward: null, created_at: "x", updated_at: "x" }),
                createRewardProgramWithReward: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            };
            const spyService = new RewardProgramsService(spyRepo);

            await spyService.createRewardProgram({ title: "House Points", org_id: orgId, type: "point_program" });

            expect(spyRepo.createPointProgram).toHaveBeenCalledWith({ title: "House Points", org_id: orgId });
            expect(spyRepo.createRewardProgramWithReward).not.toHaveBeenCalled();
        });

        it("branches to createRewardProgramWithReward for type: reward_program, forwarding the nested reward", async () => {
            const spyRepo: IRewardProgramsRepository = {
                findById: vi.fn(),
                findAll: vi.fn(),
                createPointProgram: vi.fn(),
                createRewardProgramWithReward: vi.fn().mockResolvedValue({
                    id: "id", title: "Coffee Card", org_id: orgId, type: "reward_program",
                    reward: { id: "reward-id", org_id: orgId, name: "Free coffee", required_points: 6, created_at: "x", updated_at: "x" },
                    created_at: "x", updated_at: "x",
                }),
                update: vi.fn(),
                delete: vi.fn(),
            };
            const spyService = new RewardProgramsService(spyRepo);

            await spyService.createRewardProgram({
                title: "Coffee Card",
                org_id: orgId,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6 },
            });

            expect(spyRepo.createRewardProgramWithReward).toHaveBeenCalledWith({
                title: "Coffee Card",
                org_id: orgId,
                reward: { name: "Free coffee", required_points: 6 },
            });
            expect(spyRepo.createPointProgram).not.toHaveBeenCalled();
        });

        it("persists a valid reward_program via the real in-memory repository, with the reward embedded", async () => {
            const result = await service.createRewardProgram({
                title: "Coffee Card",
                org_id: orgId,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6 },
            });

            expect(result).toMatchObject({
                title: "Coffee Card",
                org_id: orgId,
                type: "reward_program",
                reward: { name: "Free coffee", required_points: 6, org_id: orgId },
            });
        });

        it("throws a ZodError for a point_program payload carrying a reward", async () => {
            await expect(
                service.createRewardProgram({
                    title: "House Points",
                    org_id: orgId,
                    type: "point_program",
                    // @ts-expect-error - point_program must not accept a reward
                    reward: { name: "x", required_points: 1 },
                }),
            ).rejects.toThrow();
        });
    });

    describe("updateRewardProgram", () => {
        it("throws NotFoundError when the reward program does not exist", async () => {
            await expect(
                service.updateRewardProgram(randomUUID(), { title: "New title" }),
            ).rejects.toThrow(/not found/i);
        });

        it("updates and returns the reward program when it exists", async () => {
            const created = await service.createRewardProgram({ title: "Old title", org_id: orgId, type: "point_program" });

            const updated = await service.updateRewardProgram(created.id, { title: "New title" });

            expect(updated).toMatchObject({ title: "New title", org_id: orgId });
        });

        it("short-circuits an empty payload instead of forwarding it to the repository", async () => {
            // RewardProgramUpdateSchema accepts {} as a valid no-op PATCH, but
            // PostgREST rejects an empty .update({}) with PGRST116. The
            // service must never forward an empty payload to repo.update -
            // verified here with a spy repo so the fake's leniency can't mask
            // a regression, mirroring the fix applied for rewards (LOY-12).
            const updateSpy = vi.fn();
            const spyRepo: IRewardProgramsRepository = {
                findById: vi.fn().mockResolvedValue({
                    id: "program-id", title: "Unchanged", org_id: orgId, type: "point_program", reward: null,
                    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                }),
                findAll: vi.fn(),
                createPointProgram: vi.fn(),
                createRewardProgramWithReward: vi.fn(),
                update: updateSpy,
                delete: vi.fn(),
            };
            const spyService = new RewardProgramsService(spyRepo);

            const result = await spyService.updateRewardProgram("program-id", {});

            expect(result).toMatchObject({ id: "program-id", title: "Unchanged" });
            expect(updateSpy).not.toHaveBeenCalled();
        });
    });

    describe("deleteRewardProgram", () => {
        it("throws NotFoundError when the reward program does not exist", async () => {
            await expect(service.deleteRewardProgram(randomUUID())).rejects.toThrow(/not found/i);
        });

        it("deletes and returns true when the reward program exists", async () => {
            const created = await service.createRewardProgram({ title: "To delete", org_id: orgId, type: "point_program" });

            expect(await service.deleteRewardProgram(created.id)).toBe(true);
        });
    });
});

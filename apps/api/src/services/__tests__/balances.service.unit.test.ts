import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";

import { BalanceService } from "@/services/balances.service";
import { InMemoryBalancesRepository } from "@/repositories/__fakes__/in-memory-balances.repository";
import type { BalanceCreate, BalanceIncrement } from "@/domain/types/balances.types";

describe("BalanceService", () => {
    let repo: InMemoryBalancesRepository;
    let service: BalanceService;

    beforeEach(() => {
        repo = new InMemoryBalancesRepository();
        service = new BalanceService(repo);
    });

    describe("getBalanceById", () => {
        it("returns null when no balance exists for the id", async () => {
            const result = await service.getBalanceById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the balance created via the repository", async () => {
            const payload: BalanceCreate = {
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 100,
            };
            const created = await service.createBalance(payload);

            const result = await service.getBalanceById(created!.id);
            expect(result).toEqual(created);
        });
    });

    describe("createBalance", () => {
        it("persists a valid balance and returns it", async () => {
            const payload: BalanceCreate = {
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 500,
            };

            const result = await service.createBalance(payload);

            expect(result?.org_id).toBe(payload.org_id);
            expect(result?.user_id).toBe(payload.user_id);
            expect(result?.balance).toBe(payload.balance);
        });

        it("throws when balance is negative", async () => {
            const payload = {
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: -1,
            } as BalanceCreate;

            await expect(service.createBalance(payload)).rejects.toThrow();
        });
    });

    describe("incrementBalance", () => {
        it("throws NotFoundError when the balance does not exist", async () => {
            await expect(
                service.incrementBalance(randomUUID(), { amount: 10 }),
            ).rejects.toThrow(/not found/i);
        });

        it("throws when amount is 0", async () => {
            const created = await service.createBalance({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.incrementBalance(created!.id, { amount: 0 } as BalanceIncrement),
            ).rejects.toThrow();
        });

        it("increments and returns the updated balance", async () => {
            const created = await service.createBalance({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const result = await service.incrementBalance(created!.id, { amount: 5 });

            expect(result?.balance).toBe(15);
        });
    });

    describe("redeemBalance", () => {
        it("throws NotFoundError when the balance does not exist", async () => {
            await expect(
                service.redeemBalance(randomUUID(), { amount: 10 }),
            ).rejects.toThrow(/not found/i);
        });

        it("redeems and returns the updated balance", async () => {
            const created = await service.createBalance({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const result = await service.redeemBalance(created!.id, { amount: 4 });

            expect(result?.balance).toBe(6);
        });

        it("throws when redeeming more than the current balance", async () => {
            const created = await service.createBalance({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.redeemBalance(created!.id, { amount: 11 }),
            ).rejects.toThrow();
        });
    });

    describe("deleteBalance", () => {
        it("throws NotFoundError when the balance does not exist", async () => {
            await expect(service.deleteBalance(randomUUID())).rejects.toThrow(/not found/i);
        });

        it("deletes and returns true when the balance exists", async () => {
            const created = await service.createBalance({
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const result = await service.deleteBalance(created!.id);

            expect(result).toBe(true);
        });
    });
});

import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";

import { BalanceService } from "@/services/balances.service";
import { InMemoryBalancesRepository } from "@/repositories/__fakes__/in-memory-balances.repository";
import { InMemoryBalanceTransactionsRepository } from "@/repositories/__fakes__/in-memory-balance-transactions.repository";
import type { BalanceCreate, BalanceIncrement } from "@/domain/types/balances.types";

describe("BalanceService", () => {
    let repo: InMemoryBalancesRepository;
    let transactionsRepo: InMemoryBalanceTransactionsRepository;
    let service: BalanceService;

    beforeEach(() => {
        repo = new InMemoryBalancesRepository();
        transactionsRepo = new InMemoryBalanceTransactionsRepository();
        service = new BalanceService(repo, transactionsRepo);
    });

    describe("getBalanceById", () => {
        it("returns null when no balance exists for the id", async () => {
            const result = await service.getBalanceById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the balance created via the repository", async () => {
            const payload: BalanceCreate = {
                reward_program_id: randomUUID(),
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
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 500,
            };

            const result = await service.createBalance(payload);

            expect(result?.reward_program_id).toBe(payload.reward_program_id);
            expect(result?.user_id).toBe(payload.user_id);
            expect(result?.balance).toBe(payload.balance);
        });

        it("throws when balance is negative", async () => {
            const payload = {
                reward_program_id: randomUUID(),
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
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.incrementBalance(created!.id, { amount: 0 } as BalanceIncrement),
            ).rejects.toThrow();
        });

        it("increments and returns the updated balance", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
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
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const result = await service.redeemBalance(created!.id, { amount: 4 });

            expect(result?.balance).toBe(6);
        });

        it("throws when redeeming more than the current balance", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.redeemBalance(created!.id, { amount: 11 }),
            ).rejects.toThrow();
        });
    });

    describe("getBalanceTransactions", () => {
        it("throws NotFoundError when the balance does not exist", async () => {
            await expect(
                service.getBalanceTransactions(randomUUID(), {}),
            ).rejects.toThrow(/not found/i);
        });

        it("defaults page_size to 25 and delegates to the transactions repository", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const result = await service.getBalanceTransactions(created!.id, {});

            expect(result).toEqual({ data: [], has_more: false, next_cursor: null });
        });

        it("throws when page_size is 0", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.getBalanceTransactions(created!.id, { page_size: 0 }),
            ).rejects.toThrow();
        });

        it("throws when page_size is greater than 100", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.getBalanceTransactions(created!.id, { page_size: 101 }),
            ).rejects.toThrow();
        });

        it("throws when starting_after is not a valid UUID", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            await expect(
                service.getBalanceTransactions(created!.id, { starting_after: "not-a-uuid" }),
            ).rejects.toThrow();
        });

        it("pages through transactions seeded on the fake repository, newest first", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const seeded = [1, 2, 3].map((amount) =>
                transactionsRepo.seedTransaction({
                    balance_id: created!.id,
                    type: "credit",
                    amount,
                }),
            );

            const firstPage = await service.getBalanceTransactions(created!.id, { page_size: 2 });
            expect(firstPage.data.map((t) => t.id)).toEqual([seeded[2]!.id, seeded[1]!.id]);
            expect(firstPage.has_more).toBe(true);
            expect(firstPage.next_cursor).toBe(seeded[1]!.id);

            const secondPage = await service.getBalanceTransactions(created!.id, {
                page_size: 2,
                starting_after: firstPage.next_cursor!,
            });
            expect(secondPage.data.map((t) => t.id)).toEqual([seeded[0]!.id]);
            expect(secondPage.has_more).toBe(false);
            expect(secondPage.next_cursor).toBeNull();
        });
    });

    describe("deleteBalance", () => {
        it("throws NotFoundError when the balance does not exist", async () => {
            await expect(service.deleteBalance(randomUUID())).rejects.toThrow(/not found/i);
        });

        it("deletes and returns true when the balance exists", async () => {
            const created = await service.createBalance({
                reward_program_id: randomUUID(),
                user_id: randomUUID(),
                balance: 10,
            });

            const result = await service.deleteBalance(created!.id);

            expect(result).toBe(true);
        });
    });
});

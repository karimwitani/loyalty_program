import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";

import { BalanceService } from "@/services/balances.service";
import { InMemoryBalancesRepository } from "@/repositories/__fakes__/in-memory-balances.repository";
import type { BalanceCreate } from "@/domain/types/balances.types";

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
});

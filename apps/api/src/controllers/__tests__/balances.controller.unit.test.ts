import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import type { Request as ExRequest } from "express";

import { BalancesController } from "@/controllers/balances.controller";
import { BalanceService } from "@/services/balances.service";
import type { Balance, BalanceCreate } from "@/domain/types/balances.types";

function makeBalance(overrides: Partial<Balance> = {}): Balance {
    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        org_id: randomUUID(),
        user_id: randomUUID(),
        balance: 100,
        created_at: now,
        updated_at: now,
        ...overrides,
    };
}

function stubService(overrides: Partial<BalanceService> = {}): BalanceService {
    return {
        getBalanceById: vi.fn(),
        createBalance: vi.fn(),
        ...overrides,
    } as unknown as BalanceService;
}

const req = {} as ExRequest;

describe("BalancesController", () => {
    describe("getBalanceById", () => {
        it("sets 404 and returns null when the service finds nothing", async () => {
            const service = stubService({
                getBalanceById: vi.fn().mockResolvedValue(null),
            });
            const controller = new BalancesController(service);

            const result = await controller.getBalanceById(randomUUID(), req);

            expect(result).toBeNull();
            expect(controller.getStatus()).toBe(404);
        });

        it("returns the balance found by the service", async () => {
            const balance = makeBalance();
            const service = stubService({
                getBalanceById: vi.fn().mockResolvedValue(balance),
            });
            const controller = new BalancesController(service);

            const result = await controller.getBalanceById(balance.id, req);

            expect(result).toEqual(balance);
        });
    });

    describe("createBalance", () => {
        it("rejects a payload with a negative balance before calling the service", async () => {
            const createBalance = vi.fn();
            const service = stubService({ createBalance });
            const controller = new BalancesController(service);

            const payload = {
                org_id: randomUUID(),
                user_id: randomUUID(),
                balance: -5,
            } as BalanceCreate;

            await expect(controller.createBalance(payload, req)).rejects.toThrow();
            expect(createBalance).not.toHaveBeenCalled();
        });

        it("delegates a valid payload to the service", async () => {
            const balance = makeBalance();
            const createBalance = vi.fn().mockResolvedValue(balance);
            const service = stubService({ createBalance });
            const controller = new BalancesController(service);

            const payload: BalanceCreate = {
                org_id: balance.org_id,
                user_id: balance.user_id,
                balance: balance.balance,
            };

            const result = await controller.createBalance(payload, req);

            expect(createBalance).toHaveBeenCalledWith(payload);
            expect(result).toEqual(balance);
        });
    });
});

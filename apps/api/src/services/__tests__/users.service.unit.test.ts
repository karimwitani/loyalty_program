import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";

import { UsersService } from "@/services/users.service";
import { InMemoryUsersRepository } from "@/repositories/__fakes__/in-memory-users.repository";
import type { UserCreate } from "@/domain/types/users.types";

function makeUserPayload(overrides: Partial<UserCreate> = {}): UserCreate {
    return {
        id: randomUUID(),
        first_name: "Ada",
        last_name: "Lovelace",
        email: `ada-${randomUUID()}@test.com`,
        ...overrides,
    };
}

describe("UsersService", () => {
    let repo: InMemoryUsersRepository;
    let service: UsersService;

    beforeEach(() => {
        repo = new InMemoryUsersRepository();
        service = new UsersService(repo);
    });

    describe("getUserById", () => {
        it("returns null when no user exists for the id", async () => {
            const result = await service.getUserById(randomUUID());
            expect(result).toBeNull();
        });

        it("returns the user created via the repository", async () => {
            const payload = makeUserPayload();
            const created = await service.createUser(payload);

            const result = await service.getUserById(created!.id);

            expect(result).toEqual(created);
        });
    });

    describe("createUser", () => {
        it("persists a valid user and returns it", async () => {
            const payload = makeUserPayload();

            const result = await service.createUser(payload);

            expect(result?.id).toBe(payload.id);
            expect(result?.first_name).toBe(payload.first_name);
            expect(result?.email).toBe(payload.email);
        });

        it("throws when a user with the same id already exists", async () => {
            const payload = makeUserPayload();
            await service.createUser(payload);

            await expect(
                service.createUser({ ...payload, email: `other-${randomUUID()}@test.com` }),
            ).rejects.toThrow();
        });
    });

    describe("updateUser", () => {
        it("throws NotFoundError when the user does not exist", async () => {
            await expect(
                service.updateUser(randomUUID(), { first_name: "New name" }),
            ).rejects.toThrow(/not found/i);
        });

        it("updates and returns the user when it exists", async () => {
            const created = await service.createUser(makeUserPayload());

            const updated = await service.updateUser(created!.id, { first_name: "Augusta" });

            expect(updated?.first_name).toBe("Augusta");
        });
    });

    describe("deleteUser", () => {
        it("throws NotFoundError when the user does not exist", async () => {
            await expect(service.deleteUser(randomUUID())).rejects.toThrow(/not found/i);
        });

        it("deletes and returns true when the user exists", async () => {
            const created = await service.createUser(makeUserPayload());

            const result = await service.deleteUser(created!.id);

            expect(result).toBe(true);
        });
    });
});

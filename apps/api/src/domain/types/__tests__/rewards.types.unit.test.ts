import { describe, expect, test } from "vitest"

import { RewardSchema, RewardCreateSchema, RewardUpdateSchema } from "@/domain/types/rewards.types"

const REWARD = {
    id: "00000000-0000-0000-0000-000000000000",
    org_id: "00000000-0000-0000-0000-000000000000",
    name: "Free coffee",
    required_points: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

describe("RewardSchema", () => {
    test("accepts a valid row", () => {
        expect(RewardSchema.safeParse(REWARD).success).toBe(true);
    });

    test("fails to parse on invalid UUID org_id field", () => {
        expect(RewardSchema.safeParse({ ...REWARD, org_id: "not-a-uuid" }).success).toBe(false);
    });

    test("fails to parse on an unknown field", () => {
        expect(RewardSchema.safeParse({ ...REWARD, extra_field: "nope" }).success).toBe(false);
    });
})

describe("RewardCreateSchema", () => {
    const VALID = { org_id: REWARD.org_id, name: "Free coffee", required_points: 6 };

    test("requires org_id", () => {
        const { org_id, ...rest } = VALID;
        expect(RewardCreateSchema.safeParse(rest).success).toBe(false);
    });

    test("validates org_id as a UUID", () => {
        expect(RewardCreateSchema.safeParse({ ...VALID, org_id: "not-a-uuid" }).success).toBe(false);
    });

    test("rejects an empty name", () => {
        expect(RewardCreateSchema.safeParse({ ...VALID, name: "" }).success).toBe(false);
    });

    test.each([0, -1, 2147483648])("rejects required_points of %i", (required_points) => {
        expect(RewardCreateSchema.safeParse({ ...VALID, required_points }).success).toBe(false);
    });

    test("accepts a valid payload", () => {
        expect(RewardCreateSchema.safeParse(VALID).success).toBe(true);
    });
})

describe("RewardUpdateSchema", () => {
    test("rejects a payload attempting to change org_id", () => {
        expect(RewardUpdateSchema.safeParse({ org_id: REWARD.org_id }).success).toBe(false);
    });

    test("rejects an unknown field", () => {
        expect(RewardUpdateSchema.safeParse({ unknown_field: "nope" }).success).toBe(false);
    });

    test("rejects required_points of 0", () => {
        expect(RewardUpdateSchema.safeParse({ required_points: 0 }).success).toBe(false);
    });

    test("accepts an empty payload since all remaining fields are optional", () => {
        // A no-op PATCH is valid at the schema level. RewardsService
        // short-circuits before this ever reaches the repository, since
        // PostgREST rejects an empty .update({}) with PGRST116 - see
        // rewards.service.unit.test.ts and the empty-body component/e2e
        // cases for the behavior this enables end-to-end.
        expect(RewardUpdateSchema.safeParse({}).success).toBe(true);
    });
})

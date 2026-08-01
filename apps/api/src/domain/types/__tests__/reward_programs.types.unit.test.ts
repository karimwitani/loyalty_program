import { describe, expect, test } from "vitest"

import {
    RewardProgramSchema,
    RewardProgramCreateSchema,
    RewardProgramUpdateSchema,
} from "@/domain/types/reward_programs.types"

const REWARD = {
    id: "00000000-0000-0000-0000-000000000000",
    org_id: "00000000-0000-0000-0000-000000000000",
    name: "Free coffee",
    required_points: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

const REWARD_PROGRAM = {
    id: "00000000-0000-0000-0000-000000000000",
    org_id: "00000000-0000-0000-0000-000000000000",
    title: "Coffee Card",
    type: "reward_program" as const,
    reward: REWARD,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

describe("RewardProgramSchema", () => {
    test("accepts a valid reward_program row with an embedded reward", () => {
        expect(RewardProgramSchema.safeParse(REWARD_PROGRAM).success).toBe(true);
    });

    test("accepts a valid point_program row with reward: null", () => {
        expect(
            RewardProgramSchema.safeParse({ ...REWARD_PROGRAM, type: "point_program", reward: null }).success,
        ).toBe(true);
    });

    test("rejects an unknown type value", () => {
        expect(RewardProgramSchema.safeParse({ ...REWARD_PROGRAM, type: "other" }).success).toBe(false);
    });

    test("rejects an unknown field", () => {
        expect(RewardProgramSchema.safeParse({ ...REWARD_PROGRAM, extra_field: "nope" }).success).toBe(false);
    });
})

describe("RewardProgramCreateSchema", () => {
    const POINT_PROGRAM = { title: "House Points", org_id: REWARD.org_id, type: "point_program" as const };
    const REWARD_PROGRAM_CREATE = {
        title: "Coffee Card",
        org_id: REWARD.org_id,
        type: "reward_program" as const,
        reward: { name: "Free coffee", required_points: 6 },
    };

    test("accepts a valid point_program payload", () => {
        expect(RewardProgramCreateSchema.safeParse(POINT_PROGRAM).success).toBe(true);
    });

    test("accepts a valid reward_program payload with a nested reward", () => {
        expect(RewardProgramCreateSchema.safeParse(REWARD_PROGRAM_CREATE).success).toBe(true);
    });

    test("rejects point_program with a reward key - invalid states must be unrepresentable", () => {
        expect(
            RewardProgramCreateSchema.safeParse({ ...POINT_PROGRAM, reward: { name: "x", required_points: 1 } })
                .success,
        ).toBe(false);
    });

    test("rejects reward_program without a reward", () => {
        const { reward, ...withoutReward } = REWARD_PROGRAM_CREATE;
        expect(RewardProgramCreateSchema.safeParse(withoutReward).success).toBe(false);
    });

    test("rejects reward.org_id as an unknown field - the reward always inherits the program's org_id", () => {
        expect(
            RewardProgramCreateSchema.safeParse({
                ...REWARD_PROGRAM_CREATE,
                reward: { ...REWARD_PROGRAM_CREATE.reward, org_id: REWARD.org_id },
            }).success,
        ).toBe(false);
    });

    test("rejects an unrecognized type", () => {
        expect(RewardProgramCreateSchema.safeParse({ ...POINT_PROGRAM, type: "other" }).success).toBe(false);
    });

    test("rejects required_points of 0 on the nested reward", () => {
        expect(
            RewardProgramCreateSchema.safeParse({
                ...REWARD_PROGRAM_CREATE,
                reward: { name: "x", required_points: 0 },
            }).success,
        ).toBe(false);
    });

    // Whitespace-only titles used to pass here but fail
    // fn_create_reward_program_with_reward's `length(trim(p_title)) = 0`
    // guard in Postgres - 422 for reward_program, but silently stored as
    // literal "   " for point_program (no DB-level guard on that column).
    // .trim() before .min(1) on RewardProgramCoreField.title closes that gap.
    test("rejects a whitespace-only title", () => {
        expect(RewardProgramCreateSchema.safeParse({ ...POINT_PROGRAM, title: "   " }).success).toBe(false);
        expect(RewardProgramCreateSchema.safeParse({ ...REWARD_PROGRAM_CREATE, title: "   " }).success).toBe(false);
    });

    test("trims incidental leading/trailing whitespace from a non-empty title", () => {
        const parsed = RewardProgramCreateSchema.safeParse({ ...POINT_PROGRAM, title: "  House Points  " });
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.title).toBe("House Points");
    });
})

describe("RewardProgramUpdateSchema", () => {
    test("accepts a title-only payload", () => {
        expect(RewardProgramUpdateSchema.safeParse({ title: "New title" }).success).toBe(true);
    });

    test("rejects a payload attempting to change type", () => {
        expect(RewardProgramUpdateSchema.safeParse({ type: "point_program" }).success).toBe(false);
    });

    test("rejects a payload attempting to change org_id", () => {
        expect(RewardProgramUpdateSchema.safeParse({ org_id: REWARD.org_id }).success).toBe(false);
    });

    test("rejects a payload attempting to change reward", () => {
        expect(RewardProgramUpdateSchema.safeParse({ reward: REWARD }).success).toBe(false);
    });

    test("rejects an empty title", () => {
        expect(RewardProgramUpdateSchema.safeParse({ title: "" }).success).toBe(false);
    });

    test("accepts an empty payload since title is optional", () => {
        // A no-op PATCH is valid at the schema level. RewardProgramsService
        // short-circuits before this ever reaches the repository, since
        // PostgREST rejects an empty .update({}) with PGRST116 - see the
        // same fix applied for RewardsService.updateReward (LOY-12).
        expect(RewardProgramUpdateSchema.safeParse({}).success).toBe(true);
    });
})

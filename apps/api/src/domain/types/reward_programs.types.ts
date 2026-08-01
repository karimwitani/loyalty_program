import { z } from "zod"

import { RewardSchema, RewardCreateSchema } from "@/domain/types/rewards.types"


////////////////////
// Reward programs
////////////////////

// Core shared fields
const RewardProgramCoreField = z.object({
    // .trim() before .min(1) so a whitespace-only title ("   ") is rejected
    // here the same way fn_create_reward_program_with_reward's own
    // `length(trim(p_title)) = 0` guard rejects it in Postgres - without the
    // trim, zod let "   " through while the RPC raised on it, so the same
    // payload was 422 through one path and (for point_program, which has no
    // DB-level guard on title) silently stored as literal "   " on the other.
    title: z.string().trim().min(1, "title must not be empty"),
    org_id: z.uuid("org_id must be a valid UUID"),
})

export const RewardProgramSchema = RewardProgramCoreField.extend({
    id: z.uuid("id must be a valid UUID"),
    type: z.enum(["point_program", "reward_program"]),
    // Reads always embed the full reward, never the raw reward_id - null for
    // point_program, populated for reward_program.
    reward: RewardSchema.nullable(),
    created_at: z.iso.datetime({
        offset: true,
        message: "created_at must be a valid ISO timestamp"
    }),
    updated_at: z.iso.datetime({
        offset: true,
        message: "updated_at must be a valid ISO timestamp"
    })
})
.strict();

// For POST requests. A discriminated union on `type` makes the invalid
// states unrepresentable: point_program has no `reward` key at all (and
// .strict() rejects it as unknown), reward_program requires one. The nested
// reward payload omits org_id - it always inherits the program's org_id, see
// fn_create_reward_program_with_reward.
export const RewardProgramCreateSchema = z.discriminatedUnion("type", [
    RewardProgramCoreField.extend({
        type: z.literal("point_program"),
    }).strict(),
    RewardProgramCoreField.extend({
        type: z.literal("reward_program"),
        reward: RewardCreateSchema.omit({ org_id: true }),
    }).strict(),
])

// For PATCH requests. Only `title` is patchable:
// - `type` can't change: converting between point_program/reward_program
//   means creating or destroying a bound reward and invalidating every
//   balance on the program - that's a delete-and-recreate, not a patch.
// - `org_id` can't move a program between organisations.
// - `reward` isn't accepted here - edit the bound reward's name/threshold via
//   PATCH /rewards/{id} instead.
export const RewardProgramUpdateSchema = z.object({
    title: RewardProgramCoreField.shape.title,
})
.partial()
.strict()


//////////////////
// Type inference
//////////////////
export type RewardProgram = z.infer<typeof RewardProgramSchema>;
export type RewardProgramCreate = z.infer<typeof RewardProgramCreateSchema>;
export type RewardProgramUpdate = z.infer<typeof RewardProgramUpdateSchema>;

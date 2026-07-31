import { z } from "zod"


////////////////
// Rewards
////////////////

// Core shared fields
const RewardCoreField = z.object({
    org_id: z.uuid("org_id must be a valid UUID"),
    name: z.string().min(1, "name must not be empty"),
    required_points: z.int("required_points must be a valid integer")
        .min(1, "required_points must be greater than 0")
        .max(2147483647, "required_points cannot be greater than 2,147,483,647 (int4 in underlying DB table)")
})

export const RewardSchema = RewardCoreField.extend({
    id: z.uuid("id must be a valid UUID"),
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


// For POST requests
export const RewardCreateSchema = RewardCoreField.strict()

// For PATCH requests
export const RewardUpdateSchema = RewardCoreField.omit({
    "org_id": true // a reward can't be moved between organisations
})
.partial() // makes any of remaining fields optional
.strict() // disallows any unknows fields


//////////////////
// Type inference
//////////////////
export type Reward = z.infer<typeof RewardSchema>;
export type RewardCreate = z.infer<typeof RewardCreateSchema>;
export type RewardUpdate = z.infer<typeof RewardUpdateSchema>;

import { z } from "zod"


////////////////
// Balances
////////////////

// Core shared fields
const BalanceCoreField = z.object({
    org_id: z.uuid("org_id must be a valid UUID"),
    user_id: z.uuid("user_id must be a valid UUID"),
    balance: z.int("balance must be a valid integer")
        .min(0, "balance cannot be negative")
        .max(2147483647, "balance cannot be greater than 2,147,483,647 (int4 in underlying DB table)")

})

export const BalanceSchema = BalanceCoreField.extend({
    id: z.uuid("id must be a valid UUID"),
    created_at: z.iso.datetime({
        offset: true,
        message:"created_at must be a valid ISO timestamp"
    }),
    updated_at: z.iso.datetime({ 
        offset: true, 
        message: "updated_at must be a valid ISO timestamp" 
    })
})
.strict();


// For POST requests
export const BalanceCreateSchema = BalanceCoreField.strict()

// For POST /balances/{id}/increment requests
export const BalanceIncrementSchema = z.object({
    amount: z.int("balance must be a valid integer")
        .min(0, "balance cannot be negative")
        .max(2147483647, "balance cannot be greater than 2,147,483,647 (int4 in underlying DB table)")

})

// For PATCH requests
export const BalanceUpdateSchema = BalanceCoreField.omit({
    "org_id": true, 
    "user_id": true
}) // we should not let PATCH update either the user_id or the org_id (not public facing APIs anws)
.partial() // makes any of remaining fields optional
.strict() // disallows any unknows fields


//////////////////
// Type inference
//////////////////
export type Balance = z.infer<typeof BalanceSchema>;
export type BalanceCreate = z.infer<typeof BalanceCreateSchema>;
export type BalanceIncrement = z.infer<typeof BalanceIncrementSchema>;
export type BalanceUpdate = z.infer<typeof BalanceUpdateSchema>;
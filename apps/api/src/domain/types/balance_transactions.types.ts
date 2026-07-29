import { z } from "zod"

////////////////
// BalanceTransactions
////////////////


// Core shared fields
const BalanceTransactionCoreField = z.object({
    balance_id: z.uuid("balance_id must be a valid UUID"),
    type: z.enum(["debit", "credit"]),
    amount: z.int("balance must be a valid integer")
        .min(0, "balance cannot be negative")
        .max(2147483647, "balance cannot be greater than 2,147,483,647 (int4 in underlying DB table)")
})

export const BalanceTransactionSchema = BalanceTransactionCoreField.extend({
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
export const BalanceTransactionCreateSchema = BalanceTransactionCoreField.strict()

//////////////////
// Type inference
//////////////////
export type BalanceTransaction = z.infer<typeof BalanceTransactionSchema>;
export type BalanceTransactionCreate = z.infer<typeof BalanceTransactionCreateSchema>;
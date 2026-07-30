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

// For GET /balances/{id}/transactions query params
// `coerce` is required because query string values always arrive as strings
export const BalanceTransactionListQuerySchema = z.object({
    page_size: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.uuid("starting_after must be a valid UUID").optional(),
})
.strict();

// For GET /balances/{id}/transactions response body
export const BalanceTransactionPageSchema = z.object({
    data: z.array(BalanceTransactionSchema),
    has_more: z.boolean(),
    next_cursor: z.uuid().nullable(),
})
.strict();

//////////////////
// Type inference
//////////////////
export type BalanceTransaction = z.infer<typeof BalanceTransactionSchema>;
export type BalanceTransactionCreate = z.infer<typeof BalanceTransactionCreateSchema>;
// Pre-parse shape (page_size optional, defaulting happens inside .parse()) -
// what controllers/services accept before validating. `BalanceTransactionListQuery`
// below is the post-parse shape (page_size always present) that the repository consumes.
export type BalanceTransactionListQueryInput = z.input<typeof BalanceTransactionListQuerySchema>;
export type BalanceTransactionListQuery = z.infer<typeof BalanceTransactionListQuerySchema>;
export type BalanceTransactionPage = z.infer<typeof BalanceTransactionPageSchema>;
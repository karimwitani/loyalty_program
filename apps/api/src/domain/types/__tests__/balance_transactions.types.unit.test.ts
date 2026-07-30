import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest"

import {
    BalanceTransactionSchema,
    BalanceTransactionListQuerySchema,
    BalanceTransactionPageSchema,
} from "@/domain/types/balance_transactions.types"

describe("BalanceTransactionSchema", ()=>{
    let BALANCE_TRANSACTION: any;

    beforeEach(()=>{
        BALANCE_TRANSACTION = {
            id: "00000000-0000-0000-0000-000000000000",
            balance_id: "00000000-0000-0000-0000-000000000000",
            amount: 100,
            type: "credit",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    })

    it("parses a valid row", ()=>{
        expect(() => BalanceTransactionSchema.parse(BALANCE_TRANSACTION)).not.toThrow();
    })

    it("fails to parse on invalid UUID for id field", ()=>{
        BALANCE_TRANSACTION.id = "not-a-uuid";
        expect(() => BalanceTransactionSchema.parse(BALANCE_TRANSACTION)).toThrow();
    });

    it("fails to parse on invalid UUID balance id field", ()=>{
        BALANCE_TRANSACTION.balance_id = "not-a-uuid";
        expect(() => BalanceTransactionSchema.parse(BALANCE_TRANSACTION)).toThrow();
    });

    it("fails to parse on negative amount", ()=>{
        BALANCE_TRANSACTION.amount = -1;
        expect(() => BalanceTransactionSchema.parse(BALANCE_TRANSACTION)).toThrow();
    });

    it("fails to parse on amount grater than int4 max", ()=>{
        BALANCE_TRANSACTION.amount = 2147483648;
        expect(() => BalanceTransactionSchema.parse(BALANCE_TRANSACTION)).toThrow();
    });
})

describe("BalanceTransactionListQuerySchema", () => {
    it("defaults page_size to 25 when omitted", () => {
        const result = BalanceTransactionListQuerySchema.parse({});
        expect(result.page_size).toBe(25);
        expect(result.starting_after).toBeUndefined();
    });

    it("coerces a query-string page_size into a number", () => {
        const result = BalanceTransactionListQuerySchema.parse({ page_size: "10" });
        expect(result.page_size).toBe(10);
    });

    it("rejects page_size below the minimum of 1", () => {
        expect(() => BalanceTransactionListQuerySchema.parse({ page_size: 0 })).toThrow();
    });

    it("rejects page_size above the maximum of 100", () => {
        expect(() => BalanceTransactionListQuerySchema.parse({ page_size: 101 })).toThrow();
    });

    it("accepts a valid starting_after UUID", () => {
        const result = BalanceTransactionListQuerySchema.parse({
            starting_after: "00000000-0000-0000-0000-000000000000",
        });
        expect(result.starting_after).toBe("00000000-0000-0000-0000-000000000000");
    });

    it("rejects a starting_after that is not a valid UUID", () => {
        expect(() =>
            BalanceTransactionListQuerySchema.parse({ starting_after: "not-a-uuid" }),
        ).toThrow();
    });

    it("rejects unknown query params", () => {
        expect(() =>
            BalanceTransactionListQuerySchema.parse({ page_size: 10, foo: "bar" }),
        ).toThrow();
    });
});

describe("BalanceTransactionPageSchema", () => {
    it("parses a page with data, has_more, and next_cursor", () => {
        const page = {
            data: [
                {
                    id: "00000000-0000-0000-0000-000000000000",
                    balance_id: "00000000-0000-0000-0000-000000000000",
                    amount: 100,
                    type: "credit",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ],
            has_more: true,
            next_cursor: "00000000-0000-0000-0000-000000000000",
        };

        expect(() => BalanceTransactionPageSchema.parse(page)).not.toThrow();
    });

    it("allows an empty page with a null next_cursor", () => {
        const page = { data: [], has_more: false, next_cursor: null };
        expect(() => BalanceTransactionPageSchema.parse(page)).not.toThrow();
    });

    it("rejects a next_cursor that is not a valid UUID or null", () => {
        const page = { data: [], has_more: false, next_cursor: "not-a-uuid" };
        expect(() => BalanceTransactionPageSchema.parse(page)).toThrow();
    });
});

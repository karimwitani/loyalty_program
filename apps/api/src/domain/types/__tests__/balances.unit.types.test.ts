import { 
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    test
} from "vitest"

import { BalanceSchema, BalanceCreateSchema, BalanceUpdateSchema } from "@/domain/types/balances.types"

describe("BalanceSchema", ()=>{
    let BALANCE_TRANSACTION: any;

    beforeEach(()=>{
        BALANCE_TRANSACTION = {
            id: "00000000-0000-0000-0000-000000000000",
            user_id: "00000000-0000-0000-0000-000000000000",
            reward_program_id: "00000000-0000-0000-0000-000000000000",
            balance: 100,
            type: "credit",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    })

    test.todo("fails to parse on invalid UUID for id field", ()=>{});

    test("fails to parse on invalid UUID reward_program_id field", ()=>{
        const result = BalanceSchema.safeParse({ ...BALANCE_TRANSACTION, reward_program_id: "not-a-uuid" });
        expect(result.success).toBe(false);
    });

    test.todo("fails to parse on invalid UUID user_id field", ()=>{});

    test.todo("fails to parse on negative balance", ()=>{});

    test.todo("fails to parse on balance greater than int4 max", ()=>{});
})

describe("BalanceCreateSchema", ()=>{
    test("requires reward_program_id", ()=>{
        const result = BalanceCreateSchema.safeParse({
            user_id: "00000000-0000-0000-0000-000000000000",
            balance: 10,
        });
        expect(result.success).toBe(false);
    });

    test("validates reward_program_id as a UUID", ()=>{
        const result = BalanceCreateSchema.safeParse({
            reward_program_id: "not-a-uuid",
            user_id: "00000000-0000-0000-0000-000000000000",
            balance: 10,
        });
        expect(result.success).toBe(false);
    });

    test("rejects a payload carrying org_id instead of reward_program_id", ()=>{
        const result = BalanceCreateSchema.safeParse({
            org_id: "00000000-0000-0000-0000-000000000000",
            user_id: "00000000-0000-0000-0000-000000000000",
            balance: 10,
        });
        expect(result.success).toBe(false);
    });

    test("accepts a valid payload", ()=>{
        const result = BalanceCreateSchema.safeParse({
            reward_program_id: "00000000-0000-0000-0000-000000000000",
            user_id: "00000000-0000-0000-0000-000000000000",
            balance: 10,
        });
        expect(result.success).toBe(true);
    });
})

describe("BalanceUpdateSchema", ()=>{
    test("rejects a payload attempting to change reward_program_id", ()=>{
        const result = BalanceUpdateSchema.safeParse({
            reward_program_id: "00000000-0000-0000-0000-000000000000",
        });
        expect(result.success).toBe(false);
    });

    test("rejects a payload attempting to change user_id", ()=>{
        const result = BalanceUpdateSchema.safeParse({
            user_id: "00000000-0000-0000-0000-000000000000",
        });
        expect(result.success).toBe(false);
    });

    test("accepts an empty payload since all remaining fields are optional", ()=>{
        const result = BalanceUpdateSchema.safeParse({});
        expect(result.success).toBe(true);
    });
})
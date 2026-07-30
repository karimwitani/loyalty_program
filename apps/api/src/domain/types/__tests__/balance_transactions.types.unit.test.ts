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

import { BalanceTransactionSchema } from "@/domain/types/balance_transactions.types"

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

    test.todo("fails to parse on invalid UUID for id field", ()=>{});
    
    test.todo("fails to parse on invalid UUID balance id field", ()=>{});
    
    test.todo("fails to parse on negative amount", ()=>{});
    
    test.todo("fails to parse on amount grater than int4 max", ()=>{});
})
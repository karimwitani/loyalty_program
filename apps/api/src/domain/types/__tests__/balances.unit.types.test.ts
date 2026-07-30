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

import { BalanceSchema } from "@/domain/types/balances.types"

describe("BalanceSchema", ()=>{
    let BALANCE_TRANSACTION: any;

    beforeEach(()=>{
        BALANCE_TRANSACTION = {
            id: "00000000-0000-0000-0000-000000000000",
            user_id: "00000000-0000-0000-0000-000000000000",
            org_id: "00000000-0000-0000-0000-000000000000",
            balance: 100,
            type: "credit",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()            
        }
    })

    test.todo("fails to parse on invalid UUID for id field", ()=>{});
    
    test.todo("fails to parse on invalid UUID org_id field", ()=>{});
    
    test.todo("fails to parse on invalid UUID user_id field", ()=>{});
    
    test.todo("fails to parse on negative balance", ()=>{});
    
    test.todo("fails to parse on balance greater than int4 max", ()=>{});
})
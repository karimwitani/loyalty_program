import {
    Balance,
    BalanceCreate,
    BalanceUpdate,
    BalanceSchema,
    BalanceCreateSchema
} from "@/domain/types/balances.types";
import { supabase } from "@/lib/supabase-client";
import { toPostgrestError } from "@/utils/postgres-error-handler";

const BALANCES_SELECT_QUERY = `
    id,
    org_id,
    user_id,
    balance,
    created_at,
    updated_at
`


export interface IBalancesRepository {
    findById: (id: string) => Promise<Balance | null>;
    findByUserId: (id: string) => Promise<Balance[]>;
    findByOrgId: (id: string) => Promise<Balance[]>;
    create: (data: BalanceCreate) => Promise<Balance | null>;
    update: (id: string, data: BalanceUpdate) => Promise<Balance | null>;
    delete: (id: string) => Promise<boolean>;
}

export class BalancesRepository implements IBalancesRepository {
    public async findById(id: string): Promise<Balance | null>{
        const { data, error} = await supabase.from("balances")
            .select(BALANCES_SELECT_QUERY)
            .eq("id", id)
            .maybeSingle()

        if (error) {
            throw(error)
        }
        if (!data) {
            return null;
        }

        return BalanceSchema.parse(data);
    };
    
    public async findByUserId(id: string):Promise<Balance[]>{
        return [];
    };

    public async findByOrgId(id: string):Promise<Balance[]>{
        return [];
    };
    
    public async create(data: BalanceCreate): Promise<Balance | null>{
        console.log("CreditScoreRepository.create", data)
        // TODO: AUTZ checks
        const { data: row, error } = await supabase
            .from("balances")
            .insert(data)
            .select(BALANCES_SELECT_QUERY)
            .single();
        
        if (error){
            const err = toPostgrestError(error)
            throw err;
        }

        if ( !row) {
            throw new Error("Failed to create lease");
        }
        return BalanceSchema.parse(row);
    };
    
    public async update(id: string, data: BalanceUpdate): Promise<Balance | null>{
        return null;
    };
    
    public async delete(id: string): Promise<boolean>{
        return false;
    };
}
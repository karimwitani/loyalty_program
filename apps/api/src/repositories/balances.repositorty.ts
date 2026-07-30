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
    reward_program_id,
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
    increment: (id: string, amount: number) => Promise<Balance | null>;
    redeem: (id: string, amount: number) => Promise<Balance | null>;
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

    public async increment(id: string,  amount: number): Promise<Balance | null>{
        const { data: rpc_data, error: rpc_error} = await supabase.rpc('fn_increment_balance',{"p_amount": amount, "p_balance_id": id });
        if (rpc_error) {
            console.log(`Err type from repo: ${typeof rpc_error} `)
            console.error(`Error incrementing balance ${id}. Err: ${rpc_error.message}`)
            throw(rpc_error)
        }
        if (!rpc_data) {
            return null;
        }

        // fn_increment_balance intentionally returns just the transaction id,
        // not the updated row: `RETURNS TABLE` of arbitrary columns comes back
        // typed as `any`/JSON in the generated Supabase schema, so we do a
        // real select here to get a properly typed Balance instead.
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

    public async redeem(id: string, amount: number): Promise<Balance | null>{
        const { data: rpc_data, error: rpc_error} = await supabase.rpc('fn_decrement_balance',{"p_amount": amount, "p_balance_id": id });
        if (rpc_error) {
            console.log(`Err type from repo: ${typeof rpc_error} `)
            console.error(`Error incrementing balance ${id}. Err: ${rpc_error.message}`)
            throw(rpc_error)
        }
        if (!rpc_data) {
            return null;
        }

        // fn_decrement_balance intentionally returns just the transaction id,
        // not the updated row: `RETURNS TABLE` of arbitrary columns comes back
        // typed as `any`/JSON in the generated Supabase schema, so we do a
        // real select here to get a properly typed Balance instead.
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
        // Stub — no endpoint calls this yet. balances no longer carry org_id
        // directly (see LOY-11); org-scoped filtering now requires a join
        // through reward_programs (balances.reward_program_id ->
        // reward_programs.id -> reward_programs.org_id). Implementing that
        // join is out of scope for LOY-11.
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
        const { error } = await supabase
            .from("balances")
            .delete()
            .eq("id", id)
        
        if (error){
            throw error;
        }

        return true;
    };
}
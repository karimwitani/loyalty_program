import { randomUUID } from "crypto";
import { PostgrestError } from "@supabase/supabase-js";
import {
    Balance,
    BalanceCreate,
    BalanceUpdate,
    BalanceSchema
} from "@/domain/types/balances.types";
import { IBalancesRepository } from "@/repositories/balances.repositorty";

const INT4_MAX = 2147483647;

export class InMemoryBalancesRepository implements IBalancesRepository {
    private rows: Map<string, Balance> = new Map();

    public async findById(id: string): Promise<Balance | null> {
        return this.rows.get(id) ?? null;
    }

    public async increment(id: string, amount: number): Promise<Balance | null> {
        const existing = this.rows.get(id);
        if (!existing) {
            return null;
        }

        const balance = existing.balance + amount;
        if (balance > INT4_MAX) {
            // Mirrors the error Postgres raises when `balance + p_amount`
            // overflows the balances.balance int4 column.
            throw new PostgrestError({
                message: "integer out of range",
                details: `${existing.balance} + ${amount} exceeds the int4 column limit.`,
                hint: "",
                code: "22003",
            });
        }

        const updated = BalanceSchema.parse({
            ...existing,
            balance,
            updated_at: new Date().toISOString(),
        });
        this.rows.set(id, updated);
        return updated;
    }

    public async redeem(id: string, amount: number): Promise<Balance | null> {
        const existing = this.rows.get(id);
        if (!existing) {
            return null;
        }

        const balance = existing.balance - amount;
        if (balance < 0) {
            // Mirrors the check_balance_positive constraint violation
            // Postgres raises when `balance - p_amount` would go negative.
            throw new PostgrestError({
                message: 'new row for relation "balances" violates check constraint "check_balance_positive"',
                details: `Failing row would contain balance ${balance}.`,
                hint: "",
                code: "23514",
            });
        }

        const updated = BalanceSchema.parse({
            ...existing,
            balance,
            updated_at: new Date().toISOString(),
        });
        this.rows.set(id, updated);
        return updated;
    }

    public async findByUserId(id: string): Promise<Balance[]> {
        return [...this.rows.values()].filter((row) => row.user_id === id);
    }

    public async findByOrgId(id: string): Promise<Balance[]> {
        // Stub — mirrors BalancesRepository.findByOrgId. balances no longer
        // carry org_id directly (see LOY-11); org-scoped filtering now
        // requires a join through reward_programs, which is out of scope.
        return [];
    }

    public async create(data: BalanceCreate): Promise<Balance | null> {
        const duplicate = [...this.rows.values()].find(
            (row) => row.reward_program_id === data.reward_program_id && row.user_id === data.user_id
        );
        if (duplicate) {
            // Mirrors the Postgres unique violation Postgres raises for
            // uq_balances_reward_program_id_user_id.
            throw new PostgrestError({
                message: 'duplicate key value violates unique constraint "uq_balances_reward_program_id_user_id"',
                details: `Key (reward_program_id, user_id)=(${data.reward_program_id}, ${data.user_id}) already exists.`,
                hint: "",
                code: "23505",
            });
        }

        const now = new Date().toISOString();
        const row = BalanceSchema.parse({
            id: randomUUID(),
            created_at: now,
            updated_at: now,
            ...data,
        });
        this.rows.set(row.id, row);
        return row;
    }

    public async update(id: string, data: BalanceUpdate): Promise<Balance | null> {
        const existing = this.rows.get(id);
        if (!existing) {
            return null;
        }
        const updated = BalanceSchema.parse({
            ...existing,
            ...data, 
            updated_at: new Date().toISOString(),
        });
        this.rows.set(id, updated);
        return updated;
    }

    public async delete(id: string): Promise<boolean> {
        return this.rows.delete(id);
    }
}

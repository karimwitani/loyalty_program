import { randomUUID } from "crypto";
import {
    Balance,
    BalanceCreate,
    BalanceUpdate,
    BalanceSchema
} from "@/domain/types/balances.types";
import { IBalancesRepository } from "@/repositories/balances.repositorty";

export class InMemoryBalancesRepository implements IBalancesRepository {
    private rows: Map<string, Balance> = new Map();

    public async findById(id: string): Promise<Balance | null> {
        return this.rows.get(id) ?? null;
    }

    public async findByUserId(id: string): Promise<Balance[]> {
        return [...this.rows.values()].filter((row) => row.user_id === id);
    }

    public async findByOrgId(id: string): Promise<Balance[]> {
        return [...this.rows.values()].filter((row) => row.org_id === id);
    }

    public async create(data: BalanceCreate): Promise<Balance | null> {
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

import { randomUUID } from "crypto";
import {
    Reward,
    RewardCreate,
    RewardUpdate,
    RewardSchema
} from "@/domain/types/rewards.types";
import { IRewardsRepository } from "@/repositories/rewards.repository";

export class InMemoryRewardsRepository implements IRewardsRepository {
    private rows: Map<string, Reward> = new Map();

    public async findById(id: string): Promise<Reward | null> {
        return this.rows.get(id) ?? null;
    }

    public async findAll(orgId?: string): Promise<Reward[]> {
        const rows = Array.from(this.rows.values());
        if (!orgId) {
            return rows;
        }
        return rows.filter((row) => row.org_id === orgId);
    }

    public async create(data: RewardCreate): Promise<Reward | null> {
        const now = new Date().toISOString();
        const row = RewardSchema.parse({
            id: randomUUID(),
            created_at: now,
            updated_at: now,
            ...data,
        });
        this.rows.set(row.id, row);
        return row;
    }

    public async update(id: string, data: RewardUpdate): Promise<Reward | null> {
        const existing = this.rows.get(id);
        if (!existing) {
            return null;
        }
        const updated = RewardSchema.parse({
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

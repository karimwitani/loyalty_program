import {
    Reward,
    RewardCreate,
    RewardUpdate,
    RewardSchema
} from "@/domain/types/rewards.types";
import { supabase } from "@/lib/supabase-client";
import { toPostgrestError } from "@/utils/postgres-error-handler";

const REWARDS_SELECT_QUERY = `
    id,
    org_id,
    name,
    required_points,
    created_at,
    updated_at
`

export interface IRewardsRepository {
    findById: (id: string) => Promise<Reward | null>;
    findAll: (orgId?: string) => Promise<Reward[]>;
    create: (data: RewardCreate) => Promise<Reward | null>;
    update: (id: string, data: RewardUpdate) => Promise<Reward | null>;
    delete: (id: string) => Promise<boolean>;
}

export class RewardsRepository implements IRewardsRepository {
    public async findById(id: string): Promise<Reward | null> {
        const { data, error } = await supabase.from("rewards")
            .select(REWARDS_SELECT_QUERY)
            .eq("id", id)
            .maybeSingle()

        if (error) {
            throw toPostgrestError(error);
        }
        if (!data) {
            return null;
        }

        return RewardSchema.parse(data);
    };

    public async findAll(orgId?: string): Promise<Reward[]> {
        let query = supabase.from("rewards").select(REWARDS_SELECT_QUERY);

        if (orgId) {
            query = query.eq("org_id", orgId);
        }

        const { data, error } = await query;

        if (error) {
            throw toPostgrestError(error);
        }

        return (data ?? []).map((row) => RewardSchema.parse(row));
    };

    public async create(data: RewardCreate): Promise<Reward | null> {
        const { data: row, error } = await supabase
            .from("rewards")
            .insert(data)
            .select(REWARDS_SELECT_QUERY)
            .single();

        if (error) {
            throw toPostgrestError(error);
        }

        if (!row) {
            throw new Error("Failed to create reward");
        }
        return RewardSchema.parse(row);
    };

    public async update(id: string, data: RewardUpdate): Promise<Reward | null> {
        const { data: row, error } = await supabase
            .from("rewards")
            .update(data)
            .eq("id", id)
            .select(REWARDS_SELECT_QUERY)
            .single();

        if (error) {
            throw toPostgrestError(error);
        }

        if (!row) {
            throw new Error("Failed to update reward");
        }
        return RewardSchema.parse(row);
    };

    public async delete(id: string): Promise<boolean> {
        const { error } = await supabase
            .from("rewards")
            .delete()
            .eq("id", id)

        if (error) {
            throw toPostgrestError(error);
        }

        return true;
    };
}

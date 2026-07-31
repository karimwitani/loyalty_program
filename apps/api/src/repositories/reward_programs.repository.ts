import {
    RewardProgram,
    RewardProgramSchema,
} from "@/domain/types/reward_programs.types";
import { supabase } from "@/lib/supabase-client";
import { toPostgrestError } from "@/utils/postgres-error-handler";

const REWARD_PROGRAMS_SELECT_QUERY = `
    id,
    title,
    org_id,
    type,
    created_at,
    updated_at,
    reward:rewards(
        id,
        org_id,
        name,
        required_points,
        created_at,
        updated_at
    )
`

export interface RewardProgramCreatePointProgram {
    title: string;
    org_id: string;
}

export interface RewardProgramCreateRewardProgram {
    title: string;
    org_id: string;
    reward: {
        name: string;
        required_points: number;
    };
}

// update/delete are intentionally not on this interface yet - split into a
// follow-up issue off LOY-13, see reward_programs.service.ts.
export interface IRewardProgramsRepository {
    findById: (id: string) => Promise<RewardProgram | null>;
    findAll: (orgId?: string) => Promise<RewardProgram[]>;
    createPointProgram: (data: RewardProgramCreatePointProgram) => Promise<RewardProgram>;
    createRewardProgramWithReward: (data: RewardProgramCreateRewardProgram) => Promise<RewardProgram>;
}

export class RewardProgramsRepository implements IRewardProgramsRepository {
    public async findById(id: string): Promise<RewardProgram | null> {
        const { data, error } = await supabase.from("reward_programs")
            .select(REWARD_PROGRAMS_SELECT_QUERY)
            .eq("id", id)
            .maybeSingle()

        if (error) {
            throw toPostgrestError(error);
        }
        if (!data) {
            return null;
        }

        return RewardProgramSchema.parse(data);
    };

    public async findAll(orgId?: string): Promise<RewardProgram[]> {
        let query = supabase.from("reward_programs").select(REWARD_PROGRAMS_SELECT_QUERY);

        if (orgId) {
            query = query.eq("org_id", orgId);
        }

        const { data, error } = await query;

        if (error) {
            throw toPostgrestError(error);
        }

        return (data ?? []).map((row) => RewardProgramSchema.parse(row));
    };

    public async createPointProgram(data: RewardProgramCreatePointProgram): Promise<RewardProgram> {
        const { data: row, error } = await supabase
            .from("reward_programs")
            .insert({ title: data.title, org_id: data.org_id, type: "point_program" })
            .select(REWARD_PROGRAMS_SELECT_QUERY)
            .single();

        if (error) {
            throw toPostgrestError(error);
        }
        if (!row) {
            throw new Error("Failed to create reward program");
        }

        return RewardProgramSchema.parse(row);
    };

    public async createRewardProgramWithReward(data: RewardProgramCreateRewardProgram): Promise<RewardProgram> {
        // Both the reward and the program are written atomically by the
        // fn_create_reward_program_with_reward Postgres function - see
        // supabase/schema.sql. It intentionally returns just the new
        // program's id, not the full row with the embedded reward join:
        // RETURNS TABLE of arbitrary columns comes back typed as any/JSON in
        // the generated Supabase types (same reasoning as fn_increment_balance
        // in balances.repositorty.ts), so we do a real select below instead.
        const { data: rewardProgramId, error: rpcError } = await supabase.rpc(
            "fn_create_reward_program_with_reward",
            {
                p_org_id: data.org_id,
                p_title: data.title,
                p_reward_name: data.reward.name,
                p_reward_required_points: data.reward.required_points,
            },
        );

        if (rpcError) {
            throw toPostgrestError(rpcError);
        }
        if (!rewardProgramId) {
            throw new Error("Failed to create reward program");
        }

        const program = await this.findById(rewardProgramId);
        if (!program) {
            throw new Error("Failed to load created reward program");
        }

        return program;
    };
}

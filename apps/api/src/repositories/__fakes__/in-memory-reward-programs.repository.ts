import { randomUUID } from "crypto";
import { injectable, inject } from "inversify";

import {
    RewardProgram,
    RewardProgramSchema,
} from "@/domain/types/reward_programs.types";
import {
    IRewardProgramsRepository,
    RewardProgramCreatePointProgram,
    RewardProgramCreateRewardProgram,
} from "@/repositories/reward_programs.repository";
import { type IRewardsRepository } from "@/repositories/rewards.repository";
import { TYPES } from "@/domain/types/di-tokens.types";

interface RewardProgramRow {
    id: string;
    title: string;
    org_id: string;
    type: "point_program" | "reward_program";
    reward_id: string | null;
    created_at: string;
    updated_at: string;
}

// Shares the same IRewardsRepository instance the /rewards slice is bound to
// (injected, singleton-scoped - see inversify.config.ts) rather than keeping
// its own reward state, so a reward created inline here is visible to
// GET /rewards and vice versa, matching the real DB where they're the same
// table.
@injectable()
export class InMemoryRewardProgramsRepository implements IRewardProgramsRepository {
    private rows: Map<string, RewardProgramRow> = new Map();

    public constructor(
        @inject(TYPES.IRewardsRepository) private rewardsRepo: IRewardsRepository
    ) {}

    private async toRewardProgram(row: RewardProgramRow): Promise<RewardProgram> {
        const reward = row.reward_id ? await this.rewardsRepo.findById(row.reward_id) : null;
        return RewardProgramSchema.parse({
            id: row.id,
            title: row.title,
            org_id: row.org_id,
            type: row.type,
            reward,
            created_at: row.created_at,
            updated_at: row.updated_at,
        });
    }

    public async findById(id: string): Promise<RewardProgram | null> {
        const row = this.rows.get(id);
        return row ? this.toRewardProgram(row) : null;
    }

    public async findAll(orgId?: string): Promise<RewardProgram[]> {
        const rows = Array.from(this.rows.values()).filter((row) => !orgId || row.org_id === orgId);
        return Promise.all(rows.map((row) => this.toRewardProgram(row)));
    }

    public async createPointProgram(data: RewardProgramCreatePointProgram): Promise<RewardProgram> {
        const now = new Date().toISOString();
        const row: RewardProgramRow = {
            id: randomUUID(),
            title: data.title,
            org_id: data.org_id,
            type: "point_program",
            reward_id: null,
            created_at: now,
            updated_at: now,
        };
        this.rows.set(row.id, row);
        return this.toRewardProgram(row);
    }

    public async createRewardProgramWithReward(data: RewardProgramCreateRewardProgram): Promise<RewardProgram> {
        // Reproduces the atomicity of fn_create_reward_program_with_reward:
        // the reward is created first, and only on success do we insert the
        // program row. If reward creation throws (e.g. RewardSchema rejects
        // required_points <= 0), no program row is ever added - the same
        // "both rows, or neither" guarantee the real RPC gives.
        const reward = await this.rewardsRepo.create({
            org_id: data.org_id,
            name: data.reward.name,
            required_points: data.reward.required_points,
        });
        if (!reward) {
            throw new Error("Failed to create reward for reward program");
        }

        const now = new Date().toISOString();
        const row: RewardProgramRow = {
            id: randomUUID(),
            title: data.title,
            org_id: data.org_id,
            type: "reward_program",
            reward_id: reward.id,
            created_at: now,
            updated_at: now,
        };
        this.rows.set(row.id, row);
        return this.toRewardProgram(row);
    }

    // update/delete are intentionally not implemented yet - split into a
    // follow-up issue off LOY-13, see reward_programs.service.ts.
}

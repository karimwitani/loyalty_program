import { injectable, inject } from "inversify";
import { type IRewardProgramsRepository } from "@/repositories/reward_programs.repository";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    RewardProgramCreate,
    RewardProgramCreateSchema,
} from "@/domain/types/reward_programs.types";

// PATCH/DELETE (updateRewardProgram/deleteRewardProgram) are intentionally
// not implemented yet - split off LOY-13 into a follow-up issue. Only
// read + create ship in this slice.
@injectable()
export class RewardProgramsService {
    public constructor(
        @inject(TYPES.IRewardProgramsRepository) private repo: IRewardProgramsRepository
    ) {}

    public async getRewardProgramById(id: string) {
        const rewardProgram = await this.repo.findById(id);

        return rewardProgram
    }

    public async getRewardPrograms(org_id?: string) {
        const rewardPrograms = await this.repo.findAll(org_id);
        return rewardPrograms;
    }

    public async createRewardProgram(payload: RewardProgramCreate) {
        const validated = RewardProgramCreateSchema.parse(payload);

        // The reward/program split is hidden from API consumers: a single
        // POST with type: "reward_program" atomically creates both rows
        // (see fn_create_reward_program_with_reward); the branch on `type`
        // belongs here, in the service, not in the controller.
        if (validated.type === "point_program") {
            return this.repo.createPointProgram({
                title: validated.title,
                org_id: validated.org_id,
            });
        }

        return this.repo.createRewardProgramWithReward({
            title: validated.title,
            org_id: validated.org_id,
            reward: validated.reward,
        });
    }
}

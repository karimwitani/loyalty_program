import { injectable, inject } from "inversify";
import { type IRewardProgramsRepository } from "@/repositories/reward_programs.repository";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    RewardProgramCreate,
    RewardProgramUpdate,
    RewardProgramCreateSchema,
} from "@/domain/types/reward_programs.types";
import { NotFoundError } from "@/domain/errors/base.errors"

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

    public async updateRewardProgram(id: string, payload: RewardProgramUpdate) {
        // 1. check if the reward program exists
        const rewardProgram = await this.repo.findById(id);
        if (!rewardProgram) {
            throw new NotFoundError(`Reward program with id: ${id} not found. Verify that you're passing the proper reward program ID in the request.`)
        }

        // 2. a no-op PATCH ({}) is a valid request per RewardProgramUpdateSchema
        // (title is optional), but PostgREST rejects an empty .update({}) with
        // PGRST116 ("cannot coerce the result to a single JSON object").
        // Short-circuit here so the fake and real repositories agree on the
        // answer (200 with the unchanged program) - same fix applied to
        // RewardsService.updateReward for LOY-12.
        if (Object.keys(payload).length === 0) {
            return rewardProgram;
        }

        // 3. update and return the reward program
        const updated = await this.repo.update(id, payload);
        return updated
    }

    public async deleteRewardProgram(id: string) {
        // 1. check if the reward program exists
        const rewardProgram = await this.repo.findById(id);
        if (!rewardProgram) {
            throw new NotFoundError(`Reward program with id: ${id} not found. Verify that you're passing the proper reward program ID in the request.`)
        }

        // 2. delete and return the result
        const deleted = await this.repo.delete(id);
        return deleted
    }
}

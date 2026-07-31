import { injectable, inject } from "inversify";
import { type IRewardsRepository } from "@/repositories/rewards.repository";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    RewardCreate,
    RewardUpdate,
    RewardCreateSchema
} from "@/domain/types/rewards.types";
import { NotFoundError } from "@/domain/errors/base.errors"

@injectable()
export class RewardsService {
    public constructor(
        @inject(TYPES.IRewardsRepository) private repo: IRewardsRepository
    ) {}

    public async getRewardById(reward_id: string) {
        const reward = await this.repo.findById(reward_id)

        return reward
    }

    public async getRewards(org_id?: string) {
        const rewards = await this.repo.findAll(org_id);
        return rewards;
    }

    public async createReward(payload: RewardCreate) {
        const validate = RewardCreateSchema.parse(payload);
        const reward = await this.repo.create(validate);
        return reward;
    }

    public async updateReward(id: string, payload: RewardUpdate) {
        // 1. check if reward exists
        const reward = await this.repo.findById(id);
        if (!reward) {
            throw new NotFoundError(`Reward with id: ${id} not found. Verify that you're passing the proper reward ID in the request.`)
        }

        // 2. a no-op PATCH ({}) is a valid request per RewardUpdateSchema,
        // but PostgREST rejects an empty .update({}) with PGRST116 ("cannot
        // coerce the result to a single JSON object"). Short-circuit here so
        // the fake and real repositories agree on the answer (200 with the
        // unchanged reward) instead of only the fake accepting it.
        if (Object.keys(payload).length === 0) {
            return reward;
        }

        // 3. update and return the reward
        const updated = await this.repo.update(id, payload);
        return updated
    }

    public async deleteReward(reward_id: string) {
        // 1. check if reward exists
        const reward = await this.repo.findById(reward_id);
        if (!reward) {
            throw new NotFoundError(`Reward with id: ${reward_id} not found. Verify that you're passing the proper reward ID in the request.`)
        }

        // 2. delete and return the result
        const deleted = await this.repo.delete(reward_id);
        return deleted
    }
}

import {
    Controller,
    Get,
    Post,
    Route,
    Tags,
    Path,
    Query,
    Request,
    Body,
    SuccessResponse,
    Response,
    ValidateError,
    Patch,
    Delete
} from "tsoa";
import { injectable, inject } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types"
import { RewardsService } from "@/services/rewards.service"
import type { Request as ExRequest } from "express";
import {
    type Reward,
    type RewardCreate,
    type RewardUpdate,
    RewardCreateSchema,
    RewardUpdateSchema,
} from "@/domain/types/rewards.types";
import { NotFoundError } from "@/domain/errors/base.errors";
import z from "zod"

@injectable()
@Tags("rewards")
@Route("rewards")
export class RewardsController extends Controller {
    constructor(
        @inject(TYPES.RewardsService) private rewardsService: RewardsService
    ) {
        super()
    }

    @SuccessResponse(200)
    @Get("/")
    public async getRewards(
        @Request() request: ExRequest,
        @Query() org_id?: string
    ): Promise<Reward[]> {
        if (org_id) {
            z.uuid().parse(org_id);
        }

        return this.rewardsService.getRewards(org_id);
    }

    @SuccessResponse(200)
    @Response<NotFoundError>(404, "Not found")
    @Get("{id}")
    public async getRewardById(
        @Path() id: string,
        @Request() request: ExRequest
    ) {
        z.uuid().parse(id);

        const reward = await this.rewardsService.getRewardById(id)
        if (!reward) {
            this.setStatus(404);
            return null;
        }
        return reward;
    }

    @SuccessResponse(201, "Created")
    @Post()
    public async createReward(
        @Body() body: RewardCreate,
        @Request() request: ExRequest
    ) {
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = RewardCreateSchema.parse(body);

        const reward = this.rewardsService.createReward(validate)
        return reward
    }

    @SuccessResponse(200, "Updated")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Patch("{id}")
    public async updateReward(
        @Path() id: string,
        @Body() body: RewardUpdate,
        @Request() request: ExRequest
    ) {
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);
        const validate = RewardUpdateSchema.parse(body);

        const reward = this.rewardsService.updateReward(id, validate)
        return reward
    }

    @SuccessResponse(204, "Deleted")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Delete("{id}")
    public async deleteReward(
        @Path() id: string,
        @Request() request: ExRequest
    ) {
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);

        await this.rewardsService.deleteReward(id)

        this.setStatus(204);
        return null;
    }
}

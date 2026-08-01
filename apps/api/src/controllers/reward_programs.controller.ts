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
import { RewardProgramsService } from "@/services/reward_programs.service"
import type { Request as ExRequest } from "express";
import {
    type RewardProgram,
    type RewardProgramCreate,
    type RewardProgramUpdate,
    RewardProgramCreateSchema,
    RewardProgramUpdateSchema,
} from "@/domain/types/reward_programs.types";
import { NotFoundError } from "@/domain/errors/base.errors";
import z from "zod"

@injectable()
@Tags("reward_programs")
@Route("reward_programs")
export class RewardProgramsController extends Controller {
    constructor(
        @inject(TYPES.RewardProgramsService) private rewardProgramsService: RewardProgramsService
    ) {
        super()
    }

    @SuccessResponse(200)
    @Get("/")
    public async getRewardPrograms(
        @Request() request: ExRequest,
        @Query() org_id?: string
    ): Promise<RewardProgram[]> {
        if (org_id) {
            z.uuid().parse(org_id);
        }

        return this.rewardProgramsService.getRewardPrograms(org_id);
    }

    @SuccessResponse(200)
    @Response<NotFoundError>(404, "Not found")
    @Get("{id}")
    public async getRewardProgramById(
        @Path() id: string,
        @Request() request: ExRequest
    ) {
        z.uuid().parse(id);

        const rewardProgram = await this.rewardProgramsService.getRewardProgramById(id)
        if (!rewardProgram) {
            this.setStatus(404);
            return null;
        }
        return rewardProgram;
    }

    @SuccessResponse(201, "Created")
    @Response<ValidateError>(422, "Validation Failed")
    @Post()
    public async createRewardProgram(
        @Body() body: RewardProgramCreate,
        @Request() request: ExRequest
    ) {
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = RewardProgramCreateSchema.parse(body);

        const rewardProgram = this.rewardProgramsService.createRewardProgram(validate)
        return rewardProgram
    }

    @SuccessResponse(200, "Updated")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Patch("{id}")
    public async updateRewardProgram(
        @Path() id: string,
        @Body() body: RewardProgramUpdate,
        @Request() request: ExRequest
    ) {
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);
        const validate = RewardProgramUpdateSchema.parse(body);

        const rewardProgram = this.rewardProgramsService.updateRewardProgram(id, validate)
        return rewardProgram
    }

    @SuccessResponse(204, "Deleted")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Delete("{id}")
    public async deleteRewardProgram(
        @Path() id: string,
        @Request() request: ExRequest
    ) {
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);

        await this.rewardProgramsService.deleteRewardProgram(id)

        this.setStatus(204);
        return null;
    }
}

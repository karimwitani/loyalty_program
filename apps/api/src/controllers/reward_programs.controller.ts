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
} from "tsoa";
import { injectable, inject } from "inversify";
import { TYPES } from "@/domain/types/di-tokens.types"
import { RewardProgramsService } from "@/services/reward_programs.service"
import type { Request as ExRequest } from "express";
import {
    type RewardProgram,
    type RewardProgramCreate,
    RewardProgramCreateSchema,
} from "@/domain/types/reward_programs.types";
import { NotFoundError } from "@/domain/errors/base.errors";
import z from "zod"

// PATCH/DELETE are intentionally not implemented yet - split off LOY-13 into
// a follow-up issue covering /reward_programs update/delete.
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
}

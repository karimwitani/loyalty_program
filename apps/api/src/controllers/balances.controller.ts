import {
    Controller,
    Get,
    Post,
    Route,
    Tags,
    Path,
    Request,
    Body,
    SuccessResponse,
    Response,
    Delete,
} from "tsoa";
import { injectable, inject } from "inversify";
import  {TYPES} from "@/domain/types/di-tokens.types"
import { BalanceService } from "@/services/balances.service"
import type { Request as ExRequest } from "express";
import {
    type BalanceCreate,
    type BalanceIncrement,
    BalanceCreateSchema,
    BalanceIncrementSchema,
} from "@/domain/types/balances.types";
import {NotFoundError} from "@/domain/errors/base.errors"


@injectable()
@Tags("balances")
@Route("balances")
export class BalancesController extends Controller {
    constructor(
        @inject(TYPES.BalancesService) private balanceService: BalanceService
    ){
        super()
    }

    @Get("/")
    public async getBalances(){
        this.setStatus(501)
    }

    @SuccessResponse(200)
    @Response<NotFoundError>(404, "Not found")
    @Get("{id}")
    public async getBalanceById(
        @Path() id: string,
        @Request() request: ExRequest
    ){
        const balance = await this.balanceService.getBalanceById(id)
        if (!balance) {
            this.setStatus(404);
            return null;
        }
        return balance;
    }

    @SuccessResponse(201, "Created")
    @Post()
    public async createBalance(
        @Body() body: BalanceCreate,
        @Request() request: ExRequest
    ){
        // parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = BalanceCreateSchema.parse(body);

        const balance = this.balanceService.createBalance(validate)
        return balance
    }

    @SuccessResponse(201, "Created")
    @Post("{id}/increment")
    public async incrementBalance(
        @Path() id: string,
        @Body() body: BalanceIncrement,
        @Request() request: ExRequest
    ){
        // parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = BalanceIncrementSchema.parse(body);

        const balance = this.balanceService.incrementBalance(id, validate)
        return balance
    }

    @SuccessResponse(201, "Created")
    @Post("{id}/redeem")
    public async redeemBalance(
        @Path() id: string,
        @Body() body: BalanceIncrement,
        @Request() request: ExRequest
    ){
        // parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = BalanceIncrementSchema.parse(body);

        const balance = this.balanceService.redeemBalance(id, validate)
        return balance
    }

    @SuccessResponse(204, "Deleted")
    @Response<NotFoundError>(404, "Not found")
    @Delete("{id}")
    public async deleteBalance(
        @Path() id: string,
        @Request() request: ExRequest
    ){
        const balance = await this.balanceService.deleteBalance(id)
        if (!balance) {
            this.setStatus(404);
            return null;
        }

        this.setStatus(204);
        return null;
    }
}
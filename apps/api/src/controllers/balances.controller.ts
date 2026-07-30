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
import { type BalanceTransactionPage } from "@/domain/types/balance_transactions.types";
import {NotFoundError} from "@/domain/errors/base.errors"
import z from "zod"


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
        z.uuid().parse(id);

        const balance = await this.balanceService.getBalanceById(id)
        if (!balance) {
            this.setStatus(404);
            return null;
        }
        return balance;
    }

    @SuccessResponse(200)
    @Response<NotFoundError>(404, "Not found")
    @Get("{id}/transactions")
    public async getBalanceTransactions(
        @Path() id: string,
        @Request() request: ExRequest,
        @Query() page_size?: number,
        @Query() starting_after?: string
    ): Promise<BalanceTransactionPage> {
        z.uuid().parse(id);

        return this.balanceService.getBalanceTransactions(id, { page_size, starting_after });
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
    @Response<NotFoundError>(404, "Not found")
    @Post("{id}/increment")
    public async incrementBalance(
        @Path() id: string,
        @Body() body: BalanceIncrement,
        @Request() request: ExRequest
    ){
        // parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);
        const validate = BalanceIncrementSchema.parse(body);

        const balance = this.balanceService.incrementBalance(id, validate)
        return balance
    }

    @SuccessResponse(201, "Created")
    @Response<NotFoundError>(404, "Not found")
    @Post("{id}/redeem")
    public async redeemBalance(
        @Path() id: string,
        @Body() body: BalanceIncrement,
        @Request() request: ExRequest
    ){
        // parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);
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
        z.uuid().parse(id);

        await this.balanceService.deleteBalance(id)

        this.setStatus(204);
        return null;
    }
}
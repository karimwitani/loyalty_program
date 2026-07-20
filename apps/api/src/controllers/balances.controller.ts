import {
    Controller,
    Get,
    Post,
    Route,
    Tags,
    Path,
    Request,
    Body,
    SuccessResponse
} from "tsoa";
import { injectable, inject } from "inversify";
import  {TYPES} from "@/domain/types/di-tokens.types"
import { BalanceService } from "@/services/balances.service"
import type { Request as ExRequest } from "express";
import {
    type BalanceCreate,
    BalanceCreateSchema
} from "@/domain/types/balances.types";


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
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = BalanceCreateSchema.parse(body);

        const balance = this.balanceService.createBalance(validate)
        return balance
    }
}
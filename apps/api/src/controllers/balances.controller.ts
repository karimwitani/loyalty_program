import {
    Controller,
    Get,
    Post,
    Route,
    Tags 
} from "tsoa";

@Tags("balances")
@Route("balances")
export class BalancesController extends Controller {

    @Get("/")
    public async getBalanceById(){
        return {"route": "GET /balances"}
    }

    @Post("/")
    public async createBalance(){
        return {"route": "POST /balances"}
    }
}
import {injectable, inject} from "inversify";
import { type IBalancesRepository } from "@/repositories/balances.repositorty";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    Balance,
    BalanceCreate,
    BalanceUpdate,
    BalanceCreateSchema
} from "@/domain/types/balances.types";

@injectable()
export class BalanceService {
    public constructor(
        @inject(TYPES.IBalancesRepository) private repo: IBalancesRepository
    ){}

    public async getBalanceById(balance_id: string){
        const balance = await this.repo.findById(balance_id)

        return balance
    }
    
    public async getUserBalances(user_id: string){}
    
    public async getOrgBalances(org_id: string){}
    
    public async createBalance(payload: BalanceCreate){
        const validate = BalanceCreateSchema.parse(payload);
        const balance = await this.repo.create(validate);
        return balance;
    }
    
    public async updateBalance(payload: BalanceUpdate){}
    
    public async deleteBalance(balance_id: string){}
}
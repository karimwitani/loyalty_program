import {injectable, inject} from "inversify";
import { type IBalancesRepository } from "@/repositories/balances.repositorty";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    Balance,
    BalanceCreate,
    BalanceUpdate,
    BalanceCreateSchema,
    BalanceIncrementSchema,
    BalanceIncrement,
} from "@/domain/types/balances.types";

import { NotFoundError } from "@/domain/errors/base.errors"

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

    public async incrementBalance(id: string, payload: BalanceIncrement){
        const validate = BalanceIncrementSchema.parse(payload);
        const balance = await this.repo.increment(id, validate.amount);
        return balance;
    }

    public async redeemBalance(id: string, payload: BalanceIncrement){
        const validate = BalanceIncrementSchema.parse(payload);
        const balance = await this.repo.redeem(id, validate.amount);
        return balance;
    }
    
    public async updateBalance(payload: BalanceUpdate){}
    
    public async deleteBalance(balance_id: string){
        // 1. check if balance exists
        const user = await this.repo.findById(balance_id);
        if (!user){
            throw new NotFoundError(`Balance ${balance_id} not found. Verify that you're passing the proper ID in the request.`)
        }
        
        // 2. check if requestor can delete this balance
        // TODO: Authz check
        
        // 3. update and return the user
        const deleted = await this.repo.delete(balance_id);
        return deleted
    }
}
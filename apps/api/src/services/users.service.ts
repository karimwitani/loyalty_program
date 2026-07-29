import {injectable, inject} from "inversify";
import { type IUsersRepository } from "@/repositories/users.repository";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    UserCreate,
    UserUpdate,
    UserCreateSchema
} from "@/domain/types/users.types";
import { NotFoundError} from "@/domain/errors/base.errors"

@injectable()
export class UsersService {
    public constructor(
        @inject(TYPES.IUsersRepository) private repo: IUsersRepository
    ){}

    public async getUserById(user_id: string){
        const user = await this.repo.findById(user_id)

        return user
    }
    
    public async createUser(payload: UserCreate){
        const validate = UserCreateSchema.parse(payload);
        const user = await this.repo.create(validate);
        return user;
    }

    public async updateUser(id: string, payload: UserUpdate){
        // 1. check if user exists
        const user = await this.repo.findById(id);
        if (!user){
            throw new NotFoundError(`User with id: ${id} not found. Verify that you're passing the proper ID in the request.`)
        }
        
        // 2. check if user owns the user
        // TODO: Authz check
        
        // 3. update and return the user
        const updated = await this.repo.update(id, payload);
        return updated
    }

    public async deleteUser(user_id: string){
        // 1. check if user exists
        const user = await this.repo.findById(user_id);
        if (!user){
            throw new NotFoundError(`User with id: ${user_id} not found. Verify that you're passing the proper ID in the request.`)
        }
        
        // 2. check if user owns the user
        // TODO: Authz check
        
        // 3. update and return the user
        const deleted = await this.repo.delete(user_id);
        return deleted
    }
}
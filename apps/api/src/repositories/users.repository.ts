import {
    User,
    UserCreate,
    UserUpdate,
    UserSchema,
} from "@/domain/types/users.types";
import { supabase } from "@/lib/supabase-client";
import { toPostgrestError } from "@/utils/postgres-error-handler";

const USERS_SELECT_QUERY = `
    id,
    first_name,
    last_name,
    email,
    created_at,
    updated_at
`


export interface IUsersRepository {
    findById: (id: string) => Promise<User | null>;
    create: (data: UserCreate) => Promise<User | null>;
    update: (id: string, data: UserUpdate) => Promise<User | null>;
    delete: (id: string) => Promise<boolean>;
}

export class UsersRepository implements IUsersRepository {
    public async findById(id: string): Promise<User | null>{
        const { data, error} = await supabase.from("users")
            .select(USERS_SELECT_QUERY)
            .eq("id", id)
            .maybeSingle()

        if (error) {
            throw(error)
        }
        if (!data) {
            return null;
        }

        return UserSchema.parse(data);
    };
    
    public async create(data: UserCreate): Promise<User | null>{
        // TODO: AUTZ checks
        const { data: row, error } = await supabase
            .from("users")
            .insert(data)
            .select(USERS_SELECT_QUERY)
            .single();
        console.log("UserRepository.create - error")
        console.log(error)
        if (error){
            const err = toPostgrestError(error)
            throw err;
        }

        if ( !row) {
            throw new Error("Failed to create user");
        }
        return UserSchema.parse(row);
    };
    
    public async update(id: string, data: UserUpdate): Promise<User | null>{
        const { data: row, error } = await supabase
            .from("users")
            .update(data)
            .eq("id", id)
            .select(USERS_SELECT_QUERY)
            .single();
        
        if (error){
            console.error(error)
            const err = toPostgrestError(error)
            throw err;
        }

        if (!row) {
            throw new Error("Failed to update user");
        }
        return UserSchema.parse(row);
    };
    
    public async delete(id: string): Promise<boolean>{
        const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", id)
        
        if (error){
            throw error;
        }

        return true;
    };
}
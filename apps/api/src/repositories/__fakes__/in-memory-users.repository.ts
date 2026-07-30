import { PostgrestError } from "@supabase/supabase-js";
import {
    User,
    UserCreate,
    UserUpdate,
    UserSchema
} from "@/domain/types/users.types";
import { IUsersRepository } from "@/repositories/users.repository";

export class InMemoryUsersRepository implements IUsersRepository {
    private rows: Map<string, User> = new Map();

    public async findById(id: string): Promise<User | null> {
        return this.rows.get(id) ?? null;
    }

    public async create(data: UserCreate): Promise<User | null> {
        if (this.rows.has(data.id)) {
            // Mirrors the pk_users primary key violation Postgres raises
            // when inserting a row whose id already exists.
            throw new PostgrestError({
                message: `duplicate key value violates unique constraint "pk_users"`,
                details: `Key (id)=(${data.id}) already exists.`,
                hint: "",
                code: "23505",
            });
        }

        const now = new Date().toISOString();
        const row = UserSchema.parse({
            created_at: now,
            updated_at: now,
            ...data,
        });
        this.rows.set(row.id, row);
        return row;
    }

    public async update(id: string, data: UserUpdate): Promise<User | null> {
        const existing = this.rows.get(id);
        if (!existing) {
            return null;
        }
        const updated = UserSchema.parse({
            ...existing,
            ...data,
            updated_at: new Date().toISOString(),
        });
        this.rows.set(id, updated);
        return updated;
    }

    public async delete(id: string): Promise<boolean> {
        return this.rows.delete(id);
    }
}

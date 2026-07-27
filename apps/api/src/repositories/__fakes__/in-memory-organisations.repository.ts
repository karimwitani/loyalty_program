import { randomUUID } from "crypto";
import {
    Organisation,
    OrganisationCreate,
    OrganisationUpdate,
    OrganisationSchema
} from "@/domain/types/organisations.types";
import { IOrganisationsRepository } from "@/repositories/organisations.repository";

export class InMemoryOrganisationsRepository implements IOrganisationsRepository {
    private rows: Map<string, Organisation> = new Map();

    public async findById(id: string): Promise<Organisation | null> {
        return this.rows.get(id) ?? null;
    }


    public async create(data: OrganisationCreate): Promise<Organisation | null> {
        const now = new Date().toISOString();
        const row = OrganisationSchema.parse({
            id: randomUUID(),
            created_at: now,
            updated_at: now,
            ...data,
        });
        this.rows.set(row.id, row);
        return row;
    }

    public async update(id: string, data: OrganisationUpdate): Promise<Organisation | null> {
        const existing = this.rows.get(id);
        if (!existing) {
            return null;
        }
        const updated = OrganisationSchema.parse({
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

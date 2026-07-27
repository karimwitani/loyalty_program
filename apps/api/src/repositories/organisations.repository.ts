import {
    Organisation,
    OrganisationCreate,
    OrganisationUpdate,
    OrganisationSchema,
    OrganisationCreateSchema
} from "@/domain/types/organisations.types";
import { supabase } from "@/lib/supabase-client";
import { toPostgrestError } from "@/utils/postgres-error-handler";

const ORGANISATION_SELECT_QUERY = `
    id,
    name,
    created_at,
    updated_at
`


export interface IOrganisationsRepository {
    findById: (id: string) => Promise<Organisation | null>;
    create: (data: OrganisationCreate) => Promise<Organisation | null>;
    update: (id: string, data: OrganisationUpdate) => Promise<Organisation | null>;
    delete: (id: string) => Promise<boolean>;
}

export class OrganisationsRepository implements IOrganisationsRepository {
    public async findById(id: string): Promise<Organisation | null>{
        const { data, error} = await supabase.from("organisations")
            .select(ORGANISATION_SELECT_QUERY)
            .eq("id", id)
            .maybeSingle()

        if (error) {
            throw(error)
        }
        if (!data) {
            return null;
        }

        return OrganisationSchema.parse(data);
    };
    
    public async create(data: OrganisationCreate): Promise<Organisation | null>{
        // TODO: AUTZ checks
        const { data: row, error } = await supabase
            .from("organisations")
            .insert(data)
            .select(ORGANISATION_SELECT_QUERY)
            .single();
        
        if (error){
            const err = toPostgrestError(error)
            throw err;
        }

        if ( !row) {
            throw new Error("Failed to create lease");
        }
        return OrganisationSchema.parse(row);
    };
    
    public async update(id: string, data: OrganisationUpdate): Promise<Organisation | null>{
        const { data: row, error } = await supabase
            .from("organisations")
            .update(data)
            .eq("id", id)
            .select(ORGANISATION_SELECT_QUERY)
            .maybeSingle();

        if (error || !row) {
            return null;
        }
        return OrganisationSchema.parse(row);
    };
    
    public async delete(id: string): Promise<boolean>{
        const { error } = await supabase
            .from("organisations")
            .delete()
            .eq("id", id)
        
        if (error){
            throw error;
        }

        return true;
    };
}
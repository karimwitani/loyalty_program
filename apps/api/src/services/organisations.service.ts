import {injectable, inject} from "inversify";
import { type IOrganisationsRepository } from "@/repositories/organisations.repository";
import { TYPES } from "@/domain/types/di-tokens.types";
import {
    Organisation,
    OrganisationCreate,
    OrganisationUpdate,
    OrganisationCreateSchema
} from "@/domain/types/organisations.types";
import { NotFoundError} from "@/domain/errors/base.errors"

@injectable()
export class OrganisationsService {
    public constructor(
        @inject(TYPES.IOrganisationsRepository) private repo: IOrganisationsRepository
    ){}

    public async getOrganisationById(organisation_id: string){
        const organisation = await this.repo.findById(organisation_id)

        return organisation
    }

    public async getUserOrganisations(user_id: string){}
    
    public async createOrganisation(payload: OrganisationCreate){
        const validate = OrganisationCreateSchema.parse(payload);
        const organisation = await this.repo.create(validate);
        return organisation;
    }

    public async updateOrganisation(id: string, payload: OrganisationUpdate){
        // 1. check if organisation exists
        const organisation = await this.repo.findById(id);
        if (!organisation){
            throw new NotFoundError(`Organisation with id: ${id} not found. Verify that you're passing the proper Org ID in the request.`)
        }
        
        // 2. check if user owns the organisation
        // TODO: Authz check
        
        // 3. update and return the organisation
        const updated = await this.repo.update(id, payload);
        return updated
    }

    public async deleteOrganisation(organisation_id: string){
        // 1. check if organisation exists
        const organisation = await this.repo.findById(organisation_id);
        if (!organisation){
            throw new NotFoundError(`Organisation with id: ${organisation_id} not found. Verify that you're passing the proper Org ID in the request.`)
        }
        
        // 2. check if user owns the organisation
        // TODO: Authz check
        
        // 3. update and return the organisation
        const deleted = await this.repo.delete(organisation_id);
        return deleted
    }
}
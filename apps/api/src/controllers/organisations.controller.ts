import {
    Controller,
    Get,
    Post,
    Route,
    Tags,
    Path,
    Request,
    Body,
    SuccessResponse,
    Response,
    ValidateError,
    Patch,
    Delete
} from "tsoa";
import { injectable, inject } from "inversify";
import  {TYPES} from "@/domain/types/di-tokens.types"
import { OrganisationsService } from "@/services/organisations.service"
import type { Request as ExRequest } from "express";
import {
    type OrganisationCreate,
    type OrganisationUpdate,
    OrganisationCreateSchema,
    OrganisationUpdateSchema,
} from "@/domain/types/organisations.types";
import { NotFoundError } from "@/domain/errors/base.errors";
import z from "zod"

@injectable()
@Tags("organisations")
@Route("organisations")
export class OrganisationsController extends Controller {
    constructor(
        @inject(TYPES.OrganisationsService) private organisationsService: OrganisationsService
    ){
        super()
    }

    @Get("/")
    public async getOrganisations(){
        this.setStatus(501)
    }

    @SuccessResponse(200)
    @Get("{id}")
    public async getOrganisationById(
        @Path() id: string,
        @Request() request: ExRequest
    ){
        z.uuid().parse(id);

        const organisation = await this.organisationsService.getOrganisationById(id)
        if (!organisation) {
            this.setStatus(404);
            return null;
        }
        return organisation;
    }

    @SuccessResponse(201, "Created")
    @Post()
    public async createOrganisation(
        @Body() body: OrganisationCreate,
        @Request() request: ExRequest
    ){
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = OrganisationCreateSchema.parse(body);

        const organisation = this.organisationsService.createOrganisation(validate)
        return organisation
    }

    @SuccessResponse(200, "Updated")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Patch("{id}")
    public async updateOrganisation(
        @Path() id: string,
        @Body() body: OrganisationUpdate,
        @Request() request: ExRequest
    ){
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);
        const validate = OrganisationUpdateSchema.parse(body);

        const organisation = this.organisationsService.updateOrganisation(id, validate)
        return organisation
    }

    @SuccessResponse(204, "Deleted")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Delete("{id}")
    public async deleteOrganisation(
        @Path() id: string,
        @Request() request: ExRequest
    ){
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);

        await this.organisationsService.deleteOrganisation(id)

        this.setStatus(204);
        return null;
    }
}

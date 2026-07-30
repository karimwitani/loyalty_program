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
import { UsersService } from "@/services/users.service"
import type { Request as ExRequest } from "express";
import {
    type UserCreate,
    type UserUpdate,
    UserCreateSchema,
    UserUpdateSchema
} from "@/domain/types/users.types";
import { NotFoundError } from "@/domain/errors/base.errors";
import z from "zod"

@injectable()
@Tags("users")
@Route("users")
export class UsersController extends Controller {
    constructor(
        @inject(TYPES.UsersService) private usersService: UsersService
    ){
        super()
    }

    @Get("/")
    public async getUsers(){
        this.setStatus(501)
    }

    @SuccessResponse(200)
    @Get("{id}")
    public async getUserById(
        @Path() id: string,
        @Request() request: ExRequest
    ){
        z.uuid().parse(id);

        const user = await this.usersService.getUserById(id)
        if (!user) {
            this.setStatus(404);
            return null;
        }
        return user;
    }

    @SuccessResponse(201, "Created")
    @Post()
    public async createUser(
        @Body() body: UserCreate,
        @Request() request: ExRequest
    ){
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        const validate = UserCreateSchema.parse(body);

        const user = this.usersService.createUser(validate)
        return user
    }

    @SuccessResponse(200, "Updated")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Patch("{id}")
    public async updateUser(
        @Path() id: string,
        @Body() body: UserUpdate,
        @Request() request: ExRequest
    ){
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);
        const validate = UserUpdateSchema.parse(body);

        const user = this.usersService.updateUser(id, validate)
        return user
    }

    @SuccessResponse(204, "Deleted")
    @Response<NotFoundError>(404, "Not found")
    @Response<ValidateError>(422, "Validation Failed")
    @Delete("{id}")
    public async deleteUser(
        @Path() id: string,
        @Request() request: ExRequest
    ){
        // .parse throws an error and we dont have to handle it explicitly here
        // the global error handler will do that
        z.uuid().parse(id);

        await this.usersService.deleteUser(id)

        this.setStatus(204);
        return null;
    }
}

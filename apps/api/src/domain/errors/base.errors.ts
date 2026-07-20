export abstract class AppError extends Error {
    public abstract readonly statusCode: number;

    constructor(message: string){
        super(message);
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export class AuthorizationError extends AppError {
    public readonly statusCode = 403;
    constructor(message:string){
        super(message);
    }
}

export class NotFoundError extends AppError {
    public readonly statusCode = 404;
    constructor(message:string){
        super(message);
    }
}
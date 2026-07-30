import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { ZodError, z } from "zod";
import { ValidateError } from "tsoa";
import { PostgrestError } from "@supabase/supabase-js";

import { errorHandler } from "@/middleware/error-handler";
import { NotFoundError, AuthorizationError } from "@/domain/errors/base.errors";

function makeReq(overrides: Partial<Request> = {}): Request {
    return {
        path: "/test",
        host: "test-host",
        url: "/test",
        body: {},
        ...overrides,
    } as Request;
}

function makeRes(): Response & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
    const res = {
        statusCode: 200,
        getHeaders: vi.fn().mockReturnValue({}),
    } as unknown as Response & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
    res.status = vi.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

const next = vi.fn();

describe("errorHandler", () => {
    it("maps ZodError to 422 with the zod message as details", () => {
        const res = makeRes();
        let zodError: ZodError;
        try {
            z.object({ name: z.string() }).parse({});
            throw new Error("expected zod to throw");
        } catch (e) {
            zodError = e as ZodError;
        }

        errorHandler(zodError, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith({
            message: "Validation Failed",
            details: zodError.message,
        });
    });

    it("maps tsoa ValidateError to 422 with fields as details", () => {
        const res = makeRes();
        const fields = { amount: { message: "amount must be a valid integer", value: "abc" } };
        const err = new ValidateError(fields, "Validation failed");

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith({
            message: "Validation Failed",
            details: fields,
        });
    });

    it("maps AppError subclasses to their own statusCode", () => {
        const res = makeRes();
        const err = new NotFoundError("Balance abc not found.");

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "Balance abc not found.",
            details: "",
        });
    });

    it("maps a different AppError subclass to its own statusCode", () => {
        const res = makeRes();
        const err = new AuthorizationError("Not allowed.");

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("maps a PostgrestError via postgrestErrorToHttpStatus", () => {
        const res = makeRes();
        const err = new PostgrestError({
            message: "duplicate key value violates unique constraint",
            details: "Key already exists.",
            hint: "",
            code: "23505",
        });

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            message: err.message,
            details: err.details,
        });
    });

    it("does not crash on a PostgrestError with an undefined code, and falls back to 400", () => {
        const res = makeRes();
        const err = new PostgrestError({
            message: "something went wrong",
            details: "",
            hint: "",
            code: undefined as unknown as string,
        });

        expect(() => errorHandler(err, makeReq(), res, next)).not.toThrow();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("falls back to 500 with a generic message for an unrecognized error", () => {
        const res = makeRes();
        const err = new Error("something internal broke");

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "An internal error occurred" });
    });

    it("honors a duck-typed numeric `status` under 500, using the error's own message", () => {
        const res = makeRes();
        const err = { status: 418, message: "I'm a teapot" };

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(418);
        expect(res.json).toHaveBeenCalledWith({ message: "An internal error occurred" });
    });

    it("preserves the message of an Error instance with a duck-typed status under 500", () => {
        const res = makeRes();
        const err = Object.assign(new Error("bad request shape"), { status: 400 });

        errorHandler(err, makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "bad request shape" });
    });
});

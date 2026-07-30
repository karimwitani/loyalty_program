import express from "express";
import { ValidateError } from "tsoa";
import { ZodError } from "zod";
import { AppError } from "@/domain/errors/base.errors";
import { PostgrestError } from "@supabase/supabase-js";
import { postgrestErrorToHttpStatus } from "@/utils/postgres-error-handler";

export function errorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
): void {

  if (err instanceof ZodError){
    res.status(422).json({
      message: "Validation Failed",
      details: err?.message,
    });
    return;
  }

  if (err instanceof ValidateError) {
    console.warn(`Caught Validation Error for ${_req.path}:`, err.fields);
    res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
    return;
  }

  if (err instanceof AppError){
    console.error(`Error of type ${err.name}`);
    console.error(err);

    res.status(err.statusCode).json({
      message: err.message,
      details: '',
    });
    return;
  }


  if (err instanceof PostgrestError){
    const status = postgrestErrorToHttpStatus(err.code);
    res.status(status).json({
      message: err.message,
      details: err.details,
    });
    console.error(`Error of type ${err.name} code:${err.code} details: ${err.details} hint: ${err.hint} message: ${err.message}  ${_req.host} \n ${JSON.stringify(res.getHeaders())} \n ${res.statusCode} \n ${_req.url} \n ${JSON.stringify(_req.body)}`);
    return;
  }


  const status =
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as Record<string, unknown>).status === "number"
      ? ((err as Record<string, unknown>).status as number)
      : 500;

  const message =
    status < 500 && err instanceof Error
      ? err.message
      : "An internal error occurred";

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ message });
}

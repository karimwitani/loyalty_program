 
import { PostgrestError } from "@supabase/supabase-js";

export function toPostgrestError(error: any): PostgrestError {
  if (error instanceof PostgrestError) return error;
  return new PostgrestError({
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
}

const EXACT_CODE_TO_HTTP: Record<string, number> = {
  "23503": 409,  // foreign key violation
  "23505": 409,  // uniqueness violation
  "25006": 405,  // read only SQL transaction
  "42501": 403,  // insufficient privileges
  "42883": 404,  // undefined function
  "42P01": 404,  // undefined table
  "42P17": 500,  // infinite recursion
  "53400": 500,  // config limit exceeded
  "P0001": 400,  // default code for "raise"
};

const PREFIX_TO_HTTP: [string, number][] = [
  ["08", 503],  // connection error
  ["09", 500],  // triggered action exception
  ["0L", 403],  // invalid grantor
  ["0P", 403],  // invalid role specification
  ["25", 500],  // invalid transaction state
  ["28", 403],  // invalid auth specification
  ["2D", 500],  // invalid transaction termination
  ["38", 500],  // external routine exception
  ["39", 500],  // external routine invocation
  ["3B", 500],  // savepoint exception
  ["40", 500],  // transaction rollback
  ["53", 503],  // insufficient resources
  ["54", 500],  // too complex
  ["55", 500],  // obj not in prerequisite state
  ["57", 500],  // operator intervention
  ["58", 500],  // system error
  ["F0", 500],  // config file error
  ["HV", 500],  // foreign data wrapper error
  ["P0", 500],  // PL/pgSQL error
  ["XX", 500],  // internal error
];

export function postgrestErrorToHttpStatus(code: string | undefined | null): number {
  if (!code) return 400;

  const exact = EXACT_CODE_TO_HTTP[code];
  if (exact !== undefined) return exact;

  for (const [prefix, status] of PREFIX_TO_HTTP) {
    if (code.startsWith(prefix)) return status;
  }

  return 400;
}
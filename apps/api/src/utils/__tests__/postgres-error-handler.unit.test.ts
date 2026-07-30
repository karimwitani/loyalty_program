import { describe, expect, it } from "vitest";
import { PostgrestError } from "@supabase/supabase-js";

import { toPostgrestError, postgrestErrorToHttpStatus } from "@/utils/postgres-error-handler";

describe("toPostgrestError", () => {
    it("returns the same instance when already a PostgrestError", () => {
        const error = new PostgrestError({
            message: "boom",
            details: "details",
            hint: "hint",
            code: "23505",
        });

        expect(toPostgrestError(error)).toBe(error);
    });

    it("wraps a plain Error, carrying over an undefined code", () => {
        const error = new Error("plain error");

        const result = toPostgrestError(error);

        expect(result).toBeInstanceOf(PostgrestError);
        expect(result.message).toBe("plain error");
        expect(result.code).toBeUndefined();
    });

    it("wraps a Postgrest-shaped plain object, carrying over its code", () => {
        const error = { message: "fk violation", details: "d", hint: "h", code: "23503" };

        const result = toPostgrestError(error);

        expect(result.code).toBe("23503");
    });
});

describe("postgrestErrorToHttpStatus", () => {
    it.each([
        ["23503", 409],
        ["23505", 409],
        ["25006", 405],
        ["42501", 403],
        ["42883", 404],
        ["42P01", 404],
        ["42P17", 500],
        ["53400", 500],
        ["P0001", 400],
    ])("maps exact code %s to %i", (code, status) => {
        expect(postgrestErrorToHttpStatus(code)).toBe(status);
    });

    it.each([
        ["08006", 503],
        ["28000", 403],
        ["57014", 500],
        ["XX000", 500],
    ])("maps code %s via its class prefix to %i", (code, status) => {
        expect(postgrestErrorToHttpStatus(code)).toBe(status);
    });

    it("falls back to 400 for an unrecognized code", () => {
        expect(postgrestErrorToHttpStatus("99999")).toBe(400);
    });

    it("falls back to 400 when code is undefined", () => {
        expect(postgrestErrorToHttpStatus(undefined)).toBe(400);
    });

    it("falls back to 400 when code is null", () => {
        expect(postgrestErrorToHttpStatus(null)).toBe(400);
    });

    it("falls back to 400 when code is an empty string", () => {
        expect(postgrestErrorToHttpStatus("")).toBe(400);
    });
});

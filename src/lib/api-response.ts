import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

// Every API route returns ONE of these two shapes. The frontend never has
// to guess the response format — check `success` and TypeScript narrows
// the rest automatically.

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: { message: string; code: string; issues?: unknown } };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

function fail(message: string, status: number, code: string, issues?: unknown) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { message, code, issues } },
    { status }
  );
}

// Wrap every API route handler with this. Instead of a try/catch block
// repeated in every single route, throw AppError (or a subclass) anywhere
// in your service/logic layer and this turns it into the right HTTP
// response automatically — including Zod validation errors.
//
// Generic <C> covers dynamic route context (e.g. { params: { id: string } })
// for routes like app/api/prof/chapters/[id]/status/route.ts. Static
// routes can ignore the second argument entirely.
//
// Usage:
//   export const POST = withErrorHandler(async (req) => {
//     const body = await parseBody(req, createCourseSchema);
//     const course = await createCourse(body);
//     return ok(course, 201);
//   });
export function withErrorHandler<C = unknown>(
  handler: (req: Request, context: C) => Promise<NextResponse>
) {
  return async (req: Request, context: C) => {
    try {
      return await handler(req, context);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail("Invalid input", 422, "VALIDATION_ERROR", err.flatten());
      }
      if (err instanceof AppError) {
        return fail(err.message, err.statusCode, err.code);
      }
      // Never leak raw internal error messages/stack traces to the client.
      console.error("Unhandled API error:", err);
      return fail("Something went wrong", 500, "INTERNAL_ERROR");
    }
  };
}

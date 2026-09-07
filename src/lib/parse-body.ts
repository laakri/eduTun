import { z } from "zod";

// Parses and validates a request body against a Zod schema in one call.
// Throws ZodError on failure — caught automatically by withErrorHandler.
// This is your "server-side validation on every input" rule from the
// project rules doc, made into a one-liner so there's no excuse to skip it.
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  const json = await req.json();
  return schema.parse(json);
}

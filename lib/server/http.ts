import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { fieldErrorsFrom } from "@/lib/schemas/errors";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new HttpError(401, "Please sign in.");
export const forbidden = () => new HttpError(403, "You do not have permission to do that.");
export const notFound = (what = "Record") => new HttpError(404, `${what} not found.`);

export const fieldErrors = fieldErrorsFrom;

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "Please correct the highlighted fields.", fieldErrors(parsed.error));
  return parsed.data;
}

/**
 * Wraps a route handler: maps HttpError/ZodError to JSON responses and hides
 * everything else behind a generic 500 (details go to the server log only).
 */
export function route<Ctx>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, fields: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request.", fields: fieldErrors(err) }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export function ok<T>(data: T, status = 200): Response {
  return NextResponse.json(data, { status });
}

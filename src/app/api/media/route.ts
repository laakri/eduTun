import { z } from "zod";
import { NextResponse } from "next/server";
import { readFromBunnyStorage } from "@/lib/bunny";

// Covers need no storage-zone URL in the browser. The app reads the object
// server-side and returns only image bytes; Bunny credentials remain private.
export async function GET(req: Request) {
  const key = z.string().regex(/^courses\/[a-z0-9]+\/cover\.(jpg|jpeg|png|webp)$/).parse(new URL(req.url).searchParams.get("key"));
  const file = await readFromBunnyStorage(key);
  return new NextResponse(file.body, { headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=3600" } });
}

import { z } from "zod";
import { NextResponse } from "next/server";
import { readBunnyThumbnail } from "@/lib/bunny";

export async function GET(req: Request) {
  const videoId = z.string().uuid().parse(new URL(req.url).searchParams.get("videoId"));
  const image = await readBunnyThumbnail(videoId);
  return new NextResponse(image.body, { headers: { "Content-Type": image.contentType, "Cache-Control": "public, max-age=3600" } });
}

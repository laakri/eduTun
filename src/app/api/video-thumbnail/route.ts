import { z } from "zod";
import { NextResponse } from "next/server";
import { readBunnyThumbnail } from "@/lib/bunny";

const PLACEHOLDER_THUMBNAIL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="Video thumbnail processing"><rect width="640" height="360" fill="#e5e7eb"/><circle cx="320" cy="170" r="36" fill="#9ca3af"/><path d="M310 150l30 20-30 20z" fill="#f9fafb"/><text x="320" y="255" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="20">Video processing</text></svg>`;

export async function GET(req: Request) {
  const videoId = z
    .string()
    .uuid()
    .parse(new URL(req.url).searchParams.get("videoId"));
  try {
    const image = await readBunnyThumbnail(videoId);
    return new NextResponse(image.body, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("not available yet")
    ) {
      throw error;
    }

    return new NextResponse(PLACEHOLDER_THUMBNAIL, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=30",
      },
    });
  }
}

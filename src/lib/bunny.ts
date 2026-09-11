import crypto from "node:crypto";
import { ValidationError } from "@/lib/errors";

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID!;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY!;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME;
const BUNNY_STORAGE_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_CDN_HOST = process.env.BUNNY_CDN_HOSTNAME;
const BUNNY_STREAM_CDN_HOST =
  process.env.BUNNY_STREAM_CDN_HOSTNAME ?? `vz-${BUNNY_LIBRARY_ID}.b-cdn.net`;

type BunnyVideoResponse = {
  status: number;
  guid?: string;
  title?: string;
  length?: number;
  encodeProgress?: number;
  storageSize?: number;
  hasOriginal?: boolean;
  originalHash?: string | null;
  thumbnailFileName?: string | null;
  chapters?: Array<{ title: string; start: number; end: number }>;
  transcodingMessages?: Array<{
    level?: number;
    message?: string | null;
    value?: string | null;
  }>;
};

export type BunnyChapterPayload = {
  title: string;
  start: number;
  end: number;
};

// Step 1: reserve a video slot in Bunny before any bytes are uploaded.
// Bunny gives us back a videoId immediately - we store this on the
// Chapter row right away, so even if the upload itself fails partway,
// we always know which video a chapter is tied to.
export async function reserveBunnyVideo(title: string): Promise<string> {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: BUNNY_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    },
  );

  if (!res.ok) {
    throw new Error(`Bunny video reservation failed: ${res.status}`);
  }

  const data = await res.json();
  return data.guid as string;
}

/** Upload a complete, small/medium course video directly to Bunny Stream. */
export async function uploadBunnyVideo(videoId: string, body: ArrayBuffer) {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: "PUT",
      // Bunny Stream's direct endpoint consumes the raw file stream. Passing
      // a browser-specific MIME type can yield a 200 response but leave the
      // asset indefinitely queued at 0%; use the protocol's binary media type.
      headers: {
        AccessKey: BUNNY_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`Bunny video upload failed: ${res.status}`);
}

// Step 2: generate short-lived, signed credentials so the BROWSER can
// upload directly to Bunny via TUS - without ever seeing our real API
// key. The signature expires in 24 hours, and is only valid for this one
// videoId, so it can't be reused for anything else even if intercepted.
export function getTusUploadCredentials(videoId: string) {
  const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const signature = crypto
    .createHash("sha256")
    .update(`${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expiration}${videoId}`)
    .digest("hex");

  return {
    endpoint: "https://video.bunnycdn.com/tusupload",
    libraryId: BUNNY_LIBRARY_ID,
    videoId,
    authorizationSignature: signature,
    authorizationExpire: expiration,
  };
}

// Check processing status - Bunny transcodes after upload finishes.
// "status" values: 0=created, 1=uploaded, 2=processing, 3=transcoding,
// 4=finished, 5=error. We only care about "ready" vs "still working".
export async function getBunnyVideoStatus(videoId: string) {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    { headers: { AccessKey: BUNNY_API_KEY } },
  );

  if (!res.ok) {
    throw new Error(`Bunny status check failed: ${res.status}`);
  }

  const data = (await res.json()) as BunnyVideoResponse;
  const failed = data.status === 5 || data.status === 6;
  const storageSize = data.storageSize ?? 0;
  const notUploaded = !failed && data.status === 0;

  return {
    ready: data.status === 4,
    failed,
    notUploaded,
    status: data.status,
    encodeProgress: data.encodeProgress ?? 0,
    storageSize,
    length: data.length,
    hasOriginal: data.hasOriginal ?? false,
    originalHash: data.originalHash ?? null,
    durationSeconds: data.length,
    message:
      data.transcodingMessages?.find((item) => item.message)?.message ??
      (notUploaded
        ? `Bunny reports status ${data.status}, but no video bytes are stored yet.`
        : null),
    thumbnailUrl: data.thumbnailFileName
      ? `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net/${videoId}/${data.thumbnailFileName}`
      : null,
  };
}

/**
 * Read a Bunny-generated thumbnail through Bunny's own player origin.
 *
 * A Stream library's numeric ID is not its CDN hostname, and libraries can
 * restrict direct media requests by Referer. The embed page knows the correct
 * pull-zone hostname and is explicitly allowed to load its poster, so we use
 * it rather than guessing a `vz-${libraryId}` URL.
 */
export async function readBunnyThumbnail(videoId: string) {
  const embedUrl = getBunnyEmbedUrl(videoId);
  const page = await fetch(embedUrl);
  if (!page.ok) throw new Error(`Bunny player page failed: ${page.status}`);

  const markup = await page.text();
  const posterMatch = markup.match(/\bdata-poster="([^"]+)"/i);
  if (!posterMatch?.[1])
    throw new Error("Bunny thumbnail is not available yet.");

  const posterUrl = new URL(posterMatch[1]);
  if (
    posterUrl.protocol !== "https:" ||
    !posterUrl.hostname.endsWith(".b-cdn.net")
  ) {
    throw new Error("Bunny returned an invalid thumbnail URL.");
  }

  const res = await fetch(posterUrl, {
    headers: { Referer: "https://iframe.mediadelivery.net/" },
  });
  if (!res.ok) throw new Error(`Bunny thumbnail read failed: ${res.status}`);
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "image/jpeg",
  };
}

/** Studio / player embed URL for a Bunny Stream video. */
export function getBunnyEmbedUrl(videoId: string) {
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;
}

/** Native Bunny Stream HLS manifest used by the student player. */
export function getBunnyHlsUrl(videoId: string) {
  const hostname = BUNNY_STREAM_CDN_HOST.replace(/^https?:\/\//, "").replace(
    /\/$/,
    "",
  );

  return `https://${hostname}/${videoId}/playlist.m3u8`;
}

/** Push our VideoSection rows to Bunny as player chapters (timestamps). */
export async function syncBunnyVideoChapters(
  videoId: string,
  chapters: BunnyChapterPayload[],
) {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: "POST",
      headers: {
        AccessKey: BUNNY_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chapters }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Bunny chapter sync failed: ${res.status}${detail ? ` — ${detail.slice(0, 300)}` : ""}`,
    );
  }
}

function requireStorageConfig() {
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_KEY || !BUNNY_CDN_HOST) {
    throw new ValidationError(
      "File uploads are not configured yet. Add Bunny Storage credentials before uploading covers, PDFs, profile images, or verification documents.",
    );
  }

  return {
    zone: BUNNY_STORAGE_ZONE,
    key: BUNNY_STORAGE_KEY,
    cdnHost: BUNNY_CDN_HOST,
  };
}

/** Upload a file buffer to Bunny Storage. Returns the object key. */
export async function uploadToBunnyStorage(
  storageKey: string,
  body: Buffer | ArrayBuffer | Uint8Array,
  contentType: string,
) {
  const { zone, key } = requireStorageConfig();
  const payload =
    body instanceof ArrayBuffer
      ? new Uint8Array(body)
      : new Uint8Array(body.buffer, body.byteOffset, body.byteLength);

  const res = await fetch(
    `https://storage.bunnycdn.com/${zone}/${storageKey}`,
    {
      method: "PUT",
      headers: {
        AccessKey: key,
        "Content-Type": contentType,
      },
      body: payload as unknown as BodyInit,
    },
  );

  if (!res.ok) {
    throw new Error(`Bunny storage upload failed: ${res.status}`);
  }

  return storageKey;
}

export function getBunnyCdnUrl(storageKey: string) {
  const { cdnHost } = requireStorageConfig();
  return `https://${cdnHost}/${storageKey}`;
}

export function getBunnyStorageProxyUrl(storageKey: string) {
  return `/api/media?key=${encodeURIComponent(storageKey)}`;
}

export async function deleteFromBunnyStorage(storageKey: string) {
  const { zone, key } = requireStorageConfig();

  const res = await fetch(
    `https://storage.bunnycdn.com/${zone}/${storageKey}`,
    {
      method: "DELETE",
      headers: { AccessKey: key },
    },
  );

  if (!res.ok && res.status !== 404) {
    throw new Error(`Bunny storage delete failed: ${res.status}`);
  }
}

/** Read a stored object server-side without exposing the Storage API key. */
export async function readFromBunnyStorage(storageKey: string) {
  const { zone, key } = requireStorageConfig();
  const res = await fetch(
    `https://storage.bunnycdn.com/${zone}/${storageKey}`,
    {
      headers: { AccessKey: key },
    },
  );
  if (!res.ok) throw new Error(`Bunny storage read failed: ${res.status}`);
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
export async function deleteBunnyVideo(videoId: string) {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: "DELETE",
      headers: {
        AccessKey: BUNNY_API_KEY,
      },
    },
  );

  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => "");

    throw new Error(
      `Bunny video delete failed: ${res.status}${
        detail ? ` — ${detail.slice(0, 300)}` : ""
      }`,
    );
  }
}

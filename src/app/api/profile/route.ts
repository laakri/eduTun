import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { ok, withErrorHandler } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  deleteFromBunnyStorage,
  getBunnyStorageProxyUrl,
  uploadToBunnyStorage,
} from "@/lib/bunny";
import { ValidationError } from "@/lib/errors";

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional().nullable(),
});

function avatarUrlForClient(value: string | null) {
  if (!value) return null;
  const match = value.match(/(profiles\/[a-z0-9]+\/avatar-[a-f0-9-]+\.(?:jpg|jpeg|png|webp))/i);
  const storageKey = match?.[1];
  return storageKey ? getBunnyStorageProxyUrl(storageKey) : value;
}

function avatarStorageKey(value: string | null) {
  return value?.match(/(profiles\/[a-z0-9]+\/avatar-[a-f0-9-]+\.(?:jpg|jpeg|png|webp))/i)?.[1] ?? null;
}

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      roles: { include: { role: true } },
      coursesTaught: {
        select: {
          id: true,
          title: true,
          published: true,
          _count: { select: { chapters: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return ok({
    ...profile,
    avatarUrl: avatarUrlForClient(profile.avatarUrl),
    roles: profile.roles.map(({ role }) => role.slug),
  });
});

export const PATCH = withErrorHandler(async (req) => {
  const user = await requireUser();
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const input = profileSchema.parse(await req.json());
    const updated = await db.user.update({
      where: { id: user.id },
      data: { fullName: input.fullName, phone: input.phone || null },
      select: { id: true, fullName: true, phone: true, avatarUrl: true },
    });
    return ok({ ...updated, avatarUrl: avatarUrlForClient(updated.avatarUrl) });
  }
  const form = await req.formData();
  const file = form.get("avatar");
  if (
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new ValidationError("Upload a JPEG, PNG, or WebP profile image.");
  if (file.size > 4 * 1024 * 1024)
    throw new ValidationError("Profile image must be 4 MB or smaller.");
  const extension = file.type.split("/")[1] ?? "jpg";
  const key = `profiles/${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const previous = await db.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });
  await uploadToBunnyStorage(
    key,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  const updated = await db.user.update({
    where: { id: user.id },
    data: { avatarUrl: getBunnyStorageProxyUrl(key) },
    select: { id: true, fullName: true, phone: true, avatarUrl: true },
  });

  const previousKey = avatarStorageKey(previous?.avatarUrl ?? null);
  if (previousKey && previousKey !== key) {
    await deleteFromBunnyStorage(previousKey).catch((error) => {
      console.error("Could not delete previous profile avatar:", error);
    });
  }

  return ok(updated);
});

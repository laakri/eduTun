import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { ok, withErrorHandler } from "@/lib/api-response";
import { db } from "@/lib/db";
import { getBunnyCdnUrl, uploadToBunnyStorage } from "@/lib/bunny";
import { ValidationError } from "@/lib/errors";

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional().nullable(),
});

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true, createdAt: true, roles: { include: { role: true } }, coursesTaught: { select: { id: true, title: true, published: true, _count: { select: { chapters: true } } }, orderBy: { updatedAt: "desc" } } },
  });
  return ok({ ...profile, roles: profile.roles.map(({ role }) => role.slug) });
});

export const PATCH = withErrorHandler(async (req) => {
  const user = await requireUser();
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const input = profileSchema.parse(await req.json());
    return ok(await db.user.update({ where: { id: user.id }, data: { fullName: input.fullName, phone: input.phone || null }, select: { id: true, fullName: true, phone: true, avatarUrl: true } }));
  }
  const form = await req.formData();
  const file = form.get("avatar");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new ValidationError("Upload a JPEG, PNG, or WebP profile image.");
  if (file.size > 4 * 1024 * 1024) throw new ValidationError("Profile image must be 4 MB or smaller.");
  const extension = file.type.split("/")[1] ?? "jpg";
  const key = `profiles/${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  await uploadToBunnyStorage(key, Buffer.from(await file.arrayBuffer()), file.type);
  return ok(await db.user.update({ where: { id: user.id }, data: { avatarUrl: getBunnyCdnUrl(key) }, select: { id: true, fullName: true, phone: true, avatarUrl: true } }));
});

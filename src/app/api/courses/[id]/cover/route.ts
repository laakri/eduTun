import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getBunnyCdnUrl, uploadToBunnyStorage } from "@/lib/bunny";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const POST = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundError("Course");
    await assertCanEditCourse(course);

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Cover image is required.");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ValidationError("Cover must be JPEG, PNG, or WebP.");
    }

    const ext = file.type.split("/")[1] ?? "jpg";
    const bytes = Buffer.from(await file.arrayBuffer());
    const storageKey = `courses/${id}/cover.${ext}`;

    await uploadToBunnyStorage(storageKey, bytes, file.type);

    const updated = await db.course.update({
      where: { id },
      data: { coverImageKey: storageKey },
    });

    let coverImageUrl: string | null = null;
    try {
      coverImageUrl = getBunnyCdnUrl(storageKey);
    } catch {
      coverImageUrl = null;
    }

    return ok({ ...updated, coverImageUrl });
  },
);

import { assertCanEditCourse } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { uploadBunnyVideo } from "@/lib/bunny";

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

export const POST = withErrorHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const chapter = await db.chapter.findUnique({ where: { id }, include: { course: true } });
  if (!chapter) throw new NotFoundError("Chapter");
  await assertCanEditCourse(chapter.course);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("video/")) throw new ValidationError("Choose a video file.");
  if (file.size === 0 || file.size > MAX_VIDEO_BYTES) throw new ValidationError("Video must be between 1 byte and 250 MB.");
  await uploadBunnyVideo(chapter.videoId, await file.arrayBuffer());
  return ok({ uploaded: true });
});

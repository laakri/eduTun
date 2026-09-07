import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getBunnyCdnUrl, uploadToBunnyStorage } from "@/lib/bunny";

export const POST = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { course: true, resources: true },
    });

    if (!chapter) throw new NotFoundError("Chapter");
    await assertCanEditCourse(chapter.course);

    const form = await req.formData();
    const file = form.get("file");
    const titleField = form.get("title");

    if (!(file instanceof File)) {
      throw new ValidationError("PDF file is required.");
    }

    if (file.type !== "application/pdf") {
      throw new ValidationError("Only PDF files are allowed.");
    }

    const title =
      (typeof titleField === "string" && titleField.trim()) ||
      file.name.replace(/\.pdf$/i, "") ||
      "Resource";

    const bytes = Buffer.from(await file.arrayBuffer());
    const storageKey = `courses/${chapter.courseId}/chapters/${id}/${crypto.randomUUID()}.pdf`;

    await uploadToBunnyStorage(storageKey, bytes, "application/pdf");

    const resource = await db.chapterResource.create({
      data: {
        chapterId: id,
        title,
        kind: "pdf",
        storageKey,
        sizeBytes: bytes.length,
        contentType: "application/pdf",
        order: chapter.resources.length,
      },
    });

    let url: string | null = null;
    try {
      url = getBunnyCdnUrl(storageKey);
    } catch {
      url = null;
    }

    return ok({ ...resource, url }, 201);
  },
);

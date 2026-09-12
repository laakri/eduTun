"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FileText, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";

type Section = {
  id?: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  order: number;
};

type Resource = {
  id: string;
  title: string;
  sizeBytes: number | null;
  url: string | null;
};

type QuizQuestion = {
  id?: string;
  prompt: string;
  answers: Array<{ id?: string; text: string; isCorrect: boolean }>;
};

type Chapter = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  published: boolean;
  videoStatus: string;
  sections: Section[];
  resources: Resource[];
};

function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  }
  return fallback;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  const first = parts[0] ?? 0;
  const second = parts[1] ?? 0;
  if (parts.length === 1) return Math.max(0, Math.round(first));
  return Math.max(0, Math.round(first * 60 + second));
}

export default function EditChapterPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>();
  const toast = useToast();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/course-studio?courseId=${courseId}`);
        const json = await response.json();
        if (!response.ok) throw new Error(errorMessage(json, "Could not load chapter."));
        const data = (json.data?.chapters ?? []).find((item: Chapter) => item.id === chapterId) as Chapter | undefined;
        if (!data) throw new Error("Chapter not found.");
        if (!cancelled) {
          setChapter(data);
          setTitle(data.title);
          setDescription(data.description ?? "");
          setSections(data.sections ?? []);
          const quizResponse = await fetch(`/api/chapters/${chapterId}/quiz`);
          if (quizResponse.ok) {
            const quizJson = await quizResponse.json();
            setQuizTitle(quizJson.data?.title ?? "");
            setQuizQuestions(quizJson.data?.questions ?? []);
          }
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load chapter.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [chapterId, courseId]);

  function updateSection(index: number, field: "title" | "startSeconds" | "endSeconds", value: string) {
    setSections((current) => current.map((section, sectionIndex) => sectionIndex === index
      ? { ...section, [field]: field === "title" ? value : parseTime(value) }
      : section));
  }

  function addQuestion() {
    setQuizQuestions((current) => [
      ...current,
      { prompt: "", answers: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] },
    ]);
  }

  async function saveChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (title.trim().length < 2) {
      setError("Chapter title must be at least 2 characters.");
      return;
    }
    if (sections.some((section) => !section.title.trim() || section.endSeconds <= section.startSeconds)) {
      setError("Each timestamp needs a title and an end time after its start.");
      return;
    }
    setSaving(true);
    try {
      const chapterResponse = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      const chapterJson = await chapterResponse.json();
      if (!chapterResponse.ok) throw new Error(errorMessage(chapterJson, "Could not save chapter."));

      const sectionsResponse = await fetch(`/api/chapters/${chapterId}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: sections.map((section, index) => ({ ...section, title: section.title.trim(), order: index })) }),
      });
      const sectionsJson = await sectionsResponse.json();
      if (!sectionsResponse.ok) throw new Error(errorMessage(sectionsJson, "Could not save timestamps."));

      const quizResponse = await fetch(`/api/chapters/${chapterId}/quiz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quizTitle.trim() || "Lesson quiz", questions: quizQuestions }),
      });
      const quizJson = await quizResponse.json();
      if (!quizResponse.ok) throw new Error(errorMessage(quizJson, "Could not save quiz."));

      setChapter((current) => current ? { ...current, title: title.trim(), description: description.trim() || null, sections } : current);
      setNotice("Chapter changes saved.");
      toast("Chapter changes saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save chapter.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadResource(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.pdf$/i, ""));
      const response = await fetch(`/api/chapters/${chapterId}/resources`, { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) throw new Error(errorMessage(json, "Could not upload resource."));
      setChapter((current) => current ? { ...current, resources: [...current.resources, json.data] } : current);
      setNotice("Resource uploaded.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload resource.");
    } finally {
      setUploading(false);
    }
  }

  async function replaceVideo(file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file.");
      return;
    }
    if (file.size === 0 || file.size > 250 * 1024 * 1024) {
      setError("Video must be smaller than 250 MB.");
      return;
    }

    setVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/chapters/${chapterId}/video`, { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) throw new Error(errorMessage(json, "Could not replace video."));
      setChapter((current) => current ? { ...current, published: false, videoStatus: "PROCESSING" } : current);
      setNotice("Video uploaded and is processing. The chapter was returned to draft.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not replace video.");
    } finally {
      setVideoUploading(false);
    }
  }

  async function deleteResource(resourceId: string) {
    setError("");
    const response = await fetch(`/api/chapters/${chapterId}/resources/${resourceId}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) {
      setError(errorMessage(json, "Could not delete resource."));
      return;
    }
    setChapter((current) => current ? { ...current, resources: current.resources.filter((resource) => resource.id !== resourceId) } : current);
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  if (!chapter) return <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-destructive">{error || "Chapter not found."}</div>;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3"><Link href={`/courses/${courseId}`}><ArrowLeft className="size-4" />Back to course</Link></Button>
          <h1 className="text-3xl font-semibold tracking-tight">Edit chapter</h1>
          <p className="mt-2 text-sm text-muted-foreground">Shape the lesson students will follow.</p>
        </div>
        <Button type="submit" form="chapter-edit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save</Button>
      </div>

      <form id="chapter-edit" onSubmit={saveChapter} className="space-y-10">
        <section className="space-y-5">
          <div className="space-y-2"><Label htmlFor="chapter-title">Title</Label><Input id="chapter-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /></div>
          <div className="space-y-2"><Label htmlFor="chapter-description">Description</Label><textarea id="chapter-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={5} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="What does this lesson cover?" /></div>
          <p className="text-xs text-muted-foreground">Video status: {chapter.videoStatus.toLowerCase()}</p>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              {videoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {videoUploading ? "Uploading video..." : "Replace video"}
              <input type="file" accept="video/*" className="hidden" disabled={videoUploading} onChange={(event) => void replaceVideo(event.target.files?.[0])} />
            </label>
            <span className="text-xs text-muted-foreground">Video files up to 250 MB. Processing may take a few minutes.</span>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Timestamps</h2><p className="mt-1 text-sm text-muted-foreground">Help students jump to important moments in the video.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setSections((current) => [...current, { title: "", startSeconds: 0, endSeconds: 60, order: current.length }])}><Plus className="size-4" />Add</Button></div>
          <div className="space-y-3">
            {sections.map((section, index) => <div key={section.id ?? `new-${index}`} className="grid gap-3 sm:grid-cols-[1fr_100px_100px_auto] sm:items-end"><div className="space-y-2"><Label htmlFor={`section-title-${index}`}>Title</Label><Input id={`section-title-${index}`} value={section.title} onChange={(event) => updateSection(index, "title", event.target.value)} placeholder="Introduction" /></div><div className="space-y-2"><Label htmlFor={`section-start-${index}`}>Start</Label><Input id={`section-start-${index}`} value={formatTime(section.startSeconds)} onChange={(event) => updateSection(index, "startSeconds", event.target.value)} /></div><div className="space-y-2"><Label htmlFor={`section-end-${index}`}>End</Label><Input id={`section-end-${index}`} value={formatTime(section.endSeconds)} onChange={(event) => updateSection(index, "endSeconds", event.target.value)} /></div><Button type="button" variant="ghost" size="icon" aria-label="Remove timestamp" onClick={() => setSections((current) => current.filter((_, sectionIndex) => sectionIndex !== index))}><Trash2 className="size-4" /></Button></div>)}
            {sections.length === 0 && <p className="text-sm text-muted-foreground">No timestamps yet.</p>}
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold">Quiz</h2><p className="mt-1 text-sm text-muted-foreground">Check understanding after the lesson.</p></div>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}><Plus className="size-4" />Question</Button>
          </div>
          <Input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Quiz title" />
          <div className="space-y-5">
            {quizQuestions.map((question, questionIndex) => (
              <div key={question.id ?? `question-${questionIndex}`} className="space-y-3 border-l-2 border-border pl-4">
                <div className="flex gap-2">
                  <Input value={question.prompt} onChange={(event) => setQuizQuestions((current) => current.map((item, index) => index === questionIndex ? { ...item, prompt: event.target.value } : item))} placeholder={`Question ${questionIndex + 1}`} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => setQuizQuestions((current) => current.filter((_, index) => index !== questionIndex))}><Trash2 className="size-4" /></Button>
                </div>
                {question.answers.map((answer, answerIndex) => (
                  <div key={answer.id ?? `answer-${answerIndex}`} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${questionIndex}`} checked={answer.isCorrect} onChange={() => setQuizQuestions((current) => current.map((item, index) => index === questionIndex ? { ...item, answers: item.answers.map((choice, choiceIndex) => ({ ...choice, isCorrect: choiceIndex === answerIndex })) } : item))} />
                    <Input value={answer.text} onChange={(event) => setQuizQuestions((current) => current.map((item, index) => index === questionIndex ? { ...item, answers: item.answers.map((choice, choiceIndex) => choiceIndex === answerIndex ? { ...choice, text: event.target.value } : choice) } : item))} placeholder="Answer choice" />
                  </div>
                ))}
              </div>
            ))}
            {quizQuestions.length === 0 && <p className="text-sm text-muted-foreground">No quiz questions yet.</p>}
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Resources</h2><p className="mt-1 text-sm text-muted-foreground">Attach PDF notes, worksheets, or references.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><FileText className="size-4" />{uploading ? "Uploading..." : "Upload PDF"}<input type="file" accept="application/pdf" className="hidden" disabled={uploading} onChange={(event) => void uploadResource(event.target.files?.[0])} /></label></div>
          <div className="divide-y divide-border border-y border-border">{chapter.resources.map((resource) => <div key={resource.id} className="flex items-center justify-between gap-3 py-3"><a href={resource.url ?? "#"} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm hover:text-primary"><FileText className="size-4 shrink-0" /><span className="truncate">{resource.title}</span></a><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${resource.title}`} onClick={() => void deleteResource(resource.id)}><Trash2 className="size-4 text-destructive" /></Button></div>)}{chapter.resources.length === 0 && <p className="py-4 text-sm text-muted-foreground">No resources yet.</p>}</div>
        </section>

        {(error || notice) && <p className={error ? "text-sm text-destructive" : "text-sm text-primary"} role="status">{error || notice}</p>}
      </form>
    </main>
  );
}
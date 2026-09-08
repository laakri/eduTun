"use client";

import { useState, type FormEvent } from "react";
import { Mail, MessageCircle, MapPin, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@edutun.com",
    href: "mailto:hello@edutun.com",
  },
  {
    icon: MessageCircle,
    label: "Support",
    value: "Usually replies within a day",
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Tunis, Tunisia",
  },
];

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-primary">Contact</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Get in touch
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Question about a course, a billing issue, or interested in teaching on EduTun? Send us
          a message and we&apos;ll get back to you.
        </p>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_320px]">
        {/* FORM */}
        <div>
          {status === "success" ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-muted px-6 py-10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-base font-medium text-foreground">Message sent</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thanks for reaching out. We&apos;ll reply at the email you gave us.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setStatus("idle")}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Yassine Trabelsi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Question about a course"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us what's going on, the more detail the better."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              {status === "error" && (
                <p className="text-sm text-destructive">
                  Something went wrong sending your message. Please try again.
                </p>
              )}

              <Button type="submit" disabled={status === "submitting"} className="gap-2">
                {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
                Send message
              </Button>
            </form>
          )}
        </div>

        {/* CONTACT INFO */}
        <div className="flex flex-col gap-6 border-t border-muted pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-muted text-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                {href ? (
                  <a href={href} className="text-sm text-foreground hover:text-primary transition">
                    {value}
                  </a>
                ) : (
                  <div className="text-sm text-foreground">{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
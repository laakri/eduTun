"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDefaultAppPath } from "@/lib/nav";

type Mode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.2Z"
      />
      <path
        fill="#34A853"
        d="M12 21.68c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.68Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.77A5.86 5.86 0 0 1 6.23 12c0-.61.11-1.2.3-1.77V7.7H3.29A9.76 9.76 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.3l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.2c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.28 14.63 2.32 12 2.32a9.75 9.75 0 0 0-8.71 5.38l3.24 2.53C7.3 7.92 9.46 6.2 12 6.2Z"
      />
    </svg>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = useMemo<Mode>(() => {
    return searchParams.get("mode") === "signup" ? "signup" : "login";
  }, [searchParams]);

  const isSignup = mode === "signup";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setMode(nextMode: Mode) {
    if (nextMode === mode || isSubmitting) {
      return;
    }

    setError("");

    router.replace(
      nextMode === "signup"
        ? "/register?mode=signup"
        : "/register?mode=login",
    );
  }

  async function afterSuccessfulAuth() {
    const sessionResponse = await fetch("/api/auth/session", {
      cache: "no-store",
    });

    const session = await sessionResponse.json();

    const destination = getDefaultAppPath(session?.user?.roles ?? []);

    router.push(destination);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await signIn("google", {
        callbackUrl: "/",
      });
    } catch {
      setError("Unable to continue with Google.");
      setIsSubmitting(false);
    }
  }

  async function handleLogin() {
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (!result || result.error) {
      throw new Error("Invalid email or password.");
    }

    await afterSuccessfulAuth();
  }

  async function handleSignup() {
    if (fullName.trim().length < 2) {
      throw new Error("Please enter your full name.");
    }

    if (password.length < 8) {
      throw new Error("Your password must contain at least 8 characters.");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Unable to create your account.");
    }

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (!result || result.error) {
      throw new Error("Your account was created, but sign in failed.");
    }

    await afterSuccessfulAuth();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await handleSignup();
      } else {
        await handleLogin();
      }
    } catch (submitError: unknown) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Something went wrong. Please try again.");
      }

      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1fr_440px] lg:gap-24">
          {/* Desktop introduction */}
          <div className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-8 h-1 w-10 rounded-full bg-primary" />

              <h1 className="text-5xl font-semibold tracking-tight">
                {isSignup ? (
                  <>
                    Your next step
                    <br />
                    starts here.
                  </>
                ) : (
                  <>
                    Welcome
                    <br />
                    back.
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                {isSignup
                  ? "Create your account and start building your learning experience."
                  : "Continue your courses, track your progress, and keep learning."}
              </p>
            </div>
          </div>

          {/* Auth */}
          <div className="w-full">
            {/* Mobile introduction */}
            <div className="mb-8 lg:hidden">
              <div className="mb-6 h-1 w-10 rounded-full bg-primary" />

              <h1 className="text-3xl font-semibold tracking-tight">
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                {isSignup
                  ? "Create an account to get started."
                  : "Sign in to continue."}
              </p>
            </div>

            {/* Fixed-height auth container */}
            <div className="h-[620px]">
              {/* Mode switch */}
              <div className="relative mb-7 grid grid-cols-2 border-b">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  disabled={isSubmitting}
                  className={`relative z-10 pb-3 text-sm font-medium transition-colors duration-200 ${
                    !isSignup
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  disabled={isSubmitting}
                  className={`relative z-10 pb-3 text-sm font-medium transition-colors duration-200 ${
                    isSignup
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create account
                </button>

                {/* Sliding indicator */}
                <div
                  className={`absolute bottom-[-1px] h-0.5 w-1/2 bg-primary transition-transform duration-300 ease-out ${
                    isSignup ? "translate-x-full" : "translate-x-0"
                  }`}
                />
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex h-[570px] flex-col"
              >
                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="group flex h-12 w-full items-center justify-center rounded-xl border border-border/70 bg-background text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm disabled:pointer-events-none disabled:opacity-60"
                >
                  <GoogleIcon />

                  <span className="ml-2">
                    {isSignup
                      ? "Sign up with Google"
                      : "Continue with Google"}
                  </span>
                </button>

                {/* Small separator */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />

                  <span className="text-[11px] text-muted-foreground">
                    OR
                  </span>

                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  {/* Full name */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isSignup
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="group relative">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />

                        <Input
                          value={fullName}
                          onChange={(event) =>
                            setFullName(event.target.value)
                          }
                          placeholder="Full name"
                          autoComplete="name"
                          disabled={isSubmitting}
                          tabIndex={isSignup ? 0 : -1}
                          className="h-14 rounded-xl border-border/70 bg-muted/30 pl-11 shadow-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />

                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email address"
                      autoComplete="email"
                      disabled={isSubmitting}
                      className="h-14 rounded-xl border-border/70 bg-muted/30 pl-11 shadow-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                    />
                  </div>

                  {/* Password */}
                  <div className="group relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />

                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      autoComplete={
                        isSignup ? "new-password" : "current-password"
                      }
                      disabled={isSubmitting}
                      className="h-14 rounded-xl border-border/70 bg-muted/30 pl-11 pr-12 shadow-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={isSubmitting}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Confirm password */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isSignup
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="group relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />

                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Confirm password"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          tabIndex={isSignup ? 0 : -1}
                          className="h-14 rounded-xl border-border/70 bg-muted/30 pl-11 pr-12 shadow-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/40 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((value) => !value)
                          }
                          disabled={isSubmitting}
                          tabIndex={isSignup ? 0 : -1}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Signup hint */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isSignup
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-1 pt-0.5 text-xs text-muted-foreground">
                        Use at least 8 characters for your password.
                      </p>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                </div>

                {/* Bottom action */}
                <div className="mt-auto pt-8">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="group h-14 w-full rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <span>
                      {isSubmitting
                        ? isSignup
                          ? "Creating account..."
                          : "Signing in..."
                        : isSignup
                          ? "Create account"
                          : "Sign in"}
                    </span>

                    {!isSubmitting && (
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    )}
                  </Button>

                  <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link
                      href="/terms"
                      className="underline underline-offset-2 transition-colors hover:text-foreground"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="underline underline-offset-2 transition-colors hover:text-foreground"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}

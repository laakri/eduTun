import Link from "next/link";
import { ArrowRight, FlaskConical, ShieldCheck, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const accounts = [
  ["Student", "student@test.com", "Browse the Baccalauréat pack; it already has complimentary access.", UserRound],
  ["Professor", "prof@test.com", "Open the professor workspace and create a course with Bunny uploads.", FlaskConical],
  ["Admin", "admin@test.com", "Review professor applications and approve or reject them.", ShieldCheck],
] as const;

export default function TestPage() { return <main className="mx-auto max-w-5xl px-6 py-14"><p className="text-sm font-medium text-primary">DEMO ENVIRONMENT</p><h1 className="mt-2 text-3xl font-bold">Test the platform&apos;s main flows</h1><p className="mt-3 max-w-2xl text-muted-foreground">Use the login button in the navigation with password <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">password123</code>. Seed the database first if these accounts do not exist.</p><div className="mt-10 grid gap-5 md:grid-cols-3">{accounts.map(([title, email, description, Icon]) => <Card key={email} className="p-6"><Icon className="size-6 text-primary"/><h2 className="mt-4 font-semibold">{title} account</h2><p className="mt-1 text-sm font-medium">{email}</p><p className="mt-3 min-h-16 text-sm text-muted-foreground">{description}</p><Button asChild className="mt-5" variant="outline"><Link href={title === "Student" ? "/packs" : title === "Professor" ? "/dashboard" : "/admin/professor-applications"}>Open flow <ArrowRight className="size-4"/></Link></Button></Card>)}</div><p className="mt-8 text-sm text-muted-foreground">Run <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">npx prisma db seed</code> once after applying the migration.</p></main>; }

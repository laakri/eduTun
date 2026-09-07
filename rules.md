# Tunisia Education Platform — Project Rules & Guidelines

## 1. Project overview

A **general-purpose** education platform for Tunisian students — not hardcoded to Bac, PFE, or any single domain. The platform's job is to host and sell educational content organized into flexible **categories**, which can be bundled into **packs**.

Bac prep, PFE matching, orientation guidance, coding bootcamps, language courses, professional certifications — none of these are special cases in the code. They are all just **categories** created as data. If you want a pack that contains "Bac Maths + Intro to Coding," that's an admin action (create a pack, attach two categories/courses to it) — never a schema change or a deploy.

Users can hold multiple roles (student, prof, company, admin) on the same account.

**Litmus test for every design decision from here on**: if adding a new content domain (say, "Professional English Certification" next year) would require touching the schema or writing new model code, the design is wrong. It should only ever require inserting rows.

## 2. Tech stack (locked decisions)

| Layer               | Choice                       | Why                                               |
| ------------------- | ---------------------------- | ------------------------------------------------- |
| Frontend + backend  | Next.js (React)              | One codebase, one deploy, solo-friendly           |
| Styling             | Tailwind CSS                 | Fast to build, no custom CSS sprawl               |
| Data fetching/cache | React Query (TanStack Query) | Handles loading/caching state                     |
| Database            | PostgreSQL                   | Relational fits our connected data model          |
| ORM                 | Prisma                       | Type-safe queries, manageable migrations          |
| Auth                | Clerk or NextAuth (Auth.js)  | Don't build auth yourself — security-critical     |
| Video hosting       | Bunny Stream                 | Signed URLs, chapters, transcoding, affordable    |
| File/PDF storage    | Bunny Storage + Bunny CDN    | Same provider as video, simple to manage          |
| Payments            | Konnect or Flouci            | Tunisian gateways — Stripe doesn't payout locally |
| Hosting (app)       | Vercel                       | Built for Next.js, simple deploys                 |
| Hosting (DB)        | Railway / Neon / Supabase    | Managed Postgres, free tier to start              |

Do not introduce a new major dependency (new DB, new auth provider, new hosting platform) without deliberately revisiting this table — consistency here is what keeps a solo build maintainable.

## 3. Core schema principle — the rule that governs everything

> **If a non-developer (admin, content manager) should be able to add, rename, or remove a value without a code deploy, it lives in the database as a row (a lookup table). If only code logic cares about the value and only a developer would ever add a new one, it can stay a plain validated string/field.**

Applied so far:

- `Role`, `Category`, `Tag` → lookup tables (rows), not enums
- `Chapter.videoProvider` → plain string ("bunny" | "youtube") so swapping providers never touches the schema
- `PfeApplication.status` → plain string, deliberately NOT a lookup table, because it's tied to fixed business logic only a developer extends

Before adding any new categorical field, ask: **"Will someone other than me need to add a new value to this list?"** Yes → lookup table. No → plain field.

**Important revision**: `Subject`, `Filiere`, and `FormationType` are no longer separate fixed tables (see section 4 below). They were themselves a violation of this rule — three hardcoded "kinds of category," when Bac, PFE, coding, languages, and anything added later should all be the same underlying concept. They're replaced by one generic, self-referencing `Category` table.

## 4. Domain-agnostic content model — Categories & Packs

This is the section that directly enables "add Bac, add PFE, add coding, bundle any of them into a pack" without ever touching code.

### Category — one generic, self-referencing table

Instead of separate `Subject` / `Filiere` / `FormationType` tables, there is **one** `Category` table with a `parentId` pointing back to itself. This lets you represent any hierarchy as data:

```
Bac (top-level category)
 └── Sciences Experimentales (child)
      └── Maths (child)
      └── Physique (child)
 └── Economie & Gestion (child)

PFE (top-level category)
 └── Informatique (child)
 └── Génie Civil (child)

Coding (top-level category)
 └── Web Development (child)
 └── Data Science (child)
```

Adding "Professional English Certification" next year is one admin action: insert a `Category` row. No migration, no new model, no deploy.

### Course/Content — linked to categories via a join table, not fixed foreign keys

A `Course` (or any content item — PFE listing, coding bootcamp module, language pack) attaches to **one or more** categories through a many-to-many join table (`CourseCategory`), not a rigid `subjectId`/`filiereId`/`formationTypeId` set of columns. This means:

- A single course can live under both "Bac > Maths" and "Coding" if it genuinely spans both
- Filtering/browsing by category works identically regardless of domain — the frontend never needs domain-specific logic

### Pack — a bundle of anything, defined as data

A `Pack` is a named bundle (e.g. "Bac + Coding Starter Pack") that groups together any mix of `Course`s and/or `Category`s via a `PackItem` join table. Buying/enrolling in a pack grants access to everything inside it.

```
Pack: "Bac + Coding Starter Pack"
 ├── PackItem → Category: Bac > Sciences Experimentales
 └── PackItem → Category: Coding > Web Development
```

Creating a new pack is: create a `Pack` row, attach `PackItem` rows pointing at existing categories or courses. Never new code.

### What stays a distinct model (and why)

`PfeListing`/`PfeApplication` remain their own models rather than being folded into `Course`, because their _shape_ is fundamentally different — a listing/application workflow (company posts, student applies, status changes) isn't "content to watch," it's a two-sided marketplace interaction. They still attach to `Category` (e.g. "PFE > Informatique") for consistent browsing/filtering, but the workflow itself needs its own table. The rule isn't "everything is one table" — it's "don't hardcode domains as separate category tables." A genuinely different _kind_ of interaction still deserves its own model.

## 5. Multi-role architecture

- Roles are a many-to-many relationship (`UserRole` join table), not a single `role` column on `User`
- One person can be `student` + `prof` simultaneously (e.g. a graduate who now tutors)
- Never gate a feature by checking `user.role === "prof"` — always check membership in the roles relation
- New roles (e.g. `mentor`, `moderator`) are added via a database insert, never a code change

## 6. Video & content rules

- Videos are uploaded **once** as a single file — chapters/sections are timestamps (Bunny's Chapters/Moments feature), never physically cut files
- Playback always goes through a signed, expiring URL requested from the backend — never expose a raw/static video URL to the client
- Free/trust-building content can start on YouTube Unlisted if needed, but anything a prof considers paid or valuable goes on Bunny Stream from day one
- PDFs (épreuves, notes) go in Bunny Storage, served via Bunny CDN

## 7. Onboarding rules (product policy, not code, but relevant to what you build)

- Profs are manually vetted and onboarded by you at first — no open self-signup until there's moderation capacity
- Launch narrow: one filière + one subject with 2–3 strong profs before expanding
- Build the "become a teacher" self-service application flow, but keep it behind an approval step (`status: pending/approved/rejected` on a `ProfApplication`-style flow) — don't auto-publish new prof accounts

## 8. Coding conventions

**Naming**

- Database tables/models: `PascalCase` singular (`User`, `Course`, `PfeListing`)
- Fields: `camelCase` (`createdAt`, `videoProvider`)
- Lookup table slugs: lowercase, hyphenated (`sciences-experimentales`, `bac`)
- API routes: `kebab-case` (`/api/pfe-listings`)
- React components: `PascalCase` files (`CourseCard.tsx`)
- Non-component utility files: `camelCase` (`formatDuration.ts`)

**Folder structure (suggested)**

```
/app                  → Next.js routes (pages + API routes)
/components           → shared React components
/lib                  → helper functions, API clients (Bunny, Konnect, etc.)
/prisma               → schema.prisma, migrations
/types                → shared TypeScript types
```

**General rules**

- TypeScript everywhere — no plain `.js` files in the app, types catch schema mismatches early
- Never write raw SQL unless Prisma genuinely can't express the query — keep one source of truth for schema
- Every API route that touches user data checks the caller's role/ownership before returning data — no relying on the frontend to hide anything
- Environment secrets (`DATABASE_URL`, Bunny API keys, Konnect keys) only in `.env`, never committed — add `.env` to `.gitignore` immediately
- Server-side validation on every form input, even if the frontend also validates — never trust client input alone

**Git workflow**

- `main` branch always deployable
- Feature branches per module (`feature/pfe-matching`, `feature/quiz-engine`)
- Commit messages describe intent, not just file names (`add signed URL endpoint for chapter playback`, not `update api.ts`)

## 9. Security checklist (non-negotiable)

- All passwords handled by the auth provider (Clerk/NextAuth) — never store or hash passwords yourself
- All payment handling happens through Konnect/Flouci's hosted flow — never store raw card data
- All video/PDF access checks the user's enrollment/permission server-side before issuing a signed URL
- Rate-limit signup, login, and quiz-submission endpoints to prevent abuse
- Sanitize any user-generated content (forum posts, prof bios) before rendering to prevent XSS

## 10. What's intentionally deferred (don't build yet)

- Live streaming — recorded content only for MVP; live Q&A can come later as a scheduled feature, not full live-lecture infrastructure
- Open self-service prof signup — manual onboarding first
- DRM/watermarking on video — add only once profs specifically raise piracy concerns
- Mobile app — web first, mobile later once the web product is validated

## 11. Open decisions still to make

- [ ] Final choice: Clerk vs NextAuth
- [ ] Final choice: Konnect vs Flouci (compare fees, integration ease)
- [ ] Bilingual (FR/AR) vs trilingual (FR/AR/EN) — affects i18n setup from day one
- [ ] Branding/name
- [ ] Revenue share model for profs (%, subscription vs pay-per-course)
- [ ] Pack pricing model — is a pack priced independently of its parts, or is it just "access to everything inside," with price computed from included items?
- [ ] How deep can `Category` nesting go in practice — is 2 levels (top-level + one child) enough for the UI, or do we need arbitrary depth?

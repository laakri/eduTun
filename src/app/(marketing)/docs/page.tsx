import Link from "next/link";

const SECTIONS = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        heading: "Create an account",
        body: "Sign up with your email and password, or continue with a social login if one is enabled. You'll land on your dashboard, which stays empty until you enroll in a course.",
      },
      {
        heading: "Find a course",
        body: "Use the search bar in the top navigation to look up a subject, or browse by category from the Packs page. Each course page shows its chapters, the professor teaching it, and whether it includes a test at the end.",
      },
      {
        heading: "Enroll",
        body: "Open a course and select Enroll. Free courses unlock immediately; paid courses ask for payment first. Once enrolled, the course appears on your dashboard.",
      },
    ],
  },
  {
    id: "for-students",
    title: "For students",
    items: [
      {
        heading: "Tracking progress",
        body: "Every chapter you complete is marked automatically. Your dashboard shows overall progress per course, so you can pick up exactly where you left off.",
      },
      {
        heading: "Taking practice tests",
        body: "Courses with a test component include practice questions after relevant chapters. These don't affect your final grade and can be retaken as many times as you like.",
      },
      {
        heading: "Updating your profile",
        body: "Go to Profile from the account menu to update your name, phone number, or profile photo. Your email is tied to your login and can't be changed from there.",
      },
    ],
  },
  {
    id: "for-professors",
    title: "For professors",
    items: [
      {
        heading: "Applying to teach",
        body: "Submit an application from the Become a professor page. We review each application manually, usually within a few business days, and email you once it's approved.",
      },
      {
        heading: "Creating a course",
        body: "From your dashboard, select New course, then add a title, description, and cover image. A course starts as a draft and is only visible to you until you publish it.",
      },
      {
        heading: "Adding chapters",
        body: "Each course is broken into chapters. Add video, text, or attachments to a chapter, and reorder chapters by dragging them in the course editor.",
      },
      {
        heading: "Publishing",
        body: "A course needs at least one chapter with content before it can be published. Once published, it's visible in search and on your public profile.",
      },
    ],
  },
  {
    id: "test-platform",
    title: "Test platform",
    items: [
      {
        heading: "How exams work",
        body: "Timed exams run in a distraction-free view separate from the course pages. Once started, a timer runs continuously, and the exam auto-submits when time runs out.",
      },
      {
        heading: "Scoring",
        body: "Multiple-choice questions are graded automatically. Written answers, if a course includes them, are graded by the professor and may take longer to appear.",
      },
      {
        heading: "Retakes",
        body: "Whether an exam can be retaken depends on the course settings. If retakes are allowed, your highest score is the one that counts.",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & payments",
    items: [
      {
        heading: "Payment methods",
        body: "Paid courses can be purchased individually or through a course pack that bundles several at a discount. Accepted payment methods are shown at checkout.",
      },
      {
        heading: "Refunds",
        body: "If a course isn't what you expected, contact us within 7 days of purchase and before completing more than 20% of the content, and we'll issue a refund.",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    items: [
      {
        heading: "Can I access courses offline?",
        body: "Not currently. Course content requires an internet connection, though this is on our roadmap.",
      },
      {
        heading: "Can I switch from student to professor?",
        body: "Yes. Your student account stays intact, and a professor application simply adds teaching permissions on top of it.",
      },
      {
        heading: "Still stuck?",
        body: "Reach out from the Contact page and we'll get back to you directly.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Documentation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Everything you need to know about using EduTun.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A guide for students finding and studying courses, and for professors publishing them.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
        {/* SIDEBAR - desktop */}
        <aside className="hidden lg:block">
          <nav className="sticky top-[4.5rem] flex flex-col gap-1">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* MOBILE JUMP LINKS */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-muted px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground"
            >
              {section.title}
            </a>
          ))}
        </div>

        {/* CONTENT */}
        <div className="min-w-0">
          {SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className={index === 0 ? "scroll-mt-20" : "mt-14 scroll-mt-20 border-t border-muted pt-14"}
            >
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>

              <div className="mt-6 flex flex-col gap-6">
                {section.items.map((item) => (
                  <div key={item.heading}>
                    <h3 className="text-sm font-medium text-foreground">{item.heading}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* FOOTER CTA */}
          <div className="mt-16 flex flex-col items-start gap-4 rounded-lg border border-muted px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">Didn&apos;t find what you needed?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send us a message and we&apos;ll help you sort it out.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 rounded-md border border-muted px-4 py-2 text-sm text-foreground transition hover:bg-muted/50"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    label: "Profile",
    description: "",
    href: "/settings/profile",
    icon: UserRound,
    available: true,
  },
  {
    label: "Notifications",
    description: "",
    href: "/settings/notifications",
    icon: Bell,
    available: true,
  },
  {
    label: "Security",
    description: "Password and sign-in",
    icon: ShieldCheck,
    available: false,
  },
  {
    label: "Appearance",
    description: "Theme preferences",
    icon: Palette,
    available: false,
  },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 sm:px-6 lg:grid-cols-[170px_minmax(0,1fr)] lg:gap-12">
      <aside className="pt-8 lg:pt-12">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Account
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Settings</h1>
        </div>

        <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;

            if (section.available) {
              return (
                <Link
                  key={section.label}
                  href={section.href}
                  className="group flex min-w-[180px] items-center gap-3 rounded-md py-2.5 text-sm text-foreground transition-colors hover:text-primary lg:min-w-0"
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{section.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {section.description}
                    </span>
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            }

            return (
              <div
                key={section.label}
                className="flex min-w-[180px] items-center gap-3 py-2.5 text-sm text-muted-foreground/60 lg:min-w-0"
                aria-disabled="true"
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{section.label}</span>
                  <span className="mt-0.5 block truncate text-xs">Coming soon</span>
                </span>
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">{children}</section>
    </div>
  );
}
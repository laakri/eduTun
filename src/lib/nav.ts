import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FolderTree,
  LayoutDashboard,
  PlusCircle,
  Settings,
} from "lucide-react";

import { canManageCourses } from "@/core/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** If set, item shows only when the user has one of these roles. */
  roles?: string[];
  /** If true, requires canManageCourses (prof/admin/…). */
  courseManager?: boolean;
};

const BASE_NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    title: "New course",
    href: "/courses/new",
    icon: PlusCircle,
    courseManager: true,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function getNavForRoles(roles: string[]): NavItem[] {
  return BASE_NAV.filter((item) => {
    if (item.courseManager && !canManageCourses(roles)) return false;
    if (item.roles && !item.roles.some((role) => roles.includes(role))) {
      return false;
    }
    return true;
  });
}

/** Post-login landing based on roles (extend as roles grow). */
export function getDefaultAppPath(roles: string[]): string {
  if (canManageCourses(roles)) return "/courses";
  if (roles.includes("admin")) return "/admin/categories";
  return "/dashboard";
}

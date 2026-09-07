/**
 * Roles that can create/edit courses. Add new manager roles here —
 * routes stay global (/courses/…); access is membership-based.
 */
export const COURSE_MANAGER_ROLES = ["prof", "admin"] as const;

export type CourseManagerRole = (typeof COURSE_MANAGER_ROLES)[number];

export function hasAnyRole(
  userRoles: string[] | undefined,
  allowed: readonly string[],
): boolean {
  if (!userRoles?.length) return false;
  return allowed.some((role) => userRoles.includes(role));
}

export function canManageCourses(userRoles: string[] | undefined): boolean {
  return hasAnyRole(userRoles, COURSE_MANAGER_ROLES);
}

export function canEditCourse(
  user: { id: string; roles: string[] },
  course: { profId: string },
): boolean {
  if (user.roles.includes("admin")) return true;
  if (!canManageCourses(user.roles)) return false;
  return course.profId === user.id;
}

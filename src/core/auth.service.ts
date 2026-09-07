import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import {
  COURSE_MANAGER_ROLES,
  canEditCourse,
  canManageCourses,
} from "@/core/permissions";

// Roles already live on the JWT (see lib/auth.ts jwt callback), so checking
// a role costs nothing extra — no DB round trip per request.

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

export async function requireRole(role: string) {
  const user = await requireUser();
  if (!user.roles.includes(role)) {
    throw new ForbiddenError(`Requires role: ${role}`);
  }
  return user;
}

export async function requireAnyRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.some((r) => user.roles.includes(r))) {
    throw new ForbiddenError(`Requires one of: ${roles.join(", ")}`);
  }
  return user;
}

/** Prof, admin, or any future course-manager role. */
export async function requireCourseManager() {
  return requireAnyRole([...COURSE_MANAGER_ROLES]);
}

export async function assertCanEditCourse(course: { profId: string }) {
  const user = await requireUser();
  if (!canEditCourse(user, course)) {
    throw new ForbiddenError("You cannot edit this course");
  }
  return user;
}

export { canManageCourses, canEditCourse, COURSE_MANAGER_ROLES };


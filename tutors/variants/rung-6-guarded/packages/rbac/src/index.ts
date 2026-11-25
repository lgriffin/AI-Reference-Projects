/**
 * @ladder/rbac: who may do what with a course, as a pure policy. Mirrors upstream
 * packages/svelte/utils/rbac/src/permissions.ts (roles to permissions), guides/RBAC.md ("Auth Levels",
 * "Whitelist Enforcement") and turnsAway in packages/svelte/connect/src/services/connect.svelte.ts.
 *
 * Pure: every answer depends only on the arguments. No I/O, no clock, no state, no async, and only
 * type imports (tests/architecture checks each). A policy that cannot reach the world is easy to test
 * exhaustively and cannot be talked out of its answer.
 */
import type { Actor } from "@ladder/identity";
import type { Course } from "@ladder/model";

/** Upstream has student and educator; anonymous is this rung's name for "no Actor", which upstream handles as a missing login. */
export type Role = "anonymous" | "student" | "educator";

/** Upstream's four permissions, as in packages/svelte/utils/rbac/src/types.ts. Reading a course is decided by canView, not a permission. */
export type Permission = "broadcast" | "quiz:manage" | "analytics:view" | "content:lock";

/** What the policy needs to know about a course: its auth level and its enrollment. */
export type CourseAccess = { authLevel: number; educators: readonly string[]; whitelist: readonly string[] };

/** A Record, so a new Role does not compile until it has a line here (Unrepresentable Mistake). */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  anonymous: [],
  student: [],
  educator: ["broadcast", "quiz:manage", "analytics:view", "content:lock"],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * The course's access settings: `auth` from properties.yaml (upstream course-utils.ts loadPropertyFlags
 * reads `course.properties.auth` into authLevel) and the lists from enrollment.yaml. Anything that is not
 * a whole number 0 or above reads as 1, so a typo makes a course private, not public (fail closed).
 */
export function accessOf(course: Pick<Course, "properties" | "enrollment">): CourseAccess {
  const auth = course.properties?.auth ?? 0;
  const level = typeof auth === "number" && Number.isInteger(auth) && auth >= 0 ? auth : 1;
  return { authLevel: level, educators: course.enrollment?.educators ?? [], whitelist: course.enrollment?.whitelist ?? [] };
}

/** A course anyone may read, signed in or not. */
export function isPublic(access: CourseAccess): boolean {
  return access.authLevel < 1;
}

/** The actor's role in this course: educators are listed in enrollment.yaml; everyone signed in is otherwise a student. */
export function roleOf(actor: Actor | null, access: CourseAccess): Role {
  if (actor === null) return "anonymous";
  return access.educators.includes(actor.login) ? "educator" : "student";
}

/** Why a reader was turned away. A union, so a caller's switch over it is checked by the compiler. */
export type Refusal = "sign-in-required" | "not-enrolled";

export type Decision = { allowed: true; role: Role } | { allowed: false; role: Role; reason: Refusal };

/**
 * May this actor read this course? A public course: everyone. A private course (auth 1): only someone
 * signed in; and when it has a whitelist, only those on it and its educators (upstream turnsAway).
 */
export function canView(actor: Actor | null, access: CourseAccess): Decision {
  const role = roleOf(actor, access);
  if (isPublic(access)) return { allowed: true, role };
  if (actor === null) return { allowed: false, role, reason: "sign-in-required" };
  if (role === "educator" || access.whitelist.length === 0 || access.whitelist.includes(actor.login)) return { allowed: true, role };
  return { allowed: false, role, reason: "not-enrolled" };
}

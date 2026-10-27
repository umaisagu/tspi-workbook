import "server-only";
import { notFound } from "next/navigation";
import { canAdminister, isStaff } from "@/lib/auth/permissions";
import { requirePageUser, type CurrentUser } from "@/lib/server/viewer";

export async function requireLecturerPage(): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!canAdminister(user)) notFound();
  return user;
}

export async function requireStaffPage(): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!isStaff(user)) notFound();
  return user;
}

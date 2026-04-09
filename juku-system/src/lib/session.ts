import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { Role } from "./types";

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function getSession() {
  return getServerSession(authOptions);
}

"use server";

import { signOut } from "@/lib/auth";

/**
 * Signing out has to happen on the server so the session row is deleted, not
 * just the cookie dropped — this app uses database sessions, and a client-side
 * cookie clear would leave a valid session behind.
 *
 * Lives in its own module because a "use client" component cannot declare
 * server actions inline.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

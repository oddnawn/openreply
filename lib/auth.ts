import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser, getPrimaryWorkspace } from "@/lib/workspace";

type AdapterPrismaClient = Parameters<typeof PrismaAdapter>[0];

/**
 * Google sign-in is optional so a self-hoster without Google credentials still
 * gets a working app — the email link alone is enough to run this.
 */
export function isGoogleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const providers: Provider[] = [
  Resend({
    apiKey: process.env.RESEND_API_KEY ?? "missing-resend-api-key",
    from: process.env.EMAIL_FROM ?? "OpenReply <login@example.com>",
  }),
];

if (isGoogleEnabled()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Links a Google login to an existing account with the same address
      // instead of rejecting it with OAuthAccountNotLinked. Accounts here are
      // created by emailing that address a link, so anyone who could sign in
      // by email already controls the mailbox; Google verifies the address it
      // reports, so this grants no access that the email flow did not. Without
      // it, an operator who signed up by email simply cannot use this button.
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authConfig = {
  adapter: PrismaAdapter(prisma as unknown as AdapterPrismaClient),
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureWorkspaceForUser(user.id, user.email);
      }
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  session: {
    strategy: "database",
    // Signing in means waiting on an email, so the session is deliberately long
    // and rolling: 90 days, refreshed at most once a day on any visit. Someone
    // who opens this weekly never sees the login screen again.
    //
    // Note this is separate from *where* the cookie lands. A session set on one
    // hostname is invisible on another, so if logins stop persisting after a
    // domain change, check NEXTAUTH_URL before touching these numbers.
    maxAge: 90 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const workspace = await getPrimaryWorkspace(userId);
  if (workspace) return workspace.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const createdWorkspace = await ensureWorkspaceForUser(userId, user?.email);
  return createdWorkspace.id;
}

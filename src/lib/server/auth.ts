import { compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { loginIdLimiter, loginIpLimiter } from "./rateLimit";
import { getClientIp } from "./requestIp";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        loginId: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials, req) {
        const loginId = typeof credentials?.loginId === "string" ? credentials.loginId.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!loginId || !password) return null;

        const ip = getClientIp(req.headers);
        const loginIdKey = `login:${loginId}`;
        const loginIpKey = `login-ip:${ip}`;

        // Check both axes — and skip the DB lookup and bcrypt compare below —
        // before doing any real work, so a lockout also caps the CPU/DB cost an
        // attacker can force per request.
        if (loginIdLimiter.isBlocked(loginIdKey) || loginIpLimiter.isBlocked(loginIpKey)) {
          return null;
        }

        const fail = () => {
          loginIdLimiter.record(loginIdKey);
          loginIpLimiter.record(loginIpKey);
          return null;
        };

        const user = await prisma.user.findUnique({
          where: { loginId },
          include: { seller: true, buyer: true },
        });

        if (!user || user.withdrawnAt) return fail();
        if (!(await compare(password, user.passwordHash))) return fail();

        if (user.role === "SELLER" && user.seller?.status !== "ACTIVE") {
          return fail();
        }

        if (user.role === "BUYER" && user.buyer?.status !== "ACTIVE") {
          return fail();
        }

        loginIdLimiter.reset(loginIdKey);
        loginIpLimiter.reset(loginIpKey);

        return {
          id: user.id,
          name: user.businessName,
          email: user.email ?? undefined,
          role: user.role,
          sellerId: user.seller?.id ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NEXTAUTH_URL
    ? process.env.NEXTAUTH_URL.startsWith("https://")
    : process.env.NODE_ENV === "production",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sellerId = user.sellerId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.sellerId = token.sellerId ?? null;
      }
      return session;
    },
  },
};

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      withdrawnAt: true,
      role: true,
      seller: { select: { status: true } },
      buyer: { select: { status: true } },
    },
  });
  if (!user || user.withdrawnAt) return null;
  if (user.role === "SELLER" && user.seller?.status !== "ACTIVE") return null;
  if (user.role === "BUYER" && user.buyer?.status !== "ACTIVE") return null;

  return session;
}

import { compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        loginId: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const loginId = typeof credentials?.loginId === "string" ? credentials.loginId.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!loginId || !password) return null;

        const user = await prisma.user.findUnique({
          where: { loginId },
          include: { seller: true },
        });

        if (!user || user.withdrawnAt) return null;
        if (!(await compare(password, user.passwordHash))) return null;

        if (user.role === "SELLER" && user.seller?.status !== "ACTIVE") {
          return null;
        }

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
  useSecureCookies: process.env.NODE_ENV === "production",
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

export function getSession() {
  return getServerSession(authOptions);
}

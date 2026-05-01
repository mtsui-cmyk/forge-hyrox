import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import prisma from "./lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        return { id: user.id, email: user.email }
      }
    })
  ],
  callbacks: {
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const isDemoMode = request.cookies.get("forge-demo")?.value === "1";
      const isPublicRoute = pathname === "/" || pathname === "/demo";
      const isAuthRoute = pathname === "/login" || pathname === "/register";
      const isDemoRoute =
        pathname === "/dashboard" ||
        pathname === "/benchmarks" ||
        pathname === "/pacing" ||
        pathname === "/profile" ||
        pathname === "/equipment" ||
        pathname.startsWith("/workout/");

      if (pathname.startsWith("/api") || isPublicRoute || isAuthRoute) return true;
      if (isDemoMode && isDemoRoute) return true;
      return !!auth;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  }
})

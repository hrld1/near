import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loginLimiter } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        // el cerrojo: tras 5 fallos, enfriamiento exponencial (1→15 min).
        // También cuenta fallos de emails inexistentes (no filtra existencia).
        if (loginLimiter.blockedFor(email) > 0) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          loginLimiter.fail(email);
          return null;
        }
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          loginLimiter.fail(email);
          return null;
        }
        loginLimiter.ok(email);
        return { id: user.id, email: user.email, name: user.name };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    }
  }
});

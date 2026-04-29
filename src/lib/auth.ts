import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "./prisma"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "mock-apple-id",
      clientSecret: process.env.APPLE_SECRET || "mock-apple-secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) return null

        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.onboarding_completed = token.onboarding_completed ?? false
      }
      return session
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboarding_completed: true }
        })
        token.onboarding_completed = dbUser?.onboarding_completed ?? false
      }
      // Refresh onboarding status on every session update
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { onboarding_completed: true }
        })
        token.onboarding_completed = dbUser?.onboarding_completed ?? false
      }
      return token
    }
  },
  pages: {
    signIn: '/login',
  }
}

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            workspace: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Check email verification status
        // Check both emailVerified (DateTime) and isEmailVerified (Boolean) fields
        const hasEmailVerified = !!user.emailVerified;
        const isEmailVerifiedFlag = user.isEmailVerified;
        const emailVerificationStatus = hasEmailVerified || isEmailVerifiedFlag;

        console.log(`User ${user.email} login - emailVerified: ${!!user.emailVerified}, isEmailVerified: ${user.isEmailVerified}, treating as: ${emailVerificationStatus}`);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
          isTemporaryPassword: user.isTemporaryPassword,
          isEmailVerified: emailVerificationStatus,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.workspaceId = user.workspaceId
        token.isTemporaryPassword = user.isTemporaryPassword
        token.isEmailVerified = user.isEmailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.workspaceId = token.workspaceId as string
        session.user.isTemporaryPassword = token.isTemporaryPassword as boolean
        session.user.isEmailVerified = token.isEmailVerified as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
}

import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      role: string
      workspaceId?: string
      isTemporaryPassword: boolean
      isEmailVerified?: boolean
    }
  }

  interface User {
    role: string
    workspaceId?: string
    isTemporaryPassword: boolean
    isEmailVerified?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    workspaceId?: string
    isTemporaryPassword: boolean
    isEmailVerified?: boolean
  }
}

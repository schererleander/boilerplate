import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authenticator } from "otplib"
import dbConnect from "./mongodb"
import User from "@/model/User"
import { loginSchema } from "./validation"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const result = loginSchema.safeParse(credentials)
        if (!result.success) return null

        const { email, password, twoFactorCode } = result.data

        try {
            await dbConnect()
            
            const user = await User.findOne({ email })
            if (!user) return null

            const isPasswordValid = await bcrypt.compare(password, user.password)
            if (!isPasswordValid) return null

            if (user.twoFactorEnabled) {
              if (!twoFactorCode) {
                throw new Error("2FA_REQUIRED")
              }

              const isValid = authenticator.check(twoFactorCode, user.twoFactorSecret)
              if (!isValid) {
                throw new Error("Invalid 2FA Code")
              }
            }

            return {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                image: user.profileImage?.url || null,
            }
        } catch (error) {
            console.error("Auth error:", error)
            // Rethrow specific 2FA errors so they reach the client
            if (error instanceof Error && (error.message === "2FA_REQUIRED" || error.message === "Invalid 2FA Code")) {
              throw error
            }
            return null
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        await dbConnect()
        const currentUser = await User.findById(token.id)
        if (currentUser) {
          session.user.name = currentUser.name
          session.user.email = currentUser.email
          session.user.image = currentUser.profileImage?.url || null
        }
      }
      return session
    },
  },
  pages: { signIn: "/login" },
}

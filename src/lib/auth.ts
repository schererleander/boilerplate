import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"
import dbConnect from "./mongodb"
import User from "@/model/User"
import { loginSchema } from "./validation"

const client = new MongoClient(process.env.MONGODB_URI!)

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(client),
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

        // Validate and sanitize with Zod
        const result = loginSchema.safeParse(credentials)
        
        if (!result.success) {
          return null
        }

        const { email, password } = result.data

        await dbConnect()
        
        const user = await User.findOne({ email })
        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
          return null
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.profileImage?.url || null,
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id as string
        
        // Fetch latest user data from database to get current profile image
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
  pages: {
    signIn: "/login",
  },
}

export default NextAuth(authOptions) 
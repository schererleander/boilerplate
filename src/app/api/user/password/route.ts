import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/mongodb"
import User from "@/model/User"
import { authOptions } from "@/lib/auth"
import { updatePasswordSchema } from "@/lib/validation"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const result = updatePasswordSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed", details: result.error.errors }, { status: 400 })
    }

    const { currentPassword, newPassword } = result.data
    await dbConnect()

    const user = await User.findById(session.user.id)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12)
    
    await User.findByIdAndUpdate(session.user.id, { password: hashedNewPassword })

    return NextResponse.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Password update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

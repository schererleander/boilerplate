import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import dbConnect from "@/lib/mongodb"
import User from "@/model/User"
import { authOptions } from "@/lib/auth"
import SettingsContent from "./settings-content"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  await dbConnect()
  const user = await User.findOne({ email: session.user.email }).lean() as any

  if (!user) {
    redirect("/login")
  }

  // Sanitize user object for client component
  const initialUser = {
    name: user.name,
    email: user.email,
    image: user.profileImage?.url || null,
    twoFactorEnabled: !!user.twoFactorEnabled,
  }

  return <SettingsContent initialUser={initialUser} />
}

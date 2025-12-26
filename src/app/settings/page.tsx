import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SettingsForm } from "./settings-form"
import { getUserProfile } from "@/services/user.service"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    // This case should be handled by middleware, but for type safety:
    return null 
  }

  const user = await getUserProfile(session.user.email)

  if (!user) {
    // This case suggests a data inconsistency (session exists but user not in DB)
    return null
  }

  // Sanitize user object for client component
  const initialUser = {
    name: user.name,
    email: user.email,
    image: user.profileImage?.url || null,
    twoFactorEnabled: !!user.twoFactorEnabled,
  }

  return <SettingsForm user={initialUser} />
}

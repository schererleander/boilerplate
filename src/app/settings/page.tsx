import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import Navbar from "@/components/Navbar"
import { authOptions } from "@/lib/auth"
import { SettingsForm } from "@/app/settings/settings-form"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SettingsForm user={session.user} />
    </div>
  )
}

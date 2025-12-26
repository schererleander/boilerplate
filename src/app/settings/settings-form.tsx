"use client"

import { useSession } from "next-auth/react"
import { Separator } from "@/components/ui/separator"
import { ProfileForm } from "./profile-form"
import { ProfileImage } from "./profile-image"
import { PasswordForm } from "./password-form"

interface SettingsFormProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function SettingsForm({ user }: SettingsFormProps) {
  const { update } = useSession()

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and security settings
          </p>
        </div>

        <ProfileForm user={user} update={update} />
        <Separator />
        <ProfileImage user={user} update={update} />
        <Separator />
        <PasswordForm />
      </div>
    </div>
  )
}

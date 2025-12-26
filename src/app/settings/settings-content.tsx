"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, Loader2, Copy } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import Navbar from "@/components/Navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Lock, Save, Trash2, Upload, User } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateProfileSchema, updatePasswordSchema, type UpdateProfileInput } from "@/lib/validation"
import { z } from "zod"

// Re-using existing types and schemas from previous implementation
const passwordChangeSchema = updatePasswordSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormData = UpdateProfileInput
type PasswordFormData = z.infer<typeof passwordChangeSchema>

interface SettingsContentProps {
  initialUser: {
    name: string
    email: string
    image: string | null
    twoFactorEnabled: boolean
  }
}

export default function SettingsContent({ initialUser }: SettingsContentProps) {
  const { update } = useSession()
  const router = useRouter()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialUser.twoFactorEnabled)
  const [is2FALoading, setIs2FALoading] = useState(false)
  const [setupData, setSetupData] = useState<{ secret: string;qrCode: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Existing state for other forms
  const [isLoading, setIsLoading] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialUser.image)
  
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: initialUser.name,
      email: initialUser.email,
    },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // 2FA Handlers
  const start2FASetup = async () => {
    setIs2FALoading(true)
    try {
      const res = await fetch("/api/user/2fa", { method: "PUT" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSetupData(data)
      setIsDialogOpen(true)
    } catch (error) {
      toast.error("Failed to start 2FA setup")
    } finally {
      setIs2FALoading(false)
    }
  }

  const verifyAndEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code")
      return
    }

    setIs2FALoading(true)
    try {
      const res = await fetch("/api/user/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verificationCode,
          secret: setupData?.secret,
        }),
      })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setTwoFactorEnabled(true)
      setIsDialogOpen(false)
      toast.success("Two-factor authentication enabled")
      router.refresh()
    } catch (error) {
      toast.error("Invalid verification code")
    } finally {
      setIs2FALoading(false)
      setVerificationCode("")
    }
  }

  const disable2FA = async () => {
    if (!confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) return

    setIs2FALoading(true)
    try {
      const res = await fetch("/api/user/2fa", { method: "DELETE" })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setTwoFactorEnabled(false)
      toast.success("Two-factor authentication disabled")
      router.refresh()
    } catch (error) {
      toast.error("Failed to disable 2FA")
    } finally {
      setIs2FALoading(false)
    }
  }

  const copyToClipboard = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      toast.success("Secret copied to clipboard")
    }
  }

  // Existing Handlers (Profile, Password, Image)
  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || "Failed to update profile")
        return
      }
      await update({ name: data.name, email: data.email })
      toast.success("Profile updated successfully!")
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || "Failed to update password")
        return
      }
      toast.success("Password updated successfully!")
      passwordForm.reset()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      setIsImageLoading(true)
      try {
        const formData = new FormData()
        formData.append('image', file)
        const response = await fetch('/api/user/profile-image', {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()
        if (!response.ok) {
          toast.error(result.error || 'Failed to upload image')
          return
        }
        setProfileImageUrl(result.profileImage.url)
        toast.success('Profile image uploaded successfully!')
        await update({ image: result.profileImage.url })
      } catch {
        toast.error('An unexpected error occurred')
      } finally {
        setIsImageLoading(false)
      }
    }
  
    const handleImageDelete = async () => {
      setIsImageLoading(true)
      try {
        const response = await fetch('/api/user/profile-image', { method: 'DELETE' })
        const result = await response.json()
        if (!response.ok) {
          toast.error(result.error || 'Failed to delete image')
          return
        }
        setProfileImageUrl(null)
        toast.success('Profile image deleted successfully!')
        await update({ image: null })
      } catch {
        toast.error('An unexpected error occurred')
      } finally {
        setIsImageLoading(false)
      }
    }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and security settings
            </p>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Separator />

          {/* Profile Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="mr-2 h-5 w-5" />
                Profile Image
              </CardTitle>
              <CardDescription>Upload or update your profile picture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileImageUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {initialUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Button
                        disabled={isImageLoading}
                        variant="outline"
                        className="relative"
                        >
                        {isImageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Upload className="mr-2 h-4 w-4" />
                        {profileImageUrl ? 'Change Image' : 'Upload Image'}
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        </Button>
                    </div>
                    
                    {profileImageUrl && (
                      <Button
                        onClick={handleImageDelete}
                        disabled={isImageLoading}
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                      >
                        {isImageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPEG, PNG, WebP, GIF. Maximum size: 10MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Status: {twoFactorEnabled ? "Enabled" : "Disabled"}</p>
                  <p className="text-sm text-muted-foreground">
                    {twoFactorEnabled 
                      ? "Your account is secured with 2FA." 
                      : "Protect your account by enabling 2FA."}
                  </p>
                </div>
                {twoFactorEnabled ? (
                  <Button 
                    variant="destructive" 
                    onClick={disable2FA} 
                    disabled={is2FALoading}
                  >
                    {is2FALoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disable 2FA
                  </Button>
                ) : (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={start2FASetup} disabled={is2FALoading}>
                        {is2FALoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enable 2FA
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                          Scan the QR code with your authenticator app (like Google Authenticator or Authy).
                        </DialogDescription>
                      </DialogHeader>
                      
                      {setupData && (
                        <div className="flex flex-col items-center space-y-4 py-4">
                          <div className="relative w-48 h-48">
                            <Image 
                              src={setupData.qrCode} 
                              alt="2FA QR Code" 
                              fill
                              style={{ objectFit: "contain" }}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {setupData.secret}
                            </code>
                            <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="w-full space-y-2">
                            <Label htmlFor="code">Verification Code</Label>
                            <Input
                              id="code"
                              placeholder="Enter 6-digit code"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                              maxLength={6}
                            />
                          </div>

                          <Button 
                            className="w-full" 
                            onClick={verifyAndEnable2FA}
                            disabled={verificationCode.length !== 6 || is2FALoading}
                          >
                            {is2FALoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify & Enable
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

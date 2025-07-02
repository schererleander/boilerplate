"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Eye, EyeOff, Loader2, User, Mail, Lock, Save, Camera, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Navbar from "@/components/Navbar"
import { updateProfileSchema, updatePasswordSchema, type UpdateProfileInput, type UpdatePasswordInput } from "@/lib/validation"

// Form schema for password change with confirmation
const passwordChangeSchema = updatePasswordSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormData = UpdateProfileInput
type PasswordFormData = z.infer<typeof passwordChangeSchema>

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      email: "",
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

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Set form values when session is loaded
  useEffect(() => {
    if (session?.user) {
      profileForm.reset({
        name: session.user.name || "",
        email: session.user.email || "",
      })
      setProfileImageUrl(session.user.image || null)
    }
  }, [session, profileForm])

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

      // Update the session with new data
      await update({
        name: data.name,
        email: data.email,
      })

      toast.success("Profile updated successfully!")
      
    } catch (error) {
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
      
    } catch (error) {
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
      
      // Update session with new image
      await update({
        image: result.profileImage.url
      })

    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsImageLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImageDelete = async () => {
    setIsImageLoading(true)

    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to delete image')
        return
      }

      setProfileImageUrl(null)
      toast.success('Profile image deleted successfully!')
      
      // Update session to remove image
      await update({
        image: null
      })

    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsImageLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
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
              <CardDescription>
                Update your personal information
              </CardDescription>
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
                          <Input
                            placeholder="John Doe"
                            {...field}
                          />
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
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                          />
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
              <CardDescription>
                Upload or update your profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileImageUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImageLoading}
                      variant="outline"
                    >
                      {isImageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Upload className="mr-2 h-4 w-4" />
                      {profileImageUrl ? 'Change Image' : 'Upload Image'}
                    </Button>
                    
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
                    Images will be resized to 400x400 pixels.
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
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
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter your current password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter your new password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your new password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-xs text-muted-foreground">
                    Password must contain at least 8 characters with uppercase, lowercase, and a number.
                  </div>
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
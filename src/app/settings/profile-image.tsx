"use client"

import { useState, useRef } from "react"
import { Loader2, Camera, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Session } from "next-auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface ProfileImageProps {
  user: {
    name?: string | null
    image?: string | null
  }
  update: (data?: { name?: string | null; email?: string | null; image?: string | null }) => Promise<Session | null>
}

export function ProfileImage({ user, update }: ProfileImageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user.image || null)

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
      
      await update({
        image: result.profileImage.url
      })
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsImageLoading(false)
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
      
      await update({
        image: null
      })
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsImageLoading(false)
    }
  }

  return (
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
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
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
  )
}

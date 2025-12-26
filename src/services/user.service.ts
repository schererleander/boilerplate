import dbConnect from "@/lib/mongodb"
import User from "@/model/User"

interface UserDocument {
  name: string
  email: string
  profileImage?: { url: string }
  twoFactorEnabled?: boolean
}

export async function getUserProfile(email: string) {
  await dbConnect()
  
  const user = await User.findOne({ email }).lean() as unknown as UserDocument
  
  if (!user) {
    return null
  }

  return {
    name: user.name,
    email: user.email,
    profileImage: user.profileImage,
    twoFactorEnabled: user.twoFactorEnabled,
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import sharp from "sharp"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import User from "@/model/User"
import { uploadToMinio, deleteFromMinio } from "@/lib/minio"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // Reduced to 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file || !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    try { await sharp(buffer).metadata() } 
    catch { return NextResponse.json({ error: "Invalid image file" }, { status: 400 }) }

    const processedBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer()

    const key = `users/${session.user.id}/profile/avatar.webp`
    
    await dbConnect()
    const minioUrl = await uploadToMinio(key, processedBuffer, 'image/webp')

    await User.findByIdAndUpdate(
      session.user.id,
      { profileImage: { url: minioUrl, key, uploadedAt: new Date() } }
    )

    return NextResponse.json({ 
      message: "Profile image uploaded successfully", 
      profileImage: { url: minioUrl } 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await dbConnect()
    const user = await User.findById(session.user.id)
    
    if (user?.profileImage?.key) {
      await deleteFromMinio(user.profileImage.key)
      await User.findByIdAndUpdate(session.user.id, { $unset: { profileImage: 1 } })
    }

    return NextResponse.json({ message: "Profile image deleted" })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

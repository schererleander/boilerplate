import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import sharp from "sharp"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import User from "@/model/User"
import { uploadToMinio, deleteFromMinio } from "@/lib/minio"

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const OUTPUT_WIDTH = 400
const OUTPUT_HEIGHT = 400
const OUTPUT_QUALITY = 80

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('image') as File

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate image and get metadata
    let imageMetadata
    try {
      imageMetadata = await sharp(buffer).metadata()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 }
      )
    }

    // Additional validation
    if (!imageMetadata.width || !imageMetadata.height) {
      return NextResponse.json(
        { error: "Unable to read image dimensions" },
        { status: 400 }
      )
    }

    // Process image: resize and convert to WebP
    const processedBuffer = await sharp(buffer)
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: OUTPUT_QUALITY })
      .toBuffer()

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `avatar_${timestamp}.webp`
    const key = `users/${session.user.id}/profile/${filename}`

    // Connect to database
    await dbConnect()

    // Get current user to check for existing profile image
    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Delete old profile image from MinIO if it exists
    if (currentUser.profileImage?.key) {
      try {
        await deleteFromMinio(currentUser.profileImage.key)
      } catch (error) {
        console.warn("Failed to delete old profile image:", error)
        // Continue with upload even if deletion fails
      }
    }

    // Upload to MinIO
    const minioUrl = await uploadToMinio(key, processedBuffer, 'image/webp')

    // Update user with new profile image
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        profileImage: {
          url: minioUrl,
          key: key,
          uploadedAt: new Date()
        }
      },
      { new: true }
    )

    // Return success response
    return NextResponse.json({
      message: "Profile image uploaded successfully",
      profileImage: {
        url: minioUrl,
        uploadedAt: new Date()
      }
    }, { status: 200 })

  } catch (error) {
    console.error("Profile image upload error:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user has profile image
    if (!currentUser.profileImage?.key) {
      return NextResponse.json(
        { error: "No profile image to delete" },
        { status: 400 }
      )
    }

    // Delete from MinIO
    await deleteFromMinio(currentUser.profileImage.key)

    // Remove profile image from user document
    await User.findByIdAndUpdate(
      session.user.id,
      { $unset: { profileImage: 1 } }
    )

    return NextResponse.json({
      message: "Profile image deleted successfully"
    }, { status: 200 })

  } catch (error) {
    console.error("Profile image deletion error:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 
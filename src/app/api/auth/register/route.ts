import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/mongodb"
import User from "@/model/User"
import { registerSchema, formatZodError } from "@/lib/validation"

// Define interface for MongoDB duplicate key error
interface MongoError extends Error {
  code?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = registerSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { name, email, password } = result.data

    await dbConnect()

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    })

    return NextResponse.json(
      { message: "User created successfully", userId: user._id },
      { status: 201 }
    )
  } catch (error) {
    const mongoError = error as MongoError;
    if (mongoError.code === 11000) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      )
    }
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

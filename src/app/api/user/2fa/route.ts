import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authenticator } from "otplib"
import QRCode from "qrcode"
import dbConnect from "@/lib/mongodb"
import User from "@/model/User"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, secret } = await req.json()

    if (!code || !secret) {
      return NextResponse.json(
        { error: "Code and secret are required" },
        { status: 400 }
      )
    }

    const isValid = authenticator.check(code, secret)

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid two-factor code" },
        { status: 400 }
      )
    }

    await dbConnect()
    await User.findByIdAndUpdate(session.user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("2FA enable error:", error)
    return NextResponse.json(
      { error: "Failed to enable two-factor authentication" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    await User.findByIdAndUpdate(session.user.id, {
      twoFactorEnabled: false,
      $unset: { twoFactorSecret: 1 },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("2FA disable error:", error)
    return NextResponse.json(
      { error: "Failed to disable two-factor authentication" },
      { status: 500 }
    )
  }
}

// Generate new secret and QR code for setup
export async function PUT() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(
      session.user.email,
      "Next-Boilerplate",
      secret
    )
    const qrCode = await QRCode.toDataURL(otpauth)

    return NextResponse.json({ secret, qrCode })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json(
      { error: "Failed to generate two-factor setup" },
      { status: 500 }
    )
  }
}

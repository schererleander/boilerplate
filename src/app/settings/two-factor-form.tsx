"use client"

import { useState } from "react"
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

interface TwoFactorFormProps {
  twoFactorEnabled: boolean
}

export function TwoFactorForm({ twoFactorEnabled: initialTwoFactorEnabled }: TwoFactorFormProps) {
  const router = useRouter()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled)
  const [is2FALoading, setIs2FALoading] = useState(false)
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const start2FASetup = async () => {
    setIs2FALoading(true)
    try {
      const res = await fetch("/api/user/2fa", { method: "PUT" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSetupData(data)
      setIsDialogOpen(true)
    } catch {
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
    } catch {
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
    } catch {
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

  return (
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
  )
}

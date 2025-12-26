import { authenticator } from "otplib"

interface TwoFactorCheck {
  twoFactorEnabled?: boolean
  twoFactorSecret?: string
}

export function verifyTwoFactor(
  user: TwoFactorCheck, 
  code?: string
): void {
  if (user.twoFactorEnabled) {
    // If the user signed up but hasn't set up 2FA yet (secret is missing),
    // we can either skip 2FA or treat it as disabled.
    // Here we treat it as disabled if no secret is present.
    if (user.twoFactorSecret) {
      if (!code) {
        throw new Error("2FA_REQUIRED")
      }

      const isValid = authenticator.check(code, user.twoFactorSecret)
      if (!isValid) {
        throw new Error("Invalid 2FA Code")
      }
    }
  }
}

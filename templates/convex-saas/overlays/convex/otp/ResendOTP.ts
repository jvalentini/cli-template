import { Email } from '@convex-dev/auth/providers/Email'
import { alphabet, generateRandomString } from 'oslo/crypto'
import templateConfig from '../../template.config'
import { AUTH_EMAIL, AUTH_RESEND_KEY } from '../env'
import { VerificationCodeEmail } from './VerificationCodeEmail'

export const ResendOTP = Email({
  id: 'resend-otp',
  apiKey: AUTH_RESEND_KEY,
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet('0-9'))
  },
  async sendVerificationRequest({ identifier: email, provider, token, expires }) {
    const defaultFrom = `${templateConfig.brandName} <onboarding@resend.dev>`
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: AUTH_EMAIL ?? defaultFrom,
        to: [email],
        subject: `Sign in to ${templateConfig.brandName}`,
        html: VerificationCodeEmail({ code: token, expires }),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }
  },
})

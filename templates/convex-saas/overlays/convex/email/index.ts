import { ERRORS } from '../../src/errors'
import templateConfig from '../../template.config'
import { AUTH_EMAIL, AUTH_RESEND_KEY } from '../env'

export type SendEmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions) {
  if (!AUTH_RESEND_KEY) {
    throw new Error(`Resend - ${ERRORS.ENVS_NOT_INITIALIZED}`)
  }

  const defaultFrom = `${templateConfig.brandName} <onboarding@resend.dev>`
  const from = AUTH_EMAIL ?? defaultFrom
  const email = { from, ...options }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to send email:', error)
    throw new Error(ERRORS.AUTH_EMAIL_NOT_SENT)
  }

  const data = await response.json()
  return { status: 'success', data } as const
}

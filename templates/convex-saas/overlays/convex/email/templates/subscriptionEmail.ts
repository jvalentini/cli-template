import templateConfig from '../../../template.config'
import { SITE_URL } from '../../env'
import { sendEmail } from '../index'

type SubscriptionEmailOptions = {
  email: string
  subscriptionId: string
}

function renderSubscriptionSuccessEmail({ email }: SubscriptionEmailOptions): string {
  const { brandName } = templateConfig
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Successfully Subscribed to PRO</title>
</head>
<body style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 600px;">
    <p style="font-size: 16px; line-height: 26px;">Hello ${email}!</p>
    <p style="font-size: 16px; line-height: 26px;">
      Your subscription to PRO has been successfully processed.<br>
      We hope you enjoy the new features!
    </p>
    <p style="font-size: 16px; line-height: 26px;">
      The <a href="${SITE_URL}">${brandName}</a> team.
    </p>
    <hr style="border-color: #cccccc; margin: 20px 0;">
    <p style="color: #8898aa; font-size: 12px;">${brandName}</p>
  </div>
</body>
</html>
`
}

function renderSubscriptionErrorEmail({ email }: SubscriptionEmailOptions): string {
  const { brandName } = templateConfig
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Subscription Issue</title>
</head>
<body style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 600px;">
    <p style="font-size: 16px; line-height: 26px;">Hello ${email}.</p>
    <p style="font-size: 16px; line-height: 26px;">
      We were unable to process your subscription to PRO tier.<br>
      But don't worry, we'll not charge you anything.
    </p>
    <p style="font-size: 16px; line-height: 26px;">
      The <a href="${SITE_URL}">${brandName}</a> team.
    </p>
    <hr style="border-color: #cccccc; margin: 20px 0;">
    <p style="color: #8898aa; font-size: 12px;">${brandName}</p>
  </div>
</body>
</html>
`
}

export async function sendSubscriptionSuccessEmail({
  email,
  subscriptionId,
}: SubscriptionEmailOptions) {
  const html = renderSubscriptionSuccessEmail({ email, subscriptionId })

  await sendEmail({
    to: email,
    subject: 'Successfully Subscribed to PRO',
    html,
  })
}

export async function sendSubscriptionErrorEmail({
  email,
  subscriptionId,
}: SubscriptionEmailOptions) {
  const html = renderSubscriptionErrorEmail({ email, subscriptionId })

  await sendEmail({
    to: email,
    subject: 'Subscription Issue - Customer Support',
    html,
  })
}

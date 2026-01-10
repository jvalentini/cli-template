import templateConfig from '../../template.config'

export function VerificationCodeEmail({ code, expires }: { code: string; expires: Date }): string {
  const hoursRemaining = Math.floor((+expires - Date.now()) / (60 * 60 * 1000))
  const { brandName } = templateConfig

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sign in to ${brandName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .code { font-size: 36px; font-weight: bold; text-align: center; padding: 20px; }
    .note { text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sign in to ${brandName}</h1>
    <p>Please enter the following code on the sign in page.</p>
    <div style="text-align: center;">
      <p style="font-weight: 600;">Verification code</p>
      <p class="code">${code}</p>
      <p class="note">(This code is valid for ${hoursRemaining} hours)</p>
    </div>
  </div>
</body>
</html>
`
}

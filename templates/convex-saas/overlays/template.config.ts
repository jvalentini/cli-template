/**
 * Template Configuration
 *
 * This file contains all project-specific values that should be replaced
 * when using this project as a template. Update these values for your project.
 */

export const templateConfig = {
  // Project identifiers
  projectSlug: '{{projectName}}',
  projectName: '{{projectName}}',
  projectDescription: 'A SaaS application built with Convex, Stripe, and TanStack Start',

  // URLs and domains
  domain: 'example.com',
  siteUrl: 'https://example.com',

  // Branding
  brandName: '{{projectName}}',
  tagline: 'Your tagline here',

  // Contact
  supportEmail: '',
  twitterHandle: '',

  // Legal
  companyName: '',
  companyAddress: '',
} as const

export type TemplateConfig = typeof templateConfig

// Helper to get full URLs
export const getUrl = (path: string) => `${templateConfig.siteUrl}${path}`

// Helper for email "from" field
export const getEmailFrom = (name?: string) => {
  const displayName = name || templateConfig.brandName
  const email = templateConfig.supportEmail || 'onboarding@resend.dev'
  return `${displayName} <${email}>`
}

export default templateConfig

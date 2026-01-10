# Using This Template

This is a SaaS starter template built with TanStack Start, Convex, and Effect TS.

## Quick Start

```bash
# Clone the template
bunx degit username/better-parent my-saas-app
cd my-saas-app

# Run the setup wizard
bun install
bun run setup

# Start development
bunx convex dev
bun run dev
```

## What the Setup Script Does

The `bun run setup` command will:

1. Prompt for your project details (name, domain, etc.)
2. Update `template.config.ts` with your values
3. Update `package.json` name and description
4. Update `public/site.webmanifest` 
5. Update `README.md`
6. Remove the template's git origin

## Manual Configuration

If you prefer manual setup, update these files:

### template.config.ts

```typescript
export const templateConfig = {
  projectSlug: 'your-project',
  projectName: 'Your Project',
  projectDescription: 'Your description.',
  domain: 'yourproject.com',
  siteUrl: 'https://yourproject.com',
  brandName: 'Your Project',
  tagline: 'Your tagline.',
  supportEmail: 'support@yourproject.com',
  twitterHandle: 'yourhandle',
  companyName: 'Your Company',
  companyAddress: '',
}
```

### Environment Variables

Create a `.env.local` file:

```bash
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...

# Resend (optional)
RESEND_API_KEY=re_...
```

## Stack Overview

| Layer | Technology |
|-------|------------|
| Frontend | TanStack Start (React + TanStack Router) |
| Backend | Convex (real-time database + functions) |
| Data Fetching | TanStack Query + @convex-dev/react-query |
| Auth | @convex-dev/auth with OTP |
| Payments | Stripe (subscriptions) |
| Email | Resend + React Email |
| Error Handling | Effect TS |
| Styling | Tailwind CSS |
| Linting | Biome + Oxlint |
| Testing | Vitest + convex-test |

## Project Structure

```
├── convex/                 # Backend
│   ├── schema.ts          # Database schema
│   ├── app.ts             # User queries/mutations
│   ├── items.ts           # CRUD operations
│   ├── stripe.ts          # Payment logic
│   ├── otp/               # OTP authentication
│   └── email/             # Email templates
├── src/
│   ├── routes/            # TanStack Router pages
│   │   ├── __root.tsx     # Root layout
│   │   ├── index.tsx      # Landing page
│   │   ├── login.tsx      # Auth page
│   │   └── _auth/         # Protected routes
│   │       └── dashboard/ # Dashboard pages
│   ├── components/        # React components
│   └── lib/               # Utilities
├── template.config.ts     # Template configuration
├── scripts/setup.ts       # Setup wizard
└── Makefile              # Dev commands
```

## Commands

```bash
make install     # Install dependencies
make dev         # Development server
make check       # Typecheck + lint
make test        # Run tests
make build       # Production build
bun run setup    # Run setup wizard
```

## Features Included

- OTP-based authentication (email)
- User profiles with plan management
- Stripe subscription integration
- Protected dashboard routes
- Real-time data with Convex
- Type-safe API with validators
- Test infrastructure (22 tests)

## Customization

### Adding New Routes

1. Create file in `src/routes/`
2. For protected routes, use `src/routes/_auth/`

### Adding Database Tables

1. Update `convex/schema.ts`
2. Run `bunx convex dev` to sync

### Adding API Functions

1. Create file in `convex/`
2. Export `query`, `mutation`, or `action`

## Removing Features

To strip features you don't need:

### Remove Stripe
- Delete `convex/stripe.ts`
- Remove Stripe env vars
- Update `convex/schema.ts` (remove plan field)

### Remove Email
- Delete `convex/email/`
- Delete `convex/otp/`
- Remove Resend env vars

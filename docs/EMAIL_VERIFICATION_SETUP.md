# Email Verification Setup Guide

This guide explains how to enable email verification for new user signups using Brevo (formerly SendinBlue).

## Overview

Email verification has been implemented to:

- Ensure users have valid email addresses
- Prevent spam registrations
- Secure access to protected features until email is verified

## Features

- ✅ Automatic verification email sent on signup
- ✅ Beautiful HTML email templates
- ✅ 24-hour verification token expiry
- ✅ Resend verification email functionality
- ✅ Protected routes require verification (when enabled)
- ✅ Optional - works without Brevo API key (verification disabled)

## Setup Instructions

### 1. Create a Brevo Account

1. Go to [Brevo](https://www.brevo.com/) and sign up for a free account
2. The free plan includes **300 emails/day** which should be sufficient for most apps
3. Verify your Brevo account via the email they send you

### 2. Get Your Brevo API Key

1. Log into your Brevo dashboard
2. Navigate to **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Give it a name (e.g., "Focal Production")
5. Copy the API key - you'll need this next

### 3. Configure Your Environment

#### For Local Development

Add to your `.dev.vars` file in the project root:

```bash
# Existing secrets
JWT_SECRET="your-jwt-secret"
ENCRYPTION_KEY="your-encryption-key"

# Add these new ones
BREVO_API_KEY="your-brevo-api-key-here"
APP_URL="http://localhost:3000"
```

#### For Production (Cloudflare Workers)

Set the secrets using wrangler CLI:

```bash
# Set Brevo API key
wrangler secret put BREVO_API_KEY

# Set APP URL (your production domain)
wrangler secret put APP_URL
```

When prompted, enter:

- `BREVO_API_KEY`: Your Brevo API key from step 2
- `APP_URL`: Your production URL (e.g., `https://focal-expense.app`)

### 4. Run Database Migration

Apply the email verification migration to add required database columns:

```bash
# Local database
wrangler d1 execute focal_expensi_db --local --file=./migrations/003_email_verification.sql

# Production database (after testing locally)
wrangler d1 execute focal_expensi_db --remote --file=./migrations/003_email_verification.sql
```

### 5. Verify Email Sender (Production Only)

For production emails to work properly:

1. Go to Brevo dashboard → **Senders & IP**
2. Add and verify your sender email address (e.g., `noreply@yourdomain.com`)
3. Update `worker/services/brevo.service.ts` if you want to use a custom sender:

```typescript
constructor(
    apiKey: string,
    senderEmail: string = 'your-email@yourdomain.com',  // Change this
    senderName: string = 'Your App Name'                // And this
)
```

### 6. Test the Feature

#### Test Signup Flow

1. Start your dev servers: `pnpm dev:full`
2. Navigate to `/login` and create a new account
3. Check the terminal logs - you should see:
   ```
   [Signup] Verification email sent: <messageId>
   ```
4. Check your email inbox for the verification email
5. Click the verification link (or copy/paste the URL)
6. You should see a success message and be redirected

#### Test Resend Verification

1. Log in with an unverified account
2. You'll see a banner: "Please verify your email to access all features"
3. Click **Resend Email**
4. Check your inbox for a new verification email

## How It Works

### Signup Flow

1. User submits signup form with email/password
2. Backend creates user account with `email_verified = 0`
3. Backend generates a secure verification token (64-char hex)
4. Token stored in database with 24-hour expiration
5. Brevo sends verification email with link: `APP_URL/verify?token=<token>`
6. User logs in but sees verification banner on protected pages

### Verification Flow

1. User clicks verification link in email
2. Frontend calls `GET /api/auth/verify/:token`
3. Backend validates token and expiration
4. If valid: sets `email_verified = 1`, clears token
5. User redirected to home page with full access

### Middleware Protection

The auth middleware (`worker/middleware/auth.ts`) checks email verification:

- **When Brevo is configured** (`BREVO_API_KEY` set): Requires verification for all protected routes except:

  - `/api/auth/me` (check status)
  - `/api/auth/logout` (allow logout)
  - `/api/auth/resend-verification` (resend email)
  - `/api/auth/verify` (verification endpoint)

- **When Brevo is NOT configured**: Email verification is disabled, all users have full access

## API Endpoints

### `POST /api/auth/signup`

Creates account and sends verification email.

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": false
    },
    "token": "jwt-token",
    "message": "Account created. Please check your email to verify your account."
  }
}
```

### `GET /api/auth/verify/:token`

Verifies email with token from email link.

**Response (success):**

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully! You can now use all features.",
    "userId": "uuid"
  }
}
```

**Response (error):**

```json
{
  "success": false,
  "error": "Invalid verification token" // or "Verification token expired" or "Email already verified"
}
```

### `POST /api/auth/resend-verification`

Resends verification email (requires authentication).

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Verification email sent. Please check your inbox."
  }
}
```

### `GET /api/auth/me`

Returns current user info including verification status.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "created_at": 1234567890
  }
}
```

## Customization

### Email Templates

Edit `worker/services/brevo.service.ts`:

- **Verification email**: `sendVerificationEmail()` method
- **Password reset email**: `sendPasswordResetEmail()` method (bonus feature included!)

Both use responsive HTML templates with:

- Professional design
- Dark/light email client support
- Mobile-friendly layout
- Accessible text fallback

### Token Expiration

Default: 24 hours

Change in `worker/handlers/auth.handler.ts`:

```typescript
// Current: 24 hours
const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

// Change to 1 hour:
const verificationExpires = Date.now() + 60 * 60 * 1000;
```

### Disable Verification for Specific Routes

Edit `worker/middleware/auth.ts` and add to `allowedPaths` array:

```typescript
const allowedPaths = [
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/resend-verification",
  "/api/auth/verify",
  "/api/your-custom-route", // Add here
];
```

## Troubleshooting

### Emails Not Sending

1. **Check API key**: Verify `BREVO_API_KEY` is set correctly
2. **Check logs**: Look for `[Brevo] Failed to send...` errors in worker logs
3. **Verify sender**: Ensure sender email is verified in Brevo dashboard
4. **Check quota**: Free plan = 300 emails/day

### Token Errors

- **"Invalid verification token"**: Token doesn't exist or was already used
- **"Verification token expired"**: Token older than 24 hours - resend email
- **"Email already verified"**: User already verified, no action needed

### Development Issues

- **Emails not arriving**: Check spam folder
- **Links not working**: Ensure `APP_URL` matches your local URL (`http://localhost:3000`)
- **Database errors**: Run migration: `pnpm db:migrate:003`

## Cost Considerations

### Brevo Free Plan

- **300 emails/day** - sufficient for ~10 new users/day
- **Unlimited contacts**
- **No credit card required**

### Paid Plans

If you exceed 300 emails/day:

- **Lite**: €25/month for 10,000 emails
- **Premium**: €65/month for 20,000 emails
- Volume discounts available

## Security Notes

1. ✅ Tokens are 256-bit random hex strings (cryptographically secure)
2. ✅ Tokens expire after 24 hours
3. ✅ Tokens are single-use (cleared after verification)
4. ✅ API keys encrypted in database with AES-256-GCM
5. ✅ HTTPS-only in production (enforced by Cloudflare)

## Next Steps

After setting up email verification:

1. ✅ Add your Brevo API key (see step 2 above)
2. ✅ Run database migration (see step 4 above)
3. ✅ Test signup and verification flow
4. ✅ Verify production sender email (step 5 above)
5. ✅ Deploy to production: `pnpm deploy`
6. ✅ Set production secrets with `wrangler secret put`

## Support

For issues with:

- **Brevo API**: [Brevo Documentation](https://developers.brevo.com/)
- **Focal App**: Check GitHub issues or create a new one
- **Email deliverability**: Review Brevo's sender guidelines

---

**That's it!** Your app now has professional email verification powered by Brevo. 🎉

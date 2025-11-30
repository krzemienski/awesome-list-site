# OAuth Provider Setup Guide

**Project**: Awesome Video Resources
**Updated**: 2025-11-29
**Supabase Project**: jeyldoypdkgsrfdhdcmm

---

## Overview

This guide walks through configuring OAuth authentication providers (GitHub, Google, Magic Link) for the Awesome Video Resources platform using Supabase Auth.

**Supported Providers**:
- ✅ Email/Password (built-in, already configured)
- ⚠️ GitHub OAuth (requires setup)
- ⚠️ Google OAuth (requires setup)
- ⚠️ Magic Link (requires SMTP configuration)

---

## GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Navigate to: https://github.com/settings/developers
2. Click **"OAuth Apps"** tab
3. Click **"New OAuth App"** button
4. Fill in application details:

   | Field | Value |
   |-------|-------|
   | **Application name** | Awesome Video Resources (Development) |
   | **Homepage URL** | `http://localhost:3000` |
   | **Application description** | Browse and discover 2,600+ curated video development resources |
   | **Authorization callback URL** | `https://jeyldoypdkgsrfdhdcmm.supabase.co/auth/v1/callback` |

5. Click **"Register application"**
6. **Copy the Client ID** (you'll need this in Step 2)
7. Click **"Generate a new client secret"**
8. **Copy the Client Secret** (shown only once!)

### Step 2: Configure in Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/auth/providers
2. Scroll to **"GitHub"** provider section
3. Toggle the **"Enable GitHub provider"** switch to ON
4. Paste **Client ID** from Step 1
5. Paste **Client Secret** from Step 1
6. Click **"Save"**

### Step 3: Test GitHub OAuth Flow

1. Navigate to: http://localhost:3000/login
2. Click **"Continue with GitHub"** button
3. **Verify**: Redirects to `github.com/login/oauth/authorize?client_id=...`
4. Click **"Authorize [YourGitHubUsername]"**
5. **Verify**: Redirects to `http://localhost:3000/auth/callback` → `/` (homepage)
6. **Verify**: User menu (top-right) shows your GitHub username/avatar
7. **Verify**: Can access protected routes (e.g., /profile, /bookmarks)
8. Logout and test login again

### Production Setup

For production deployment, create a **separate GitHub OAuth App**:

| Field | Value |
|-------|-------|
| **Application name** | Awesome Video Resources (Production) |
| **Homepage URL** | `https://yourdomain.com` |
| **Authorization callback URL** | `https://jeyldoypdkgsrfdhdcmm.supabase.co/auth/v1/callback` |

**Note**: The callback URL is the same (Supabase handles redirect to your domain automatically).

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Navigate to: https://console.cloud.google.com/
2. Click project dropdown (top bar) → **"New Project"**
3. Enter project name: **"Awesome Video Resources"**
4. Click **"Create"**
5. Wait for project creation (~30 seconds)

### Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, navigate to: **APIs & Services** → **OAuth consent screen**
2. Select **"External"** user type (allows any Google account)
3. Click **"Create"**
4. Fill in consent screen details:

   | Field | Value |
   |-------|-------|
   | **App name** | Awesome Video Resources |
   | **User support email** | your-email@gmail.com |
   | **App logo** | (Optional) Upload 120x120px logo |
   | **Application home page** | http://localhost:3000 |
   | **Authorized domains** | localhost (for dev), yourdomain.com (for prod) |
   | **Developer contact** | your-email@gmail.com |

5. Click **"Save and Continue"**
6. **Scopes**: Click **"Add or Remove Scopes"**
   - Check: `../auth/userinfo.email`
   - Check: `../auth/userinfo.profile`
   - Check: `openid`
7. Click **"Update"** → **"Save and Continue"**
8. **Test users**: Add your Gmail for testing (if app status is "Testing")
9. Click **"Save and Continue"** → **"Back to Dashboard"**

### Step 3: Create OAuth 2.0 Credentials

1. Navigate to: **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **Application type**: **Web application**
4. Enter **Name**: **"Awesome Video Resources (Dev)"**
5. **Authorized redirect URIs**:
   - Click **"Add URI"**
   - Enter: `https://jeyldoypdkgsrfdhdcmm.supabase.co/auth/v1/callback`
6. Click **"Create"**
7. **Copy the Client ID** and **Client Secret** (modal shown after creation)

### Step 4: Configure in Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/auth/providers
2. Scroll to **"Google"** provider section
3. Toggle **"Enable Google provider"** to ON
4. Paste **Client ID** from Step 3
5. Paste **Client Secret** from Step 3
6. Click **"Save"**

### Step 5: Test Google OAuth Flow

1. Navigate to: http://localhost:3000/login
2. Click **"Continue with Google"** button
3. **Verify**: Redirects to `accounts.google.com/o/oauth2/auth?...`
4. Select your Google account
5. **Verify**: Shows consent screen "Awesome Video Resources wants to access your Google Account"
6. Click **"Continue"**
7. **Verify**: Redirects to `http://localhost:3000/auth/callback` → `/`
8. **Verify**: User menu shows Google profile name and avatar
9. Test accessing protected routes
10. Logout and re-login

### Production Setup

For production, update the OAuth client:
1. **Authorized redirect URIs**: Keep Supabase URL (same as dev)
2. **Authorized JavaScript origins**: Add `https://yourdomain.com`
3. **OAuth consent screen**: Change to "In production" status (requires verification)

---

## Magic Link Setup

### Step 1: Configure Email Provider

**Development** (using Supabase built-in):
1. Open: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/settings/auth
2. Scroll to **"SMTP Settings"**
3. **Enable**: Use default (Supabase sends from `noreply@mail.app.supabase.io`)
4. **Limitations**: 4 emails per hour per user (rate limited)

**Production** (recommended: use custom SMTP):

**Option A: SendGrid**
1. Create SendGrid account: https://sendgrid.com
2. Generate API key with "Mail Send" permissions
3. In Supabase SMTP settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: Your SendGrid API key
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `Awesome Video Resources`

**Option B: AWS SES**
1. Set up AWS SES: https://aws.amazon.com/ses/
2. Verify domain and email addresses
3. Generate SMTP credentials
4. Configure in Supabase SMTP settings

### Step 2: Customize Email Template

1. Navigate to: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/auth/templates
2. Select **"Magic Link"** template
3. Customize email content:

```html
<h2>Sign in to Awesome Video Resources</h2>
<p>Click the link below to sign in to your account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this email, you can safely ignore it.</p>
```

4. Click **"Save"**

### Step 3: Test Magic Link Flow

1. Navigate to: http://localhost:3000/login
2. Enter your email address
3. Click **"Send Magic Link"** button (currently disabled - need to enable in Login.tsx)
4. **Verify**: Button text changes to "Check your email"
5. Check your email inbox (wait up to 60 seconds)
6. **Expected**: Email from `noreply@mail.app.supabase.io` with subject "Magic Link - Awesome Video Resources"
7. Click the magic link in email
8. **Verify**: Redirects to app and automatically logs you in
9. **Verify**: User created in database with `email_confirmed_at` timestamp

### Step 4: Enable Magic Link Button (Code Change Needed)

**File**: `client/src/pages/Login.tsx`

Find the Magic Link button and remove the `disabled` prop:

```typescript
// BEFORE:
<Button
  variant="outline"
  className="w-full"
  disabled  // ← Remove this
  onClick={handleMagicLink}
>
  <Mail className="h-4 w-4 mr-2" />
  Magic Link
</Button>

// AFTER:
<Button
  variant="outline"
  className="w-full"
  onClick={handleMagicLink}
>
  <Mail className="h-4 w-4 mr-2" />
  Magic Link
</Button>
```

---

## Testing Checklist

### GitHub OAuth ✅
- [ ] OAuth app created with correct callback URL
- [ ] Supabase provider enabled
- [ ] Login flow completes successfully
- [ ] User profile data populated (username, avatar from GitHub)
- [ ] Can access protected routes after login
- [ ] Logout works
- [ ] Re-login works

### Google OAuth ✅
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth client created with correct redirect URI
- [ ] Supabase provider enabled
- [ ] Login flow completes successfully
- [ ] User profile data populated (name, avatar from Google)
- [ ] Can access protected routes
- [ ] Logout and re-login work
- [ ] Multiple signups with same email prevented

### Magic Link ✅
- [ ] SMTP configured (built-in or custom)
- [ ] Email template customized
- [ ] Magic Link button enabled in UI
- [ ] Email received within 60 seconds
- [ ] Link redirects correctly to app
- [ ] User logged in automatically
- [ ] Email confirmed (email_confirmed_at set)
- [ ] Expired links handled gracefully (>1hr old)

---

## Troubleshooting

### GitHub OAuth Issues

**Error: "The redirect_uri must match the registered callback URL"**
- Check OAuth app settings: Must be `https://jeyldoypdkgsrfdhdcmm.supabase.co/auth/v1/callback`
- No trailing slash
- Must be exact match (https, not http)

**Error: "User creation failed"**
- Check Supabase logs: Dashboard → Logs → Auth
- Verify RLS policies allow user creation
- Check email uniqueness (GitHub email may already exist)

### Google OAuth Issues

**Error: "Access blocked: This app's request is invalid"**
- OAuth consent screen not configured
- Missing required scopes (email, profile, openid)
- Authorized redirect URI not set

**Error: "Error 403: access_denied"**
- App status is "Testing" and your email not in test users
- Add your email to test users OR publish the app

### Magic Link Issues

**Email not received**
- Check spam/junk folder
- Verify SMTP settings in Supabase
- Check rate limits (4 emails/hour on free tier)
- Test with different email provider (Gmail, Outlook, etc.)

**Link expired**
- Magic links expire after 1 hour
- Request a new link
- Check system time is correct

**Link doesn't redirect correctly**
- Verify Site URL in Supabase: Project Settings → General → Site URL
- Should be: http://localhost:3000 (dev) or https://yourdomain.com (prod)

---

## Security Considerations

### OAuth Token Storage
- ✅ Access tokens stored in Supabase session (server-side)
- ✅ Refresh tokens encrypted in database
- ✅ Client receives only short-lived JWT (1 hour)
- ✅ Auto-refresh handled by Supabase client

### Email Verification
- **Recommended**: Enable email confirmation for email/password signups
- **Magic Link**: Automatically confirms email when clicked
- **OAuth**: Email pre-verified by provider (GitHub/Google)

### Rate Limiting
- ✅ Supabase enforces rate limits on auth endpoints
- ✅ Magic links: 4 per hour per user
- ✅ Password resets: Similar limits
- ✅ OAuth: Provider-specific limits (GitHub: 5000/hr authenticated)

### Data Privacy
- User emails and profile data stored in `auth.users` table
- Profile images: URLs only (hosted by GitHub/Google)
- No passwords stored for OAuth users
- User can delete account via Supabase dashboard (GDPR compliance)

---

## Next Steps

After completing OAuth setup:
1. **Test all flows thoroughly** (see Testing Checklist above)
2. **Document credentials securely** (use password manager, not git)
3. **Create production OAuth apps** when deploying
4. **Monitor auth logs** for failures (Supabase Dashboard → Logs → Auth)
5. **Set up user role management** (promote first admin manually)

---

## Reference Links

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **GitHub OAuth Apps**: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- **Google OAuth Setup**: https://support.google.com/cloud/answer/6158849
- **Supabase Email Templates**: https://supabase.com/docs/guides/auth/auth-email-templates

---

## Support

For issues with this guide or OAuth configuration:
- Check Supabase Auth logs: Dashboard → Logs → Auth
- Review browser console for client-side errors
- Check server logs: `docker-compose logs -f web`
- Consult: CLAUDE.md for architecture details

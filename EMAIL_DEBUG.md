# Email Debugging Guide

## Quick Checklist

1. **Environment Variables** - Make sure these are set in your `.env.local` file:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=Your Name <noreply@yourdomain.com>
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

   **⚠️ IMPORTANT: Domain Verification**
   - For **testing**: Use `RESEND_FROM_EMAIL=onboarding@resend.dev` (already verified)
   - For **production**: You must verify your domain at https://resend.com/domains
   - The domain in `RESEND_FROM_EMAIL` MUST be verified in Resend

2. **Check Server Logs** - After signing up, check your server console for:
   - `📧 Attempting to send verification email...`
   - `✅ Verification email sent successfully!`
   - Or `❌ Failed to send verification email:` (with error details)

3. **Resend Configuration**:
   - Verify your domain in Resend dashboard
   - Make sure the `RESEND_FROM_EMAIL` matches a verified domain
   - Check Resend API key is valid and has sending permissions

4. **Common Issues**:
   - **"domain is not verified" error**: 
     - **Quick fix for testing**: Set `RESEND_FROM_EMAIL=onboarding@resend.dev` in `.env.local`
     - **For production**: Go to https://resend.com/domains, add your domain, and verify it
     - Make sure the domain in `RESEND_FROM_EMAIL` matches a verified domain in Resend
   - **No logs at all**: Better-auth might not be calling the callback
   - **Error about API key**: `RESEND_API_KEY` not set or invalid
   - **Error about from email**: `RESEND_FROM_EMAIL` not set or domain not verified
   - **Email sent but not received**: Check spam folder, verify domain DNS records

## Quick Fix for Testing

If you're getting "domain is not verified" error, temporarily use Resend's test domain:

```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

This domain is pre-verified by Resend and works immediately for testing.

## Testing

1. Try signing up with a new email
2. Check your server console logs immediately
3. Check your email inbox (and spam folder)
4. Check Resend dashboard for email logs

## Debug Endpoint

You can test email sending by checking the server logs when you sign up. The logs will show:
- Whether better-auth is calling the email function
- Whether Resend API is configured
- Any errors that occur during sending


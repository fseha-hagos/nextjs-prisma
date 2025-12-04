import { Resend } from "resend";

// Validate environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

if (!RESEND_API_KEY) {
  console.error('⚠️ RESEND_API_KEY is not set in environment variables!');
}

if (!RESEND_FROM_EMAIL) {
  console.error('⚠️ RESEND_FROM_EMAIL is not set in environment variables!');
}

export const resend = new Resend(RESEND_API_KEY);

const getFromEmail = () => {
  if (!RESEND_FROM_EMAIL) {
    console.error('❌ RESEND_FROM_EMAIL is missing! Emails cannot be sent.');
    throw new Error('RESEND_FROM_EMAIL environment variable is not configured');
  }
  return RESEND_FROM_EMAIL;
};

export const sendInvitationEmail = async (
  to: string, 
  invitationId: string, 
  inviterName?: string,
  inviterEmail?: string
) => {
  try {
    console.log(`📧 Attempting to send invitation email...`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${inviterName || 'System'} <${inviterEmail || 'system'}>`);
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationId}`;
    console.log(`   Invite link: ${inviteLink}`);
    
    // Extract domain from RESEND_FROM_EMAIL or use default
    const fromEmail = getFromEmail();
    const fromDomain = fromEmail.includes('<') 
      ? fromEmail.match(/<(.+)>/)?.[1] || fromEmail
      : fromEmail;
    
    // Format from field: "Inviter Name <noreply@domain.com>"
    const fromField = inviterName 
      ? `${inviterName} <${fromDomain}>`
      : fromEmail;
    
    // Set reply-to to inviter's email if provided
    const replyTo = inviterEmail || undefined;

    console.log(`   Sending via Resend from: ${fromField}`);
    
    const result = await resend.emails.send({
      from: fromField,
      to,
      replyTo,
      subject: inviterName ? `${inviterName} invited you to join` : "You've been invited!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited!</h2>
          ${inviterName ? `<p><strong>${inviterName}</strong> has invited you to join an organization.</p>` : '<p>You have been invited to join an organization.</p>'}
          <p>Click the button below to accept the invitation:</p>
          <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Accept Invitation</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${inviteLink}</p>
        </div>
      `,
    });

    console.log(`✅ Invitation email sent successfully!`, result);
    return result;
  } catch (error: any) {
    console.error('❌ Failed to send invitation email:', error);
    console.error('   Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    throw error;
  }
};

export const sendVerificationEmail = async (to: string, verificationUrl: string, userName?: string) => {
  try {
    console.log(`📧 Attempting to send verification email...`);
    console.log(`   To: ${to}`);
    console.log(`   Verification URL: ${verificationUrl}`);
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    const fromEmail = getFromEmail();
    console.log(`   From: ${fromEmail}`);
    
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify your email address</h2>
          ${userName ? `<p>Hi ${userName},</p>` : ''}
          <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
        </div>
      `,
    });

    console.log(`✅ Verification email sent successfully!`, result);
    return result;
  } catch (error: any) {
    console.error('❌ Failed to send verification email:', error);
    console.error('   Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    throw error;
  }
};

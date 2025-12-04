import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const getFromEmail = () => {
  return process.env.RESEND_FROM_EMAIL || "noreply@example.com";
};

export const sendInvitationEmail = async (
  to: string, 
  invitationId: string, 
  inviterName?: string,
  inviterEmail?: string
) => {
  console.log(`Sending invitation email from ${inviterName || 'System'} <${inviterEmail || getFromEmail()}>`);
  console.log(`Sending invitation email to ${to}`);
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationId}`;
  
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

  await resend.emails.send({
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
};

export const sendVerificationEmail = async (to: string, verificationUrl: string, userName?: string) => {
  console.log(`Sending verification email to ${to}`);
  
  await resend.emails.send({
    from: getFromEmail(),
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
};

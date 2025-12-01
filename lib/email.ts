import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async (to: string, invitationId: string, from?: string) => {
    // alert(`Sending invitation email to ${to}`);
    console.log(`Sending invitation email from ${from}`);
    console.log(`Sending invitation email to ${to}`);
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationId}`;

  await resend.emails.send({
    from: from || process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "You’ve been invited!",
    html: `
      <p>You have been invited to join an organization.</p>
      <p>Click here to accept invitation:</p>
      <a href="${inviteLink}">${inviteLink}</a>
    `,
  });
};
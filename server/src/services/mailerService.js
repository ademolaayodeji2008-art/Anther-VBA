import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465;

  transporter =
    process.env.NODE_ENV === "test"
      ? nodemailer.createTransport({ jsonTransport: true })
      : nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          // Explicit timeouts so Render doesn't hang if SMTP is blocked
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
  return transporter;
}

export async function sendMail({ to, subject, html }) {
  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(user, token) {
  const link = `${process.env.APP_URL}/verify-email?email=${encodeURIComponent(
    user.email
  )}&token=${token}`;

  return sendMail({
    to: user.email,
    subject: "Verify your AVIV ERP account",
    html: `
      <p>Hi ${user.name},</p>
      <p>An account has been created for you on AVIV ERP. Click the link below to verify your email and activate your account:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || '"LoopLive" <no-reply@looplive.ai>';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendEmail(options: { to: string; subject: string; text: string; html: string }) {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(`[Email] ⚠️ SMTP not configured. Email to ${options.to} will only be logged to console.`);
    console.log(`[Email][DEV] Subject: ${options.subject}`);
    console.log(`[Email][DEV] Content: ${options.text}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[Email] Sent to ${options.to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email] Failed to send email to ${options.to}:`, error);
    throw error;
  }
}

export async function sendOTPEmail(email: string, otp: string) {
  return sendEmail({
    to: email,
    subject: `Your Verification Code: ${otp}`,
    text: `Welcome to LoopLive! Your verification code is ${otp}. It will expire in 5 minutes.`,
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b;">Verification Code</h2>
          <p style="color: #64748b;">Welcome to LoopLive! Use the code below to complete your registration.</p>
          <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #3b82f6;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 5 minutes. If you didn't request this code, please ignore this email.</p>
        </div>
      `,
  });
}

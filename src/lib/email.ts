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

export async function sendOTPEmail(email: string, otp: string) {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[Email] ⚠️ SMTP not configured. OTP will only be logged to console.");
    console.log(`[Email][OTP-DEV] Code for ${email}: ${otp}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `Your Verification Code: ${otp}`,
      text: `Welcome to LoopLive! Your verification code is ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #1e293b;">Verification Code</h2>
          <p style="color: #64748b;">Welcome to LoopLive! Use the code below to complete your registration.</p>
          <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #3b82f6;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 5 minutes. If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`[Email] OTP sent to ${email}. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email] Failed to send OTP email to ${email}:`, error);
    throw new Error("Failed to send verification email.");
  }
}

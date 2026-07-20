import nodemailer from "nodemailer";
import { config } from "../config/env";

const createTransporter = () => {
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
};

export const sendOtpEmail = async (email: string, otp: string): Promise<void> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n📧 OTP for ${email}: ${otp}\n`);
    return;
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: "Your Login OTP - Employee Management System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af;">Employee Management System</h2>
        <p>Your one-time password for login is:</p>
        <div style="background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This OTP expires in ${config.otpExpiryMinutes} minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
};

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

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const transporter = createTransporter();
  const loginUrl = config.frontendUrl;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1e40af;">Welcome to Employee Management System</h2>
      <p>Hi ${name},</p>
      <p>Your employee account has been created. You can sign in using OTP at the link below.</p>
      <p><strong>Login email:</strong> ${email}</p>
      <p style="margin: 24px 0;">
        <a href="${loginUrl}" style="background: #2563eb; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Open Employee Portal
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">Website: <a href="${loginUrl}">${loginUrl}</a></p>
      <p style="color: #64748b; font-size: 14px;">Use your email to request a one-time password and log in.</p>
    </div>
  `;

  if (!transporter) {
    console.log(`\n📧 Welcome email for ${email} (${name})\nLogin: ${email}\nURL: ${loginUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: "Welcome to Employee Management System",
    html,
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

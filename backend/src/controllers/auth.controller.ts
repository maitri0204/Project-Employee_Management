import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../types";
import { generateToken } from "../utils/jwt";
import { generateOtp } from "../utils/otp";
import { sendOtpEmail } from "../utils/email";
import { sendError, sendSuccess } from "../utils/response";
import { config } from "../config/env";

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, "Please provide your email address.");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return sendError(
        res,
        "No account found with this email. Please contact your administrator.",
        404
      );
    }

    await prisma.otp.deleteMany({
      where: { email: email.toLowerCase().trim() },
    });

    const otp = generateOtp();
    const expiresAt = new Date(
      Date.now() + config.otpExpiryMinutes * 60 * 1000
    );

    await prisma.otp.create({
      data: {
        email: email.toLowerCase().trim(),
        code: otp,
        expiresAt,
      },
    });

    await sendOtpEmail(email.toLowerCase().trim(), otp);

    return sendSuccess(res, "OTP sent to your email address.");
  } catch (error) {
    console.error("Send OTP error:", error);
    return sendError(res, "Failed to send OTP. Please try again.", 500);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendError(res, "Please provide email and OTP.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await prisma.otp.findFirst({
      where: { email: normalizedEmail, code: otp },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return sendError(res, "Invalid OTP. Please try again.", 401);
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      return sendError(res, "OTP has expired. Please request a new one.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        employee: {
          include: { leaveBalance: true },
        },
      },
    });

    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    await prisma.otp.delete({ where: { id: otpRecord.id } });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as "ADMIN" | "EMPLOYEE",
    });

    return sendSuccess(res, "Login successful.", { user, token });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return sendError(res, "Failed to verify OTP.", 500);
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: { leaveBalance: true },
        },
      },
    });

    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    return sendSuccess(res, "Profile fetched successfully.", user);
  } catch (error) {
    console.error("Get me error:", error);
    return sendError(res, "Failed to fetch profile.", 500);
  }
};

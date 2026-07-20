import { Router } from "express";
import { sendOtp, verifyOtp, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", authenticate, getMe);

export default router;

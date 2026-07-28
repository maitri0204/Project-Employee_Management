import { Router } from "express";
import { getPolicy, updatePolicy } from "../controllers/leavePolicy.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get("/", getPolicy);
router.put("/", updatePolicy);

export default router;

import { Router } from "express";
import { getPolicy, updatePolicy } from "../controllers/leavePolicy.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", getPolicy);
router.put("/", updatePolicy);

export default router;

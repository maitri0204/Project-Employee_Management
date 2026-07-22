import { Router } from "express";
import {
  deleteHrPolicyDocument,
  downloadHrPolicyDocument,
  listHrPolicyDocuments,
  uploadHrPolicyDocument,
  viewHrPolicyDocument,
} from "../controllers/hrPolicy.controller";
import { authenticate, authorize } from "../middleware/auth";
import { handleHrPolicyUpload } from "../middleware/hrPolicyUpload";

const router = Router();

router.use(authenticate);

router.get("/", listHrPolicyDocuments);
router.get("/:id/view", viewHrPolicyDocument);
router.get("/:id/download", authorize("ADMIN"), downloadHrPolicyDocument);
router.post("/", authorize("ADMIN"), handleHrPolicyUpload, uploadHrPolicyDocument);
router.delete("/:id", authorize("ADMIN"), deleteHrPolicyDocument);

export default router;

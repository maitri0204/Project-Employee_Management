import { Router } from "express";
import {
  deleteHrPolicyDocument,
  downloadHrPolicyDocument,
  listHrPolicyDocuments,
  uploadHrPolicyDocument,
  viewHrPolicyDocument,
} from "../controllers/hrPolicy.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import { handleHrPolicyUpload } from "../middleware/hrPolicyUpload";

const router = Router();

router.use(authenticate);

router.get("/", listHrPolicyDocuments);
router.get("/:id/view", viewHrPolicyDocument);
router.get("/:id/download", authorizeAdmin, downloadHrPolicyDocument);
router.post("/", authorizeAdmin, handleHrPolicyUpload, uploadHrPolicyDocument);
router.delete("/:id", authorizeAdmin, deleteHrPolicyDocument);

export default router;

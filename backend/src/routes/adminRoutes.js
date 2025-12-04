import express from "express";
import {
  getUsers,
  createUser,
  removeUser,
  resetPassword,
  updateReportTo,
  removeReportTo,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", getUsers);
router.post("/users", createUser);
router.delete("/users/:empCode", removeUser);
router.post("/users/:empCode/reset-password", resetPassword);
router.post("/users/:empCode/report-to", updateReportTo);
router.delete("/users/:empCode/report-to/:managerEmpCode", removeReportTo);

export default router;

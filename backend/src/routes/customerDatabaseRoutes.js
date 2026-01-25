import express from "express";
import {
  createCustomer,
  getCustomers,
  getMyCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  checkMobile,
  getTeamCustomers,
} from "../controllers/customerDatabaseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ✅ Create new customer
router.post("/", createCustomer);

// ✅ Get all customers (Admin)
router.get("/all", getCustomers);

// ✅ Get my customers (Employee)
router.get("/my", getMyCustomers);

// ✅ Get team customers (Manager/BM/RM)
router.get("/team", getTeamCustomers);

// ✅ Check if mobile exists
router.get("/check/:mobile/:type", checkMobile);

// ✅ Get/Update/Delete by ID
router.get("/:id", getCustomerById);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;

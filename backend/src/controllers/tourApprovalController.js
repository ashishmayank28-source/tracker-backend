import TourApproval from "../models/tourApprovalModel.js";
import User from "../models/userModel.js";
import { getScopedEmpCodes, isEmpInScope } from "../utils/scopeUtils.js";
import { verifyCustomerIdsForEmployee } from "../utils/customerIdVerification.js";
import { publicUrlFromDiskFile } from "../utils/uploadsPath.js";

function parseLocalDate(value) {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* =============================================================
   📤 Create Tour Request (Employee)
============================================================= */
export const createTourRequest = async (req, res) => {
  try {
    const empCode = req.user?.empCode;
    const { toLocation, purpose, requestDate } = req.body;

    if (!toLocation || !purpose) {
      return res.status(400).json({ message: "Location and Purpose are required" });
    }

    if (!requestDate) {
      return res.status(400).json({ message: "Tour date is required" });
    }

    const parsedDate = parseLocalDate(requestDate);
    if (!parsedDate) {
      return res.status(400).json({ message: "Invalid tour date" });
    }

    // ✅ Fetch full employee data from database to get correct reporting manager
    const emp = await User.findOne({ empCode }).lean();
    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log("🔍 Employee data:", emp.empCode, emp.name, emp.managerEmpCode, emp.reportTo);

    // ✅ Find reporting manager from multiple sources
    let managerCode = null;
    let managerName = "-";

    // Priority 1: reportTo.empCode
    if (emp.reportTo && emp.reportTo.empCode) {
      managerCode = emp.reportTo.empCode;
    }
    // Priority 2: managerEmpCode
    else if (emp.managerEmpCode) {
      managerCode = emp.managerEmpCode;
    }

    // ✅ Fetch manager details if managerCode found
    if (managerCode) {
      const manager = await User.findOne({ empCode: managerCode });
      if (manager) {
        managerName = manager.name;
        console.log("✅ Found manager:", managerCode, managerName);
      }
    }

    // ✅ If no manager found, set to branch/region manager or admin
    if (!managerCode || managerCode === "-") {
      console.log("⚠️ No direct manager found, looking for branch manager...");
      // Find branch manager
      const bmUser = await User.findOne({ 
        branch: emp.branch, 
        role: { $in: ["BranchManager", "Manager"] }
      });
      if (bmUser && bmUser.empCode !== empCode) {
        managerCode = bmUser.empCode;
        managerName = bmUser.name;
        console.log("✅ Found BM:", managerCode, managerName);
      }
    }

    const tourRequest = new TourApproval({
      empCode: emp.empCode,
      empName: emp.name,
      branch: emp.branch || "-",
      region: emp.region || "-",
      managerCode: managerCode || "ADMIN",
      managerName: managerName || "Admin",
      toLocation: String(toLocation).trim(),
      purpose: String(purpose).trim(),
      requestDate: parsedDate,
      status: "Pending",
    });

    await tourRequest.save();
    console.log("✅ Tour request saved:", tourRequest._id, "Manager:", managerCode);

    res.json({
      success: true,
      message: "✅ Tour request submitted successfully!",
      data: tourRequest,
    });
  } catch (err) {
    console.error("Create Tour Request Error:", err);
    res.status(500).json({ message: "Failed to submit tour request" });
  }
};

/* =============================================================
   📋 Get Employee's Tour Requests
============================================================= */
export const getMyTourRequests = async (req, res) => {
  try {
    const empCode = req.user?.empCode;

    const requests = await TourApproval.find({ empCode })
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error("Get My Tour Requests Error:", err);
    res.status(500).json({ message: "Failed to fetch tour requests" });
  }
};

/* =============================================================
   📋 Get Tour Requests for Manager (Pending Approvals)
============================================================= */
export const getManagerTourRequests = async (req, res) => {
  try {
    const scopedCodes = await getScopedEmpCodes(req.user);
    if (!scopedCodes.length) {
      return res.json([]);
    }

    const requests = await TourApproval.find({
      empCode: { $in: scopedCodes },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error("Get Manager Tour Requests Error:", err);
    res.status(500).json({ message: "Failed to fetch tour requests" });
  }
};

/* =============================================================
   📋 Get All Tour Requests (Admin)
============================================================= */
export const getAllTourRequests = async (req, res) => {
  try {
    if (req.user.role === "RegionalManager") {
      const scopedCodes = await getScopedEmpCodes(req.user);
      const requests = await TourApproval.find({ empCode: { $in: scopedCodes } })
        .sort({ createdAt: -1 })
        .lean();
      return res.json(requests);
    }

    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const requests = await TourApproval.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error("Get All Tour Requests Error:", err);
    res.status(500).json({ message: "Failed to fetch tour requests" });
  }
};

/* =============================================================
   ✅ Approve Tour Request (Manager/BM)
============================================================= */
export const approveTourRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approver = req.user;

    const existing = await TourApproval.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Tour request not found" });
    }
    if (!(await isEmpInScope(approver, existing.empCode))) {
      return res.status(403).json({ message: "Not authorized to approve this request" });
    }

    const approvedByName = `${approver.empCode} - ${approver.name}`;

    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        status: "Approved",
        approvedBy: approvedByName,
        approvedByCode: approver.empCode, // ✅ Store manager empCode for expense verification
        approvedDate: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Tour request not found" });
    }

    res.json({
      success: true,
      message: "✅ Tour request approved!",
      data: updated,
    });
  } catch (err) {
    console.error("Approve Tour Request Error:", err);
    res.status(500).json({ message: "Failed to approve request" });
  }
};

/* =============================================================
   ❌ Reject Tour Request (Manager/BM)
============================================================= */
export const rejectTourRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rejecter = req.user;

    const existing = await TourApproval.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Tour request not found" });
    }
    if (!(await isEmpInScope(rejecter, existing.empCode))) {
      return res.status(403).json({ message: "Not authorized to reject this request" });
    }

    const rejectedByName = `${rejecter.empCode} - ${rejecter.name}`;

    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        status: "Rejected",
        rejectedBy: rejectedByName,
        rejectedDate: new Date(),
        rejectReason: reason || "Rejected by Manager",
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Tour request not found" });
    }

    res.json({
      success: true,
      message: "❌ Tour request rejected!",
      data: updated,
    });
  } catch (err) {
    console.error("Reject Tour Request Error:", err);
    res.status(500).json({ message: "Failed to reject request" });
  }
};

/* =============================================================
   💰 Submit Expenses with Files (Employee - After Tour)
============================================================= */
export const submitTourExpenses = async (req, res) => {
  try {
    const { id } = req.params;
    const { travelExpense, foodExpense, accommodationExpense, remarks } = req.body;
    const empCode = req.user?.empCode;

    const tourRequest = await TourApproval.findById(id);

    if (!tourRequest) {
      return res.status(404).json({ message: "Tour request not found" });
    }

    if (tourRequest.empCode !== empCode) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (tourRequest.status !== "Approved") {
      return res.status(400).json({ message: "Tour must be approved first" });
    }

    const verification = await verifyCustomerIdsForEmployee(
      empCode,
      req.body.customerIds ?? req.body.visitedCustomerIds
    );
    if (!verification.ok) {
      return res.status(400).json({
        success: false,
        message: verification.message,
        failedIds: verification.failedIds,
      });
    }

    const travel = Number(travelExpense) || 0;
    const food = Number(foodExpense) || 0;
    const accommodation = Number(accommodationExpense) || 0;
    const total = travel + food + accommodation;

    // ✅ Handle file uploads (bills, tickets, invoices)
    const files = req.files || {};
    const billsUrl = publicUrlFromDiskFile(files.bills?.[0]);
    const ticketsUrl = publicUrlFromDiskFile(files.tickets?.[0]);
    const invoicesUrl = publicUrlFromDiskFile(files.invoices?.[0]);

    console.log("📄 Expense files:", { billsUrl, ticketsUrl, invoicesUrl });

    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        expensesFilled: true,
        travelExpense: travel,
        foodExpense: food,
        accommodationExpense: accommodation,
        totalExpense: total,
        expenseDate: new Date(),
        expenseRemarks: remarks || "",
        visitedCustomerIds: verification.normalizedIds,
        billsUrl,
        ticketsUrl,
        invoicesUrl,
        status: "ExpenseSubmitted", // ✅ Pending verification by manager
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "✅ Expenses submitted! Waiting for manager verification.",
      data: updated,
    });
  } catch (err) {
    console.error("Submit Expenses Error:", err);
    res.status(500).json({ message: "Failed to submit expenses" });
  }
};

/* =============================================================
   ✅ Verify Expenses (Same Manager who approved the tour)
============================================================= */
export const verifyTourExpenses = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationRemarks } = req.body;
    const verifier = req.user;

    const tourRequest = await TourApproval.findById(id);
    if (!tourRequest) {
      return res.status(404).json({ message: "Tour request not found" });
    }
    if (!(await isEmpInScope(verifier, tourRequest.empCode))) {
      return res.status(403).json({ message: "Not authorized to verify this request" });
    }

    // ✅ Only the same manager who approved can verify
    if (tourRequest.approvedByCode !== verifier.empCode) {
      return res.status(403).json({ 
        message: `Only the approving manager (${tourRequest.approvedBy}) can verify expenses` 
      });
    }

    if (tourRequest.status !== "ExpenseSubmitted") {
      return res.status(400).json({ message: "Expenses not submitted yet" });
    }    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        expenseVerified: true,
        verifiedBy: `${verifier.empCode} - ${verifier.name}`,
        verifiedByCode: verifier.empCode,
        verifiedDate: new Date(),
        verificationRemarks: verificationRemarks || "",
        status: "Completed", // ✅ Now complete after verification
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "✅ Expenses verified! Tour marked as completed.",
      data: updated,
    });
  } catch (err) {
    console.error("Verify Expenses Error:", err);
    res.status(500).json({ message: "Failed to verify expenses" });
  }
};

/* =============================================================
   ❌ Reject Expenses (Same Manager who approved the tour)
============================================================= */
export const rejectTourExpenses = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const verifier = req.user;

    const tourRequest = await TourApproval.findById(id);

    if (!tourRequest) {
      return res.status(404).json({ message: "Tour request not found" });
    }

    if (!(await isEmpInScope(verifier, tourRequest.empCode))) {
      return res.status(403).json({ message: "Not authorized to reject this request" });
    }

    // ✅ Only the same manager who approved can reject expenses
    if (tourRequest.approvedByCode !== verifier.empCode) {
      return res.status(403).json({ 
        message: `Only the approving manager (${tourRequest.approvedBy}) can reject expenses` 
      });
    }

    // Reset to Approved status so employee can resubmit
    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        expensesFilled: false,
        status: "Approved", // ✅ Back to approved so employee can resubmit
        verificationRemarks: reason || "Expenses rejected - please resubmit",
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "❌ Expenses rejected. Employee can resubmit.",
      data: updated,
    });
  } catch (err) {
    console.error("Reject Expenses Error:", err);
    res.status(500).json({ message: "Failed to reject expenses" });
  }
};
/* =============================================================
   💰 Mark as Reimbursed (Admin - After salary payment)
============================================================= */
export const markAsReimbursed = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    const tourRequest = await TourApproval.findById(id);

    if (!tourRequest) {
      return res.status(404).json({ message: "Tour request not found" });
    }

    // ✅ Only allow if status is Completed (expenses verified)
    if (tourRequest.status !== "Completed") {
      return res.status(400).json({ 
        message: "Tour must be completed (expenses verified) before marking as reimbursed" 
      });
    }

    if (tourRequest.reimbursed) {
      return res.status(400).json({ message: "This tour is already reimbursed" });
    }

    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        reimbursed: true,
        reimbursedBy: `${admin.empCode} - ${admin.name}`,
        reimbursedDate: new Date(),
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "✅ Tour marked as reimbursed!",
      data: updated,
    });
  } catch (err) {
    console.error("Mark as Reimbursed Error:", err);
    res.status(500).json({ message: "Failed to mark as reimbursed" });
  }
};

/* =============================================================
   🔍 Verify Customer IDs against the employee's own visit reports
============================================================= */
export const verifyCustomerIds = async (req, res) => {
  try {
    const empCode = req.user?.empCode;
    if (!empCode) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const verification = await verifyCustomerIdsForEmployee(
      empCode,
      req.body.customerIds ?? req.body.visitedCustomerIds
    );

    return res.status(verification.ok ? 200 : 400).json({
      success: verification.ok,
      message: verification.message,
      customerIds: verification.normalizedIds,
      failedIds: verification.failedIds,
    });
  } catch (err) {
    console.error("Verify Customer IDs Error:", err);
    res.status(500).json({ message: "Failed to verify Customer IDs" });
  }
};

/* =============================================================
   💰 Bulk Mark as Reimbursed (Admin only)
============================================================= */
export const bulkMarkAsReimbursed = async (req, res) => {
  try {
    const admin = req.user;
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];

    if (!ids.length) {
      return res.status(400).json({ message: "No tour request IDs were provided" });
    }

    const reimbursedBy = `${admin.empCode} - ${admin.name}`;
    const reimbursedDate = new Date();
    const results = [];
    let successCount = 0;
    let failCount = 0;
    let totalAmount = 0;

    for (const id of ids) {
      const tourRequest = await TourApproval.findById(id);
      if (!tourRequest) {
        results.push({ id, success: false, message: "Tour request not found" });
        failCount += 1;
        continue;
      }

      if (tourRequest.status !== "Completed") {
        results.push({
          id,
          success: false,
          empCode: tourRequest.empCode,
          empName: tourRequest.empName,
          amount: tourRequest.totalExpense || 0,
          message: "Tour must be completed (expenses verified) before marking as reimbursed",
        });
        failCount += 1;
        continue;
      }

      if (tourRequest.reimbursed) {
        results.push({
          id,
          success: false,
          empCode: tourRequest.empCode,
          empName: tourRequest.empName,
          amount: tourRequest.totalExpense || 0,
          message: "This tour is already reimbursed",
        });
        failCount += 1;
        continue;
      }

      tourRequest.reimbursed = true;
      tourRequest.reimbursedBy = reimbursedBy;
      tourRequest.reimbursedDate = reimbursedDate;
      await tourRequest.save();

      const amount = tourRequest.totalExpense || 0;
      results.push({
        id,
        success: true,
        empCode: tourRequest.empCode,
        empName: tourRequest.empName,
        amount,
      });
      successCount += 1;
      totalAmount += amount;
    }

    res.json({
      success: failCount === 0,
      successCount,
      failCount,
      totalAmount,
      results,
      message:
        failCount === 0
          ? `${successCount} tour${successCount === 1 ? "" : "s"} marked as reimbursed.`
          : successCount === 0
          ? "No tours were marked as reimbursed."
          : `${successCount} reimbursed, ${failCount} failed.`,
    });
  } catch (err) {
    console.error("Bulk Mark as Reimbursed Error:", err);
    res.status(500).json({ message: "Failed to process bulk reimbursement" });
  }
};

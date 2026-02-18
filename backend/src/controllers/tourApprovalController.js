import TourApproval from "../models/tourApprovalModel.js";
import User from "../models/userModel.js";

/* =============================================================
   📤 Create Tour Request (Employee)
============================================================= */
export const createTourRequest = async (req, res) => {
  try {
    const empCode = req.user?.empCode;
    const { toLocation, purpose } = req.body;

    if (!toLocation || !purpose) {
      return res.status(400).json({ message: "Location and Purpose are required" });
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
      toLocation,
      purpose,
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
    const managerCode = req.user?.empCode;
    
    // ✅ Fetch full manager data from database
    const managerData = await User.findOne({ empCode: managerCode }).lean();
    const managerBranch = managerData?.branch;
    const managerRegion = managerData?.region;
    const managerRole = managerData?.role;

    console.log("🔍 Manager looking for requests:", managerCode, "Branch:", managerBranch, "Role:", managerRole);

    // Get direct reports
    const directReports = await User.find({
      $or: [
        { managerEmpCode: managerCode },
        { "reportTo.empCode": managerCode },
      ],
    }).lean();

    const empCodes = directReports.map(e => e.empCode);
    console.log("🔍 Direct reports count:", directReports.length, empCodes);

    // ✅ Also get all employees in same branch if BM or Manager
    let branchEmpCodes = [];
    if (managerRole === "BranchManager" || managerRole === "Manager") {
      const branchEmployees = await User.find({ branch: managerBranch }).lean();
      branchEmpCodes = branchEmployees.map(e => e.empCode);
      console.log("🔍 Branch employees count:", branchEmployees.length);
    }

    // ✅ If Regional Manager, get all from region
    let regionEmpCodes = [];
    if (managerRole === "RegionalManager") {
      const regionEmployees = await User.find({ region: managerRegion }).lean();
      regionEmpCodes = regionEmployees.map(e => e.empCode);
      console.log("🔍 Region employees count:", regionEmployees.length);
    }

    // ✅ Combine all possible employee codes
    const allEmpCodes = [...new Set([...empCodes, ...branchEmpCodes, ...regionEmpCodes])];
    console.log("🔍 Total employee codes to search:", allEmpCodes.length);

    // Get all tour requests from direct reports OR where managerCode matches
    const requests = await TourApproval.find({
      $or: [
        { managerCode: managerCode },
        { empCode: { $in: allEmpCodes } },
        ...(managerBranch ? [{ branch: managerBranch }] : []),
        ...(managerRegion && managerRole === "RegionalManager" ? [{ region: managerRegion }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("✅ Tour requests found for manager:", requests.length);
    if (requests.length > 0) {
      console.log("📋 First request:", requests[0].empName, requests[0].toLocation, requests[0].status);
    }

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
    console.log("🔍 Admin fetching all tour requests...");
    
    const requests = await TourApproval.find()
      .sort({ createdAt: -1 })
      .lean();

    console.log("✅ Found tour requests:", requests.length);
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

    const travel = Number(travelExpense) || 0;
    const food = Number(foodExpense) || 0;
    const accommodation = Number(accommodationExpense) || 0;
    const total = travel + food + accommodation;

    // ✅ Handle file uploads (bills, tickets, invoices)
    const files = req.files || {};
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    
    const billsUrl = files.bills?.[0] 
      ? `/uploads/${year}/${month}/${files.bills[0].filename}` 
      : "";
    const ticketsUrl = files.tickets?.[0] 
      ? `/uploads/${year}/${month}/${files.tickets[0].filename}` 
      : "";
    const invoicesUrl = files.invoices?.[0] 
      ? `/uploads/${year}/${month}/${files.invoices[0].filename}` 
      : "";

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

    const tourRequest = await TourApproval.findById(id);    if (!tourRequest) {
      return res.status(404).json({ message: "Tour request not found" });
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

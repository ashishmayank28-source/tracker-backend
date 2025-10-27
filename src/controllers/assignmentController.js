import Assignment from "../models/assignmentModel.js";

/* ---------- Admin Assignment ---------- */
export const createAdminAssignment = async (req, res) => {
  try {
    const newAssignment = new Assignment(req.body);
    await newAssignment.save();
    res.status(201).json(newAssignment);
  } catch (err) {
    console.error("Admin assignment error:", err);
    res.status(500).json({ message: "Failed to create admin assignment" });
  }
};

/* ---------- Admin History ---------- */
export const getAdminHistory = async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ date: -1 });
    res.json(assignments);
  } catch (err) {
    console.error("Fetch admin history error:", err);
    res.status(500).json({ message: "Failed to fetch admin history" });
  }
};

/* ---------- Regional Manager Stock ---------- */
export const getRegionalStock = async (req, res) => {
  try {
    const rmAssignments = await Assignment.find({
      "employees.empCode": req.user.empCode,
    });

    const stockMap = {};
    rmAssignments.forEach((a) => {
      a.employees.forEach((emp) => {
        if (emp.empCode === req.user.empCode) {
          stockMap[a.item] = (stockMap[a.item] || 0) + (emp.qty || 0);
        }
      });
    });

    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      stock: stockMap[k],
    }));

    res.json({ stock, assignments: rmAssignments });
  } catch (err) {
    console.error("RM stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch RM stock" });
  }
};

/* ---------- Regional Manager Allocation ---------- */
export const allocateRegional = async (req, res) => {
  try {
    const { rootId, item, employees, purpose, assignedBy, region } = req.body;
    const rmId = "RM" + Date.now();

    const assignment = new Assignment({
      rootId,
      rmId,
      item,
      employees,
      purpose,
      assignedBy,
      role: "RegionalManager",
      region,
      date: new Date().toLocaleString(),
      toVendor: false,
    });

    await assignment.save();
    res.json(assignment);
  } catch (err) {
    console.error("RM allocation error:", err);
    res.status(500).json({ message: "Failed to create RM assignment" });
  }
};

/* ---------- Branch Manager Stock ---------- */
export const getBranchStock = async (req, res) => {
  try {
    // 🔹 Fetch both allocations where BM is receiver OR BM created
    const bmAssignments = await Assignment.find({
      $or: [
        { "employees.empCode": req.user.empCode },  // received from RM
        { assignedBy: req.user.name },              // created by this BM
      ],
    }).sort({ date: -1 });

    const stockMap = {};
    bmAssignments.forEach((a) => {
      a.employees.forEach((emp) => {
        if (emp.empCode === req.user.empCode) {
          stockMap[a.item] = (stockMap[a.item] || 0) + (emp.qty || 0);
        }
      });
    });

    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      stock: stockMap[k],
    }));

    res.json({ stock, assignments: bmAssignments });
  } catch (err) {
    console.error("BM stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch BM stock" });
  }
};

/* ---------- Branch Manager Allocation ---------- */
export const createBranchAssignment = async (req, res) => {
  try {
    const { rootId, rmId, item, employees, purpose, assignedBy, region } = req.body;
    const bmId = "BM" + Date.now();

    const assignment = new Assignment({
      rootId,
      rmId,
      bmId,
      item,
      employees,
      purpose,
      assignedBy,
      role: "BranchManager",
      region,
      date: new Date().toLocaleString(),
      toVendor: false,
    });

    await assignment.save();
    res.json(assignment);
  } catch (err) {
    console.error("BM allocation error:", err);
    res.status(500).json({ message: "Failed to create BM assignment" });
  }
};

/* ---------- Manager Stock ---------- */
export const getManagerStock = async (req, res) => {
  try {
    const mgrAssignments = await Assignment.find({
      "employees.empCode": req.user.empCode,
    });

    const stockMap = {};
    mgrAssignments.forEach((a) => {
      a.employees.forEach((emp) => {
        if (emp.empCode === req.user.empCode) {
          stockMap[a.item] = (stockMap[a.item] || 0) + (emp.qty || 0);
        }
      });
    });

    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      stock: stockMap[k],
    }));

    res.json({ stock, assignments: mgrAssignments });
  } catch (err) {
    console.error("Manager stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch Manager stock" });
  }
};

/* ---------- Manager Allocation ---------- */
export const allocateManager = async (req, res) => {
  try {
    const { rootId, rmId, bmId, item, employees, purpose, assignedBy, region } = req.body;
    const managerId = "MGR" + Date.now();

    const newAssign = new Assignment({
      rootId,
      rmId,
      bmId,
      managerId,
      item,
      employees,
      purpose,
      assignedBy,
      role: "Manager",
      region,
      date: new Date().toLocaleString(),
    });

    await newAssign.save();
    res.json(newAssign);
  } catch (err) {
    console.error("Manager allocation error:", err);
    res.status(500).json({ message: "Failed to allocate by Manager" });
  }
};

/* ---------- Employee Stock ---------- */
export const getEmployeeStock = async (req, res) => {
  try {
    const { empCode } = req.params;
    const assignments = await Assignment.find({
      "employees.empCode": empCode,
    }).sort({ date: -1 });

    const stockMap = {};
    assignments.forEach((a) => {
      a.employees.forEach((emp) => {
        if (emp.empCode === empCode) {
          stockMap[a.item] = (stockMap[a.item] || 0) + (emp.qty || 0);
        }
      });
    });

    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      stock: stockMap[k],
    }));

    res.json({ stock, assignments });
  } catch (err) {
    console.error("Employee stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch employee stock" });
  }
};

/* ---------- TO VENDOR ---------- */
export const submitToVendor = async (req, res) => {
  try {
    const { rootId } = req.params;
    if (!rootId) {
      return res.status(400).json({ success: false, message: "Root ID missing" });
    }

    // 🔍 Find all related assignments (Admin / RM / BM / Manager) with same rootId
    const relatedAssignments = await Assignment.find({
      $or: [{ rootId }, { rmId: rootId }, { bmId: rootId }],
    });

    if (!relatedAssignments.length) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // ✅ Check if ANY has project/marketing purpose
    const projectAssignment = relatedAssignments.find((a) =>
      (a.purpose || "").toLowerCase().includes("project") ||
      (a.purpose || "").toLowerCase().includes("marketing")
    );

    if (!projectAssignment) {
      return res.status(400).json({
        success: false,
        message: "Only Project/Marketing assignments can be sent to vendor",
      });
    }

    // ✅ Mark all related as sent to vendor
    await Assignment.updateMany(
      {
        $or: [
          { rootId },
          { rmId: rootId },
          { bmId: rootId },
        ],
      },
      { $set: { toVendor: true, dispatchedAt: new Date() } }
    );

    res.json({
      success: true,
      message: "✅ Sent to Vendor Successfully",
    });
  } catch (err) {
    console.error("Dispatch to Vendor Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while dispatching to vendor",
      error: err.message,
    });
  }
};
/* ---------- LR UPDATE ---------- */
export const updateLRNo = async (req, res) => {
  try {
    const { rootId } = req.params;
    const { lrNo } = req.body;

    // 1️⃣ Find the base assignment first
    const base = await Assignment.findOne({ rootId });
    if (!base)
      return res.status(404).json({ success: false, message: "Assignment not found" });

    // 2️⃣ Determine what to use as base key
    let query = {};

    if (base.bmId && base.bmId.trim() !== "") {
      // Case: BM level
      query = { bmId: base.bmId };
    } else if (base.rmId && base.rmId.trim() !== "") {
      // Case: RM level
      query = { rmId: base.rmId };
    } else {
      // Case: Root/Admin level
      query = { rootId: base.rootId };
    }

    // 3️⃣ Update LR No everywhere matching that base key
    const result = await Assignment.updateMany(
      query,
      { $set: { lrNo, lrUpdatedAt: new Date().toLocaleString() } }
    );

    res.json({
      success: true,
      message: `LR No updated for ${result.modifiedCount} record(s)`,
    });
  } catch (err) {
    console.error("LR update error:", err);
    res.status(500).json({ success: false, message: "Failed to update LR No" });
  }
};

/* 🔹 Vendor list - only Project/Marketing + sent to vendor */
export const getVendorList = async (req, res) => {
  try {
    const list = await Assignment.find({
      purpose: /project/i,
      toVendor: true,
    }).sort({ date: -1 });

    res.json(list);
  } catch (err) {
    console.error("Vendor list error:", err);
    res.status(500).json({ message: "Server error fetching vendor list" });
  }
};
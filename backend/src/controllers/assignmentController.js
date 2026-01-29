import Assignment from "../models/assignmentModel.js";
import User from "../models/userModel.js";

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
    const userEmpCode = req.user.empCode;
    const userName = req.user.name;

    // 🔹 Fetch all assignments where RM is involved
    const rmAssignments = await Assignment.find({
      $or: [
        { "employees.empCode": userEmpCode },  // received from Admin
        { assignerEmpCode: userEmpCode },      // assigned by this RM (using empCode)
        { assignedBy: userName },              // assigned by this RM (using name)
      ],
    }).sort({ date: -1 });

    // 🔹 Calculate stock: Received - Used - Assigned Out
    const stockMap = {};
    
    rmAssignments.forEach((a) => {
      const item = a.item;
      if (!stockMap[item]) {
        stockMap[item] = { received: 0, used: 0, assignedOut: 0 };
      }

      // ✅ Count RECEIVED qty (when RM is in employees array)
      a.employees.forEach((emp) => {
        if (emp.empCode === userEmpCode) {
          stockMap[item].received += (emp.qty || 0);
          stockMap[item].used += (emp.usedQty || 0);
        }
      });

      // ✅ Count ASSIGNED OUT qty (when RM assigned to others)
      if (a.assignerEmpCode === userEmpCode || a.assignedBy === userName) {
        a.employees.forEach((emp) => {
          // Don't count if assigned to self
          if (emp.empCode !== userEmpCode) {
            stockMap[item].assignedOut += (emp.qty || 0);
          }
        });
      }
    });

    // Calculate available stock
    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      received: stockMap[k].received,
      used: stockMap[k].used,
      assignedOut: stockMap[k].assignedOut,
      stock: stockMap[k].received - stockMap[k].used - stockMap[k].assignedOut,
    }));

    res.json({ stock, assignments: rmAssignments });
  } catch (err) {
    console.error("RM stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch RM stock" });
  }
};

/* ---------- Regional Manager Team Assignments (for Assignment Table) ---------- */
export const getRegionalTeamAssignments = async (req, res) => {
  try {
    const userRegion = req.user.region;
    
    if (!userRegion) {
      return res.status(400).json({ message: "User region not found" });
    }

    // 🔹 Get all team members in this region
    const teamMembers = await User.find({ 
      region: userRegion,
      role: { $in: ["Employee", "Manager", "BranchManager", "Branch Manager"] }
    }).select("empCode name");

    const teamEmpCodes = teamMembers.map(u => u.empCode);

    // 🔹 Fetch all assignments where any team member is involved
    const assignments = await Assignment.find({
      "employees.empCode": { $in: teamEmpCodes }
    }).sort({ date: -1 });

    res.json(assignments);
  } catch (err) {
    console.error("Regional team assignments fetch error:", err);
    res.status(500).json({ message: "Failed to fetch regional team assignments" });
  }
};

/* ---------- Regional Manager Allocation ---------- */
export const allocateRegional = async (req, res) => {
  try {
    const { rootId, item, employees, purpose, assignedBy, region, assignerEmpCode } = req.body;
    const rmId = "RM" + Date.now();

    const assignment = new Assignment({
      rootId,
      rmId,
      item,
      employees,
      purpose,
      assignedBy,
      assignerEmpCode: assignerEmpCode || req.user?.empCode,
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
    const userEmpCode = req.user.empCode;
    const userName = req.user.name;

    // 🔹 Fetch all assignments where BM is involved
    const bmAssignments = await Assignment.find({
      $or: [
        { "employees.empCode": userEmpCode },  // received from RM/Admin
        { assignerEmpCode: userEmpCode },      // assigned by this BM (using empCode)
        { assignedBy: userName },              // assigned by this BM (using name)
      ],
    }).sort({ date: -1 });

    // 🔹 Calculate stock: Received - Used - Assigned Out
    const stockMap = {};
    
    bmAssignments.forEach((a) => {
      const item = a.item;
      if (!stockMap[item]) {
        stockMap[item] = { received: 0, used: 0, assignedOut: 0 };
      }

      // ✅ Count RECEIVED qty (when BM is in employees array)
      a.employees.forEach((emp) => {
        if (emp.empCode === userEmpCode) {
          stockMap[item].received += (emp.qty || 0);
          stockMap[item].used += (emp.usedQty || 0);
        }
      });

      // ✅ Count ASSIGNED OUT qty (when BM assigned to others)
      if (a.assignerEmpCode === userEmpCode || a.assignedBy === userName) {
        a.employees.forEach((emp) => {
          // Don't count if assigned to self
          if (emp.empCode !== userEmpCode) {
            stockMap[item].assignedOut += (emp.qty || 0);
          }
        });
      }
    });

    // Calculate available stock
    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      received: stockMap[k].received,
      used: stockMap[k].used,
      assignedOut: stockMap[k].assignedOut,
      stock: stockMap[k].received - stockMap[k].used - stockMap[k].assignedOut,
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
    const { rootId, rmId, item, employees, purpose, assignedBy, region, assignerEmpCode } = req.body;
    const bmId = "BM" + Date.now();

    const assignment = new Assignment({
      rootId,
      rmId,
      bmId,
      item,
      employees,
      purpose,
      assignedBy,
      assignerEmpCode: assignerEmpCode || req.user?.empCode, // Store assigner's empCode
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
    const userEmpCode = req.user.empCode;
    const userName = req.user.name;

    // 🔹 Fetch all assignments where Manager is involved
    const mgrAssignments = await Assignment.find({
      $or: [
        { "employees.empCode": userEmpCode },  // received from BM/RM/Admin
        { assignerEmpCode: userEmpCode },      // assigned by this Manager (using empCode)
        { assignedBy: userName },              // assigned by this Manager (using name)
      ],
    }).sort({ date: -1 });

    // 🔹 Calculate stock: Received - Used - Assigned Out
    const stockMap = {};
    
    mgrAssignments.forEach((a) => {
      const item = a.item;
      if (!stockMap[item]) {
        stockMap[item] = { received: 0, used: 0, assignedOut: 0 };
      }

      // ✅ Count RECEIVED qty (when Manager is in employees array)
      a.employees.forEach((emp) => {
        if (emp.empCode === userEmpCode) {
          stockMap[item].received += (emp.qty || 0);
          stockMap[item].used += (emp.usedQty || 0);
        }
      });

      // ✅ Count ASSIGNED OUT qty (when Manager assigned to others)
      if (a.assignerEmpCode === userEmpCode || a.assignedBy === userName) {
        a.employees.forEach((emp) => {
          // Don't count if assigned to self
          if (emp.empCode !== userEmpCode) {
            stockMap[item].assignedOut += (emp.qty || 0);
          }
        });
      }
    });

    // Calculate available stock
    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      received: stockMap[k].received,
      used: stockMap[k].used,
      assignedOut: stockMap[k].assignedOut,
      stock: stockMap[k].received - stockMap[k].used - stockMap[k].assignedOut,
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
    const { rootId, rmId, bmId, item, employees, purpose, assignedBy, region, assignerEmpCode } = req.body;
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
      assignerEmpCode: assignerEmpCode || req.user?.empCode,
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

    // ✅ Calculate stock with used qty tracking
    const stockMap = {};
    assignments.forEach((a) => {
      a.employees.forEach((emp) => {
        if (emp.empCode === empCode) {
          if (!stockMap[a.item]) {
            stockMap[a.item] = { total: 0, used: 0 };
          }
          stockMap[a.item].total += (emp.qty || 0);
          stockMap[a.item].used += (emp.usedQty || 0);
        }
      });
    });

    const stock = Object.keys(stockMap).map((k) => ({
      name: k,
      total: stockMap[k].total,
      used: stockMap[k].used,
      stock: stockMap[k].total - stockMap[k].used, // Available
    }));

    res.json({ stock, assignments });
  } catch (err) {
    console.error("Employee stock fetch error:", err);
    res.status(500).json({ message: "Failed to fetch employee stock" });
  }
};

/* ---------- TO VENDOR ---------- */
// ✅ FIXED: Only mark the SPECIFIC entry as sent (not all related)
export const submitToVendor = async (req, res) => {
  try {
    const { rootId } = req.params; // This can be bmId or rootId
    if (!rootId) {
      return res.status(400).json({ success: false, message: "ID missing" });
    }

    // 🔍 Find the SPECIFIC assignment - Priority: bmId > rootId
    let assignment = await Assignment.findOne({ bmId: rootId });
    let query = { bmId: rootId };

    // If not found by bmId, try rootId
    if (!assignment) {
      assignment = await Assignment.findOne({ rootId: rootId });
      query = { rootId: rootId };
    }

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // ✅ Check if this specific assignment has project/marketing purpose
    const purpose = (assignment.purpose || "").toLowerCase();
    if (!purpose.includes("project") && !purpose.includes("marketing")) {
      return res.status(400).json({
        success: false,
        message: "Only Project/Marketing assignments can be sent to vendor",
      });
    }

    // ✅ Mark ONLY this specific entry as sent to vendor (use _id for precision)
    await Assignment.updateOne(
      { _id: assignment._id },
      { $set: { toVendor: true, dispatchedAt: new Date() } }
    );

    console.log(`✅ Sent to Vendor: ${assignment.bmId || assignment.rootId} (ID: ${assignment._id})`);

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
// ✅ FIXED: Use _id for precision - Priority: bmId > rootId
export const updateLRNo = async (req, res) => {
  try {
    const { rootId } = req.params; // This can be bmId or rootId
    const { lrNo } = req.body;
    const assignmentId = rootId;

    if (!lrNo || !lrNo.trim()) {
      return res.status(400).json({ success: false, message: "LR No is required" });
    }

    // 1️⃣ Try to find by BM ID first (most specific)
    let assignment = await Assignment.findOne({ bmId: assignmentId });

    // 2️⃣ If not found by bmId, try rootId
    if (!assignment) {
      assignment = await Assignment.findOne({ rootId: assignmentId });
    }

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // 3️⃣ Update LR No ONLY for this SPECIFIC record using _id
    await Assignment.updateOne(
      { _id: assignment._id },
      { $set: { lrNo, lrUpdatedAt: new Date().toLocaleString() } }
    );

    console.log(`🔹 LR Update: ${assignment.bmId || assignment.rootId} → ${lrNo} (ID: ${assignment._id})`);

    res.json({
      success: true,
      message: `✅ LR No "${lrNo}" updated successfully`,
    });
  } catch (err) {
    console.error("LR update error:", err);
    res.status(500).json({ success: false, message: "Failed to update LR No" });
  }
};

/* 🔹 Vendor list - only Project/Marketing + sent to vendor */
// ✅ UPDATED: Include courier address from User profile
export const getVendorList = async (req, res) => {
  try {
    const list = await Assignment.find({
      purpose: { $regex: /project|marketing/i },
      toVendor: true,
    }).sort({ date: -1 }).lean();

    // ✅ Fetch courier addresses for all employees
    const empCodes = [];
    list.forEach(a => {
      (a.employees || []).forEach(emp => {
        if (emp.empCode && !empCodes.includes(emp.empCode)) {
          empCodes.push(emp.empCode);
        }
      });
    });

    // Fetch user details with courier address
    const users = await User.find({ empCode: { $in: empCodes } }).lean();
    const userMap = {};
    users.forEach(u => {
      userMap[u.empCode] = {
        courierAddress: u.courierAddress || u.address || "-",
        phone: u.phone || u.mobile || "-",
      };
    });

    // ✅ Add courier address to each employee in the list
    const enrichedList = list.map(a => ({
      ...a,
      employees: (a.employees || []).map(emp => ({
        ...emp,
        courierAddress: userMap[emp.empCode]?.courierAddress || "-",
        phone: userMap[emp.empCode]?.phone || "-",
      })),
    }));

    res.json(enrichedList);
  } catch (err) {
    console.error("Vendor list error:", err);
    res.status(500).json({ message: "Server error fetching vendor list" });
  }
};

/* ---------- Admin: Update POD for Employee visibility ---------- */
export const updatePODForEmployee = async (req, res) => {
  try {
    const { rootId } = req.params;
    
    // Update all related assignments with same rootId chain
    const result = await Assignment.updateMany(
      { $or: [{ rootId }, { rmId: rootId }, { bmId: rootId }] },
      { 
        $set: { 
          podUpdatedForEmp: true, 
          podUpdatedAt: new Date().toLocaleString() 
        } 
      }
    );

    res.json({
      success: true,
      message: `POD updated for ${result.modifiedCount} record(s). Now visible to employees.`,
    });
  } catch (err) {
    console.error("POD update error:", err);
    res.status(500).json({ success: false, message: "Failed to update POD status" });
  }
};

/* ---------- Employee: Add Used Sample against Customer ---------- */
export const addUsedSample = async (req, res) => {
  try {
    const { assignmentId, empCode, customerId, qty } = req.body;

    if (!assignmentId || !empCode || !customerId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // Find the employee in this assignment
    const empIndex = assignment.employees.findIndex(e => e.empCode === empCode);
    if (empIndex === -1) {
      return res.status(404).json({ success: false, message: "Employee not found in this assignment" });
    }

    const emp = assignment.employees[empIndex];
    const usedQty = Number(qty) || 1;
    const currentUsed = emp.usedQty || 0;
    const available = (emp.qty || 0) - currentUsed;

    if (usedQty > available) {
      return res.status(400).json({ 
        success: false, 
        message: `Not enough stock. Available: ${available}, Requested: ${usedQty}` 
      });
    }

    // Add used sample record
    if (!emp.usedSamples) emp.usedSamples = [];
    emp.usedSamples.push({
      customerId,
      qty: usedQty,
      usedBy: empCode,
      usedAt: new Date(),
    });
    emp.usedQty = currentUsed + usedQty;

    assignment.employees[empIndex] = emp;
    await assignment.save();

    res.json({
      success: true,
      message: `✅ Sample used against ${customerId}. Remaining: ${available - usedQty}`,
      remaining: available - usedQty,
    });
  } catch (err) {
    console.error("Add used sample error:", err);
    res.status(500).json({ success: false, message: "Failed to add used sample" });
  }
};

/* ---------- Admin: Get Assignment Ledger (Tree View) ---------- */
export const getAssignmentLedger = async (req, res) => {
  try {
    // Get all admin-level assignments (role = Admin)
    const adminAssignments = await Assignment.find({ role: "Admin" }).sort({ date: -1 });

    const ledger = [];

    for (const admin of adminAssignments) {
      const tree = {
        rootId: admin.rootId,
        item: admin.item,
        purpose: admin.purpose,
        assignedBy: admin.assignedBy,
        date: admin.date,
        toVendor: admin.toVendor,
        lrNo: admin.lrNo,
        podUpdatedForEmp: admin.podUpdatedForEmp,
        employees: admin.employees,
        children: [],
      };

      // Find RM level assignments (rmId linked to this rootId)
      const rmAssignments = await Assignment.find({ rootId: admin.rootId, role: "RegionalManager" });
      
      for (const rm of rmAssignments) {
        const rmNode = {
          rmId: rm.rmId,
          item: rm.item,
          purpose: rm.purpose,
          assignedBy: rm.assignedBy,
          date: rm.date,
          employees: rm.employees,
          children: [],
        };

        // Find BM level assignments
        const bmAssignments = await Assignment.find({ rmId: rm.rmId, role: "BranchManager" });
        
        for (const bm of bmAssignments) {
          const bmNode = {
            bmId: bm.bmId,
            item: bm.item,
            purpose: bm.purpose,
            assignedBy: bm.assignedBy,
            date: bm.date,
            employees: bm.employees,
            children: [],
          };

          // Find Manager level assignments
          const mgrAssignments = await Assignment.find({ bmId: bm.bmId, role: "Manager" });
          
          for (const mgr of mgrAssignments) {
            bmNode.children.push({
              managerId: mgr.managerId,
              item: mgr.item,
              purpose: mgr.purpose,
              assignedBy: mgr.assignedBy,
              date: mgr.date,
              employees: mgr.employees,
            });
          }

          rmNode.children.push(bmNode);
        }

        tree.children.push(rmNode);
      }

      ledger.push(tree);
    }

    res.json(ledger);
  } catch (err) {
    console.error("Ledger fetch error:", err);
    res.status(500).json({ message: "Failed to fetch assignment ledger" });
  }
};

/* =============================================================
   📊 Assignment Summary for Admin Dashboard
============================================================= */
export const getAssignmentSummary = async (req, res) => {
  try {
    const { year, lot } = req.query;
    const targetYear = String(parseInt(year) || new Date().getFullYear());

    // Get all assignments
    let assignments = await Assignment.find().lean();

    // ✅ Filter by year field from assignment (or fallback to date parsing)
    assignments = assignments.filter(a => {
      // Use assignment's year field if available
      if (a.year) {
        return a.year === targetYear;
      }
      // Fallback to date parsing
      if (!a.date) return false;
      const assignmentYear = new Date(a.date).getFullYear().toString();
      return assignmentYear === targetYear;
    });

    // ✅ Filter by lot if specified - use assignment's lot field
    if (lot && lot !== "all") {
      assignments = assignments.filter(a => a.lot === lot);
    }

    // Calculate totals
    let totalProduction = 0;
    let totalAssigned = 0;
    let totalUsed = 0;
    const itemMap = {};
    const personMap = {};
    const lotBreakdown = {
      "Lot 1": { production: 0, assigned: 0, used: 0, stock: 0 },
      "Lot 2": { production: 0, assigned: 0, used: 0, stock: 0 },
      "Lot 3": { production: 0, assigned: 0, used: 0, stock: 0 },
    };

    assignments.forEach(a => {
      // ✅ Use the assignment's lot field directly
      const lotName = a.lot || "Lot 1";
      
      // Item-wise tracking
      if (a.item) {
        if (!itemMap[a.item]) {
          itemMap[a.item] = { name: a.item, production: 0, assigned: 0, used: 0, available: 0 };
        }
      }

      // Process employees
      (a.employees || []).forEach(emp => {
        const empQty = emp.qty || 0;
        const empUsed = emp.usedQty || 0;
        
        totalAssigned += empQty;
        totalUsed += empUsed;

        // ✅ Lot tracking using assignment's lot field
        if (lotBreakdown[lotName]) {
          lotBreakdown[lotName].assigned += empQty;
          lotBreakdown[lotName].used += empUsed;
          lotBreakdown[lotName].stock += (empQty - empUsed);
        }

        // Item tracking
        if (a.item && itemMap[a.item]) {
          itemMap[a.item].assigned += empQty;
          itemMap[a.item].used += empUsed;
        }

        // Person tracking
        const key = emp.empCode || emp.name;
        if (!personMap[key]) {
          personMap[key] = {
            empCode: emp.empCode,
            name: emp.name,
            role: emp.role || "-",
            assigned: 0,
            used: 0,
          };
        }
        personMap[key].assigned += empQty;
        personMap[key].used += empUsed;
      });
    });

    // Calculate available for items
    Object.values(itemMap).forEach(item => {
      item.available = item.assigned - item.used;
    });

    // Prepare response
    res.json({
      year: targetYear,
      lot: lot || "all",
      totalProduction,
      totalAssigned,
      totalUsed,
      totalStock: totalAssigned - totalUsed,
      lotBreakdown,
      itemSummary: Object.values(itemMap),
      personStock: Object.values(personMap).sort((a, b) => b.assigned - a.assigned),
    });
  } catch (err) {
    console.error("Summary fetch error:", err);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
};

/* =============================================================
   📊 Get Region-wide Sample Usage (for RM dashboard)
============================================================= */
export const getRegionUsage = async (req, res) => {
  try {
    const { region } = req.query;

    // Find all assignments in this region that have used samples
    const assignments = await Assignment.find({
      region: region ? new RegExp(region, "i") : { $exists: true },
    }).lean();

    // Extract all used samples
    const usageList = [];

    assignments.forEach((a) => {
      (a.employees || []).forEach((emp) => {
        if (emp.usedSamples && emp.usedSamples.length > 0) {
          emp.usedSamples.forEach((us) => {
            usageList.push({
              empCode: emp.empCode,
              empName: emp.name,
              item: a.item,
              customerId: us.customerId,
              qty: us.qty,
              usedAt: us.usedAt,
              assignmentId: a._id,
              rootId: a.rootId,
              bmId: a.bmId,
            });
          });
        }
      });
    });

    // Sort by date descending
    usageList.sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

    res.json(usageList);
  } catch (err) {
    console.error("Region usage fetch error:", err);
    res.status(500).json({ message: "Failed to fetch region usage" });
  }
};
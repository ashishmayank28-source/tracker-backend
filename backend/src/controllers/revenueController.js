import Customer from "../models/customerModel.js";
import User from "../models/userModel.js";
import Revenue from "../models/revenueModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";

/* =============================================================
   🔍 Shared revenue list filters (branch, region, employee, date)
============================================================= */
function applyRevenueFilters(revenues, query = {}) {
  let result = [...revenues];
  const { from, to, branch, region, empName, empCode } = query;

  if (empCode && empCode !== "all") {
    result = result.filter((r) => r.empCode === empCode);
  }

  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);
    result = result.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }

  if (branch) {
    const branchFilter = branch.toLowerCase();
    result = result.filter((r) =>
      (r.branch || "").toLowerCase().includes(branchFilter)
    );
  }

  if (region) {
    const regionFilter = region.toLowerCase();
    result = result.filter((r) =>
      (r.region || "").toLowerCase().includes(regionFilter)
    );
  }

  if (empName) {
    const nameFilter = empName.toLowerCase();
    result = result.filter(
      (r) =>
        (r.empName || "").toLowerCase().includes(nameFilter) ||
        (r.empCode || "").toLowerCase().includes(nameFilter)
    );
  }

  return result;
}

function buildApproverOptions(employee, userMap) {
  const options = [];
  const seen = new Set();
  const add = (code, roleLabel) => {
    if (!code || seen.has(code)) return;
    const u = userMap[code];
    if (!u) return;
    seen.add(code);
    options.push({
      empCode: code,
      name: u.name,
      role: roleLabel,
      label: `${code} - ${u.name} (${roleLabel})`,
    });
  };
  const mgrCode = employee.managerEmpCode || employee.reportTo?.[0]?.empCode;
  add(mgrCode, "Immediate Manager");
  add(employee.branchManagerEmpCode, "Branch Manager");
  add(employee.regionalManagerEmpCode, "Regional Manager");
  return options;
}

function isLegacyBM(role) {
  return role === "BM" || role === "BranchManager" || role === "Branch Manager";
}

function computeCanApprove(entry, employeeUser, currentUserEmpCode, currentUserRole) {
  const approved =
    entry.approved ||
    entry.approvedByBM ||
    (entry.approvedBy && entry.approvedBy !== "-") ||
    entry.orderStatus === "Approved";
  if (approved || entry.rejected || entry.orderStatus === "Rejected") return false;
  if (!employeeUser) return false;
  if (employeeUser.revenueApproverEmpCode) {
    return employeeUser.revenueApproverEmpCode === currentUserEmpCode;
  }
  return isLegacyBM(currentUserRole);
}

async function getAssignedApproveeEmpCodes(approverEmpCode) {
  const users = await User.find({ revenueApproverEmpCode: approverEmpCode })
    .select("empCode")
    .lean();
  return users.map((u) => u.empCode);
}

async function resolveEntryEmployeeCode(id) {
  const customer = await Customer.findOne({ "visits._id": id }).lean();
  if (customer) {
    const visit = customer.visits?.find((v) => String(v._id) === String(id));
    if (visit?.createdBy) return visit.createdBy;
  }
  const rev = await Revenue.findById(id).lean();
  return rev?.empCode || null;
}

async function userCanApproveEntry(approverEmpCode, approverRole, employeeEmpCode) {
  if (!employeeEmpCode) return false;
  const employee = await User.findOne({ empCode: employeeEmpCode }).lean();
  if (!employee) return false;
  if (employee.revenueApproverEmpCode) {
    return employee.revenueApproverEmpCode === approverEmpCode;
  }
  return isLegacyBM(approverRole);
}

function enrichRowWithApproverMeta(row, employeeUser, currentUser) {
  return {
    ...row,
    revenueApproverEmpCode: employeeUser?.revenueApproverEmpCode || "",
    revenueApproverName: employeeUser?.revenueApproverName || "",
    canApprove: computeCanApprove(
      row,
      employeeUser,
      currentUser?.empCode,
      currentUser?.role
    ),
  };
}

/* =============================================================
   📁 Storage Setup for Manager PO Uploads
============================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const dir = path.join("uploads", `${year}`, `${month}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});
export const managerPOUploader = multer({ storage }).single("poFile");

/* =============================================================
   📤 Upload Handler
============================================================= */
export const uploadPOForManager = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const filePath = `/uploads/${new Date().getFullYear()}/${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}/${req.file.filename}`;

    res.json({
      success: true,
      message: "PO uploaded successfully",
      fileUrl: filePath,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "File upload failed" });
  }
};

/* =============================================================
   🧩 Manager View - Combined Revenue (Customer + Manual)
   ✅ NOW: Shows ALL Order Won entries immediately (no submission required)
   ✅ Approved by BM shows for all entries
============================================================= */
export const getManagerRevenue = async (req, res) => {
  try {
    const managerCode = req.user?.empCode;
    const assignedApprovees = await getAssignedApproveeEmpCodes(managerCode);

    const employees = await User.find({
      $or: [
        { managerEmpCode: managerCode },
        { "reportTo.empCode": managerCode },
        { empCode: { $in: assignedApprovees } },
      ],
    }).lean();
    const empCodes = employees.map((e) => e.empCode);
    const userMap = {};
    employees.forEach((e) => {
      userMap[e.empCode] = e;
    });

    const { empCode } = req.query;
    const scopeCodes =
      empCode && empCode !== "all"
        ? [empCode]
        : [...new Set([...empCodes, ...assignedApprovees])];

    const customers = await Customer.find({
      $or: [
        { "visits.createdBy": { $in: scopeCodes } },
        { "createdBy.empCode": { $in: scopeCodes } },
      ],
    }).lean();

    let reports = [];

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        if (
          (v.orderStatus === "Won" || v.orderStatus === "Approved" || v.orderStatus === "Rejected") &&
          v.reportedBy !== "BM" &&
          v.reportedBy !== "Branch Manager"
        ) {
          const emp = userMap[v.createdBy] || employees.find((e) => e.empCode === v.createdBy);
          const reporterName = v.reportedBy || (emp ? `${emp.empCode} - ${emp.name}` : v.createdBy || "-");

          reports.push(
            enrichRowWithApproverMeta(
              {
                _id: v._id,
                customerId: c.customerId || "-",
                customerMobile: c.customerMobile || "NA",
                customerName: c.name || "-",
                company: c.company || "-",
                customerType: c.customerType || "-",
                vertical: v.vertical || c.vertical || "-",
                distributorCode: v.distributorCode || "-",
                distributorName: v.distributorName || "-",
                orderType: v.orderType || "-",
                itemName: v.itemName || "-",
                poNumber: v.poNumber || "-",
                poFileUrl: v.poFileUrl || "-",
                orderValue: v.orderValue || 0,
                empCode: v.createdBy || c.createdBy?.empCode || "-",
                empName: emp?.name || c.createdBy?.name || "-",
                branch: v.branch || emp?.branch || "-",
                region: v.region || emp?.region || "-",
                meetingType: v.meetingType,
                date: v.date || c.createdAt,
                orderStatus: v.orderStatus,
                reportedBy: reporterName,
                approvedByBM: v.approvedByBM || null,
                approved: v.approved || v.orderStatus === "Approved",
                approvedBy: v.approvedBy || "-",
                rejected: v.rejected || v.orderStatus === "Rejected",
                rejectedBy: v.rejectedBy || "-",
                rejectedDate: v.rejectedDate || null,
              },
              emp,
              req.user
            )
          );
        }
      });
    });

    const manualRevenues = await Revenue.find({
      $or: [{ managerCode }, { empCode: { $in: scopeCodes } }],
      ...(empCode && empCode !== "all" ? { empCode } : {}),
    }).lean();

    manualRevenues.forEach((rev) => {
      const exists = reports.some(
        (r) => r.poNumber === rev.poNumber && r.empCode === rev.empCode
      );
      if (!exists) {
        const revEmp = userMap[rev.empCode] || employees.find((e) => e.empCode === rev.empCode);
        reports.push(
          enrichRowWithApproverMeta(
            {
              _id: rev._id,
              customerId: rev.customerId || `MANUAL-${rev._id}`,
              customerMobile: rev.customerMobile || "NA",
              customerName: rev.customerName || "-",
              company: rev.company || "-",
              customerType: rev.customerType || "-",
              vertical: rev.verticalType || "-",
              distributorCode: rev.distributorCode || "-",
              distributorName: rev.distributorName || "-",
              orderType: rev.orderType || "-",
              itemName: rev.itemName || "-",
              poNumber: rev.poNumber || "-",
              poFileUrl: rev.poFileUrl || "-",
              orderValue: rev.orderValue || 0,
              empCode: rev.empCode,
              empName: revEmp?.name || "-",
              managerCode: rev.managerCode,
              managerName: rev.managerName,
              branch: rev.branch || revEmp?.branch || "-",
              region: rev.region || revEmp?.region || "-",
              meetingType: "Manager Added",
              date: rev.date,
              orderStatus: rev.orderStatus,
              reportedBy: rev.reportedBy || `${rev.managerCode} - ${rev.managerName}`,
              approvedByBM: rev.approvedByBM || null,
              approved: rev.approved || false,
              approvedBy: rev.approvedBy || "-",
              isSubmitted: rev.isSubmitted || false,
              rejected: rev.rejected || false,
              rejectedBy: rev.rejectedBy || "-",
            },
            revEmp,
            req.user
          )
        );
      }
    });

    reports = applyRevenueFilters(reports, req.query);
    reports.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(reports);
  } catch (err) {
    console.error("Manager Revenue Error:", err);
    res.status(500).json({ message: err.message });
  }
};
/* =============================================================
   ✅ Approve Revenue Entry - BM ONLY
   ✅ Only Branch Manager can approve entries
   ✅ "Approved by BM Name" shows on ALL dashboards
============================================================= */
export const approveRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const approverName = req.user?.name || "Approver";
    const approverCode = req.user?.empCode;
    const now = new Date();

    const employeeEmpCode = await resolveEntryEmployeeCode(id);
    const allowed = await userCanApproveEntry(approverCode, userRole, employeeEmpCode);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "❌ You are not the assigned revenue approver for this employee",
      });
    }

    const approvedByName = `${approverCode} - ${approverName}`;
    const updatedCustomer = await Customer.findOneAndUpdate(
      { "visits._id": id },
      {
        $set: {
          "visits.$.approved": true,
          "visits.$.approvedBy": approvedByName,
          "visits.$.approvedByBM": approvedByName,
          "visits.$.approvedDate": now,
          "visits.$.orderStatus": "Approved",
        },
      },
      { new: true }
    );

    if (!updatedCustomer) {
      // Try to update Revenue collection directly (for manual entries)
      const updatedRevenue = await Revenue.findByIdAndUpdate(
        id,
        {
          $set: {
            approved: true,
            approvedBy: approvedByName,
            approvedByBM: approvedByName,
            approvedDate: now,
            orderStatus: "Approved",
          },
        },
        { new: true }
      );

      if (updatedRevenue) {
        return res.json({
          success: true,
          message: `✅ Revenue approved by ${approverName}`,
          approvedBy: approvedByName,
        });
      }

      return res.status(404).json({ message: "Entry not found" });
    }

    // 🔹 Step 2: Fetch the approved visit data
    const visit = updatedCustomer.visits.find((v) => String(v._id) === id);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // 🔹 Step 3: Get employee info for Revenue entry
    const employee = await User.findOne({ empCode: visit.createdBy });

    // 🔹 Step 4: Save/Update Revenue record with BM approval
    const revenueData = {
      empCode: visit.createdBy,
      empName: employee?.name || "-",
      branch: employee?.branch || "-",
      region: employee?.region || "-",
      managerCode: approverCode,
      managerName: approverName,
      customerId: updatedCustomer.customerId,
      customerName: updatedCustomer.name || "Unknown",
      customerMobile: updatedCustomer.customerMobile || "NA",
      company: updatedCustomer.company || "-",
      customerType: updatedCustomer.customerType || "-",
      verticalType: visit.vertical || "-",
      distributorCode: visit.distributorCode || "-",
      distributorName: visit.distributorName || "-",
      orderType: visit.orderType || "-",
      itemName: visit.itemName || "-",
      poNumber: visit.poNumber || "-",
      poFileUrl: visit.poFileUrl || "-",
      orderValue: Number(visit.orderValue) || 0,
      orderStatus: "Approved",
      approved: true,
      approvedBy: approvedByName,
      approvedByBM: approvedByName,
      approvedDate: now,
      isManual: false,
      date: visit.date || now,
    };

    await Revenue.findOneAndUpdate(
      {
        poNumber: visit.poNumber,
        empCode: visit.createdBy,
      },
      { $set: revenueData },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `✅ Revenue approved by ${approverName}`,
      approvedBy: approvedByName,
    });
  } catch (err) {
    console.error("Approve Revenue Error:", err);
    res.status(500).json({ message: "Failed to approve revenue" });
  }
};

/* =============================================================
   ➕ Add Manual Sale by Manager (Branch + Region Fixed)
============================================================= */
export const addManualSale = async (req, res) => {
  try {
    const manager = req.user;
    const {
      empCode,
      orderType,
      orderValue,
      itemName,
      poNumber,
      customerName,
      customerMobile,
      company,
      customerType,
      vertical,
      distributorCode,
      distributorName,
      poFileUrl,
      branch,
      region,
    } = req.body;

    // 🔹 Find employee to auto-fill details
    const emp = await User.findOne({ empCode });
    const isBM = manager.role === "BM" || manager.role === "BranchManager" || manager.role === "Branch Manager";

    // 🔹 Generate manualId (missing earlier)
    const manualId = `MANUAL-${Date.now()}`;

    // 🔹 Save into Revenue collection directly
    // If BM creates, it's already at BM level (submittedToBM: true)
    // If Manager creates, it needs to be submitted to BM first
    const reportedByName = `${manager.empCode} - ${manager.name}`;
    
    const revenueEntry = new Revenue({
      empCode,
      empName: emp?.name || "-",
      branch: branch || emp?.branch || "-",
      region: region || emp?.region || "-",
      managerCode: manager.empCode,
      managerName: manager.name,
      customerId: manualId,
      customerName: customerName || "Manual Entry",
      customerMobile: customerMobile || "NA",
      company: company || "-",
      customerType: customerType || "Manual",
      verticalType: vertical || "-",
      distributorCode: distributorCode || "-",
      distributorName: distributorName || "-",
      orderType: orderType || "Project",
      orderValue: Number(orderValue) || 0,
      itemName,
      poNumber,
      poFileUrl: poFileUrl || "-",
      // ✅ Reported by = Who created the entry (Manager/BM name)
      reportedBy: reportedByName,
      // ✅ Only BM can approve - Manager manual entries need BM approval
      approved: false,
      approvedBy: null,
      approvedByBM: null,
      isManual: true,
      isSubmitted: false,
      submittedToBM: isBM, // ✅ If BM creates, it's already at BM level
      submittedToRM: false, // ✅ Not yet submitted to RM
      date: new Date(),
    });

    await revenueEntry.save();

    res.json({
      success: true,
      message: "✅ Manual sale added successfully with branch & region",
      data: revenueEntry,
    });
  } catch (err) {
    console.error("Manual Sale Error:", err);
    res.status(500).json({ message: "Failed to add manual sale" });
  }
};
/* =============================================================
   📤 Submit Manager Report Upward (to BM)
============================================================= */
export const submitManagerReport = async (req, res) => {
  try {
    const manager = req.user;
    const { reports } = req.body;
    if (!reports?.length)
      return res.status(400).json({ message: "No reports to submit" });

    let updatedCount = 0;
    const now = new Date();

    for (const r of reports) {
      // 1️⃣ Update Customer visits
      if (r._id) {
        await Customer.findOneAndUpdate(
          { "visits._id": r._id },
          {
            $set: {
              "visits.$.submitted": true,
              "visits.$.isSubmitted": true,
              "visits.$.submittedBy": `${manager.empCode} - ${manager.name}`,
              "visits.$.submittedDate": now,
              "visits.$.submittedToBM": true,
            },
          }
        );
      }

      // 2️⃣ Update Revenue collection entries
      if (r.poNumber && r.empCode) {
        await Revenue.updateOne(
          { poNumber: r.poNumber, empCode: r.empCode },
          {
            $set: {
              isSubmitted: true,
              submittedBy: `${manager.empCode} - ${manager.name}`,
              submittedDate: now,
              submittedToBM: true,
            },
          }
        );
      }
      updatedCount++;
    }

    // 3️⃣ Also mark ALL approved Revenue entries from this manager as submitted
    await Revenue.updateMany(
      { 
        managerCode: manager.empCode,
        approved: true,
        isSubmitted: { $ne: true }
      },
      {
        $set: {
          isSubmitted: true,
          submittedBy: `${manager.empCode} - ${manager.name}`,
          submittedDate: now,
          submittedToBM: true,
        },
      }
    );

    res.json({ 
      success: true, 
      message: `✅ ${updatedCount} reports submitted to Branch Manager` 
    });
  } catch (err) {
    console.error("Submit Manager Report Error:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};

/* =============================================================
   📊 Revenue Tracker (Employee View)
============================================================= */
export const getRevenueTrackerEmployee = async (req, res) => {
  try {
    const empCode = req.user?.empCode;
    if (!empCode)
      return res.status(400).json({ message: "Employee code missing in token" });

    const customers = await Customer.find({
      $or: [{ "createdBy.empCode": empCode }, { "visits.createdBy": empCode }],
    }).lean();

    const revenue = [];
    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        if (
          v.orderStatus === "Won" &&
          v.reportedBy !== "BM" &&
          v.reportedBy !== "Branch Manager"
        ) {
          revenue.push({
            customerId: c.customerId,
            customerMobile: c.customerMobile || "NA",
            customerName: c.name || "-",
            company: c.company || "-",
            customerType: c.customerType || "-",
            vertical: v.vertical || c.vertical || "-",
            distributorCode: v.distributorCode || "-",
            distributorName: v.distributorName || "-",
            orderType: v.orderType || "-",
            itemName: v.itemName || "-",
            poNumber: v.poNumber || "-",
            poFileUrl: v.poFileUrl || "-",
            orderValue: v.orderValue || 0,
            empCode: v.createdBy || c.createdBy?.empCode || "-",
            empName: req.user?.name || c.createdBy?.name || "-",
            branch: v.branch || req.user?.branch || "-",
            region: v.region || req.user?.region || "-",
            meetingType: v.meetingType,
            date: v.date || c.createdAt,
          });
        }
      });
    });

    revenue.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenue);
  } catch (err) {
    console.error("Revenue Tracker Employee Error:", err);
    res.status(500).json({ message: "Failed to fetch revenue data" });
  }
};

/* =============================================================
   📊 Revenue Tracker (Manager/Admin View)
============================================================= */
export const getRevenueTrackerManager = async (req, res) => {
  try {
    const { role, empCode } = req.user;
    const reportees =
      role === "Admin"
        ? await User.find().distinct("empCode")
        : await User.find({ "reportTo.empCode": empCode }).distinct("empCode");

    const customers = await Customer.find({
      "visits.createdBy": { $in: reportees },
    }).lean();

    const revenue = [];

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        if (v.orderStatus === "Won") {
          revenue.push({
            customerId: c.customerId,
            customerMobile: c.customerMobile || "NA",
            customerName: c.name || "-",
            company: c.company || "-",
            customerType: c.customerType || "-",
            vertical: v.vertical || c.vertical || "-",
            distributorCode: v.distributorCode || "-",
            distributorName: v.distributorName || "-",
            orderType: v.orderType || "-",
            itemName: v.itemName || "-",
            poNumber: v.poNumber || "-",
            poFileUrl: v.poFileUrl || "-",
            orderValue: v.orderValue || 0,
            empCode: v.createdBy || "-",
            meetingType: v.meetingType,
            empName: "-",
            branch: v.branch || "-",
            region: v.region || "-",
            date: v.date || c.createdAt,
          });
        }
      });
    });

    revenue.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenue);
  } catch (err) {
    console.error("Revenue Tracker Manager Error:", err);
    res.status(500).json({ message: "Failed to fetch revenue data" });
  }
};
/* =============================================================
   📊 Branch Manager View - ALL Order Won entries from branch
   ✅ NOW: Shows ALL entries immediately (no submission required)
   ✅ BM can approve entries - "Approved by BM" shows on all dashboards
============================================================= */
export const getBMRevenue = async (req, res) => {
  try {
    const bmCode = req.user?.empCode;
    const bmBranch = req.user?.branch;
    const assignedApprovees = await getAssignedApproveeEmpCodes(bmCode);

    console.log("🔍 BM Revenue - Code:", bmCode, "Branch:", bmBranch);

    const branchUsers = await User.find({
      $or: [
        { "reportTo.empCode": bmCode },
        { managerEmpCode: bmCode },
        { branch: bmBranch },
        { empCode: { $in: assignedApprovees } },
      ],
    }).lean();

    const branchEmpCodes = [...new Set([...branchUsers.map((r) => r.empCode), bmCode, ...assignedApprovees])];

    console.log("🔍 BM Branch Users:", branchEmpCodes.length);

    let revenues = [];

    // 2️⃣ Get ALL Customer visits with Order Won/Approved from branch employees
    const customers = await Customer.find({
      $or: [
        { "visits.createdBy": { $in: branchEmpCodes } },
        { "createdBy.empCode": { $in: branchEmpCodes } },
      ],
    }).lean();

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // ✅ Show ALL Won/Approved/Rejected entries immediately (including rejected)
        if (
          (v.orderStatus === "Won" || v.orderStatus === "Approved" || v.orderStatus === "Rejected") &&
          v.orderValue
        ) {
          const emp = branchUsers.find((e) => e.empCode === v.createdBy);
          // ✅ Determine who reported this entry
          const reporterName = v.reportedBy || (emp ? `${emp.empCode} - ${emp.name}` : v.createdBy || "-");
          
          revenues.push({
            _id: v._id,
            customerId: c.customerId,
            customerMobile: c.customerMobile || "NA",
            customerName: c.name || "-",
            company: c.company || "-",
            customerType: c.customerType || "-",
            verticalType: v.vertical || c.vertical || "-",
            vertical: v.vertical || c.vertical || "-",
            distributorCode: v.distributorCode || "-",
            distributorName: v.distributorName || "-",
            orderType: v.orderType || "-",
            itemName: v.itemName || "-",
            poNumber: v.poNumber || "-",
            poFileUrl: v.poFileUrl || "-",
            orderValue: v.orderValue || 0,
            empCode: v.createdBy || c.createdBy?.empCode || "-",
            empName: emp?.name || c.createdBy?.name || "-",
            branch: v.branch || emp?.branch || bmBranch || "-",
            region: v.region || emp?.region || "-",
            date: v.date || c.createdAt,
            // ✅ Reported by (who created the entry)
            reportedBy: reporterName,
            // ✅ BM Approval status
            approved: v.approved || v.orderStatus === "Approved",
            approvedBy: v.approvedBy || "-",
            approvedByBM: v.approvedByBM || null,
            // ✅ Rejection status with reason
            rejected: v.rejected || v.orderStatus === "Rejected",
            rejectedBy: v.rejectedBy || "-",
            rejectReason: v.rejectReason || "-",
          });
        }
      });
    });

    // 3️⃣ Get Revenue collection entries (manual + approved + rejected)
    const revenueEntries = await Revenue.find({
      $or: [
        { empCode: { $in: branchEmpCodes } },
        { managerCode: { $in: branchEmpCodes } },
        { branch: bmBranch },
      ],
    }).lean();

    revenueEntries.forEach((rev) => {
      // Avoid duplicates
      const exists = revenues.some(
        (r) => r.poNumber === rev.poNumber && r.empCode === rev.empCode
      );
      if (!exists) {
        const emp = branchUsers.find((e) => e.empCode === rev.empCode);
        revenues.push({
          _id: rev._id,
          customerId: rev.customerId || `MANUAL-${rev._id}`,
          customerMobile: rev.customerMobile || "NA",
          customerName: rev.customerName || "-",
          company: rev.company || "-",
          customerType: rev.customerType || "-",
          verticalType: rev.verticalType || "-",
          vertical: rev.verticalType || "-",
          distributorCode: rev.distributorCode || "-",
          distributorName: rev.distributorName || "-",
          orderType: rev.orderType || "-",
          itemName: rev.itemName || "-",
          poNumber: rev.poNumber || "-",
          poFileUrl: rev.poFileUrl || "-",
          orderValue: rev.orderValue || 0,
          empCode: rev.empCode || "-",
          empName: emp?.name || rev.empName || "-",
          branch: rev.branch || emp?.branch || bmBranch || "-",
          region: rev.region || emp?.region || "-",
          date: rev.date,
          // ✅ Reported by (who created the entry)
          reportedBy: rev.reportedBy || `${rev.managerCode} - ${rev.managerName}`,
          // ✅ BM Approval status
          approved: rev.approved || false,
          approvedBy: rev.approvedBy || "-",
          approvedByBM: rev.approvedByBM || null,
          // ✅ Rejection status with reason
          rejected: rev.rejected || false,
          rejectedBy: rev.rejectedBy || "-",
          rejectReason: rev.rejectReason || "-",
        });
      }
    });

    console.log("🔍 Total revenues for BM:", revenues.length);

    const empUsers = await User.find({
      empCode: { $in: [...new Set(revenues.map((r) => r.empCode).filter(Boolean))] },
    }).lean();
    const userMap = {};
    empUsers.forEach((u) => {
      userMap[u.empCode] = u;
    });
    revenues = revenues.map((r) =>
      enrichRowWithApproverMeta(r, userMap[r.empCode], req.user)
    );

    revenues = applyRevenueFilters(revenues, req.query);

    revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenues);
  } catch (err) {
    console.error("BM Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch BM revenue" });
  }
};

/* =============================================================
   ❌ Reject Revenue Entry (by BM)
============================================================= */
export const rejectRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rejecterName = req.user?.name || "Approver";
    const rejecterCode = req.user?.empCode;
    const userRole = req.user?.role;
    const now = new Date();

    const employeeEmpCode = await resolveEntryEmployeeCode(id);
    const allowed = await userCanApproveEntry(rejecterCode, userRole, employeeEmpCode);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "❌ You are not the assigned revenue approver for this employee",
      });
    }

    const rejectedByName = `${rejecterCode} - ${rejecterName}`;

    // 1️⃣ Update Customer visit
    const updatedCustomer = await Customer.findOneAndUpdate(
      { "visits._id": id },
      {
        $set: {
          "visits.$.rejected": true,
          "visits.$.rejectedBy": rejectedByName,
          "visits.$.rejectedDate": now,
          "visits.$.rejectReason": reason || "Rejected by BM",
          "visits.$.orderStatus": "Rejected",
        },
      },
      { new: true }
    );

    // 2️⃣ Update Revenue collection if exists
    if (updatedCustomer) {
      const visit = updatedCustomer.visits.find((v) => String(v._id) === id);
      if (visit) {
        await Revenue.updateOne(
          { poNumber: visit.poNumber, empCode: visit.createdBy },
          {
            $set: {
              rejected: true,
              rejectedBy: rejectedByName,
              rejectedDate: now,
              rejectReason: reason || "Rejected by BM",
              orderStatus: "Rejected",
            },
          }
        );
      }
    }

    // 3️⃣ Also try to update by _id in Revenue collection
    await Revenue.updateOne(
      { _id: id },
      {
        $set: {
          rejected: true,
          rejectedBy: rejectedByName,
          rejectedDate: now,
          rejectReason: reason || "Rejected by BM",
          orderStatus: "Rejected",
        },
      }
    );

    res.json({
      success: true,
      message: "❌ Entry rejected successfully",
    });
  } catch (err) {
    console.error("Reject Revenue Error:", err);
    res.status(500).json({ message: "Failed to reject entry" });
  }
};

/* =============================================================
 📤 BM: Submit ALL Approved Entries to RM/Admin
============================================================= */
export const submitBMEntries = async (req, res) => {
  try {
    const bm = req.user;
    const { reports } = req.body;
    const now = new Date();
    const submittedByName = `${bm.empCode} - ${bm.name}`;

    // 1️⃣ Submit ALL non-rejected entries from Revenue collection
    const manualResult = await Revenue.updateMany(
      {
        $or: [
          { managerCode: bm.empCode },
          { submittedToBM: true },
        ],
        submittedToRM: { $ne: true },
        rejected: { $ne: true },
      },
      {
        $set: {
          isSubmitted: true,
          submittedToRM: true,
          submittedBy: submittedByName,
          submittedDate: now,
        },
      }
    );

    // 2️⃣ Also mark approved Customer visits as submitted to RM
    let visitCount = 0;
    if (reports && Array.isArray(reports)) {
      for (const r of reports) {
        if (r._id && !r.rejected) {
          const updated = await Customer.findOneAndUpdate(
            { "visits._id": r._id },
            {
              $set: {
                "visits.$.submitted": true,
                "visits.$.isSubmitted": true,
                "visits.$.submittedToRM": true,
                "visits.$.submittedBy": submittedByName,
                "visits.$.submittedDate": now,
              },
            }
          );
          if (updated) visitCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `✅ ${manualResult.modifiedCount + visitCount} entries submitted to RM/Admin successfully.`,
    });
  } catch (err) {
    console.error("BM Submit Error:", err);
    res.status(500).json({ message: "Failed to submit entries" });
  }
};

/* =============================================================
   📊 Regional Manager View - ALL Order Won entries from Region
   ✅ NOW: Shows ALL entries immediately (no submission required)
   ✅ Shows "Approved by BM" for approved entries
============================================================= */
export const getRMRevenue = async (req, res) => {
  try {
    const rmCode = req.user?.empCode;
    const rmRegion = req.user?.region;
    const assignedApprovees = await getAssignedApproveeEmpCodes(rmCode);

    console.log("🔍 RM Revenue - Region:", rmRegion, "Code:", rmCode);

    const regionUsers = await User.find({
      $or: [
        { region: rmRegion },
        { "reportTo.empCode": rmCode },
        { empCode: { $in: assignedApprovees } },
      ],
    }).lean();
    
    const regionEmpCodes = [...new Set([...regionUsers.map(u => u.empCode), rmCode, ...assignedApprovees])];
    console.log("🔍 Region users count:", regionEmpCodes.length);

    let revenues = [];

    // 1️⃣ Get ALL Customer visits with Order Won/Approved from region employees
    const customers = await Customer.find({
      $or: [
        { "visits.region": rmRegion },
        { "visits.createdBy": { $in: regionEmpCodes } },
        { "createdBy.empCode": { $in: regionEmpCodes } },
      ],
    }).lean();

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // ✅ Show ALL Won/Approved entries immediately
        if (
          (v.orderStatus === "Won" || v.orderStatus === "Approved") &&
          !v.rejected &&
          v.orderValue
        ) {
          const emp = regionUsers.find(u => u.empCode === v.createdBy);
          // ✅ Determine who reported this entry
          const reporterName = v.reportedBy || (emp ? `${emp.empCode} - ${emp.name}` : v.createdBy || "-");
          
          revenues.push({
            _id: v._id,
            customerId: c.customerId,
            customerMobile: c.customerMobile || "NA",
            customerName: c.name || "-",
            company: c.company || "-",
            customerType: c.customerType || "-",
            verticalType: v.vertical || c.vertical || "-",
            distributorCode: v.distributorCode || "-",
            distributorName: v.distributorName || "-",
            orderType: v.orderType || "-",
            itemName: v.itemName || "-",
            poNumber: v.poNumber || "-",
            poFileUrl: v.poFileUrl || "-",
            orderValue: v.orderValue || 0,
            empCode: v.createdBy || c.createdBy?.empCode || "-",
            empName: emp?.name || c.createdBy?.name || "-",
            branch: v.branch || emp?.branch || "-",
            region: v.region || emp?.region || rmRegion || "-",
            date: v.date || c.createdAt,
            // ✅ Reported by (who created the entry)
            reportedBy: reporterName,
            // ✅ BM Approval status
            approved: v.approved || v.orderStatus === "Approved",
            approvedBy: v.approvedBy || "-",
            approvedByBM: v.approvedByBM || null,
            rejected: v.rejected || false,
            rejectedBy: v.rejectedBy || "-",
          });
        }
      });
    });

    // 2️⃣ Get Revenue collection entries
    const revenueEntries = await Revenue.find({
      $or: [
        { region: rmRegion },
        { empCode: { $in: regionEmpCodes } },
        { managerCode: { $in: regionEmpCodes } },
      ],
      rejected: { $ne: true },
    }).lean();

    revenueEntries.forEach((rev) => {
      // Avoid duplicates
      const exists = revenues.some(
        (r) => r.poNumber === rev.poNumber && r.empCode === rev.empCode
      );
      if (!exists) {
        const emp = regionUsers.find(u => u.empCode === rev.empCode);
        revenues.push({
          _id: rev._id,
          customerId: rev.customerId || `MANUAL-${rev._id}`,
          customerMobile: rev.customerMobile || "NA",
          customerName: rev.customerName || "-",
          company: rev.company || "-",
          customerType: rev.customerType || "-",
          verticalType: rev.verticalType || "-",
          distributorCode: rev.distributorCode || "-",
          distributorName: rev.distributorName || "-",
          orderType: rev.orderType || "-",
          itemName: rev.itemName || "-",
          poNumber: rev.poNumber || "-",
          poFileUrl: rev.poFileUrl || "-",
          orderValue: rev.orderValue || 0,
          empCode: rev.empCode || "-",
          empName: emp?.name || rev.empName || "-",
          branch: rev.branch || emp?.branch || "-",
          region: rev.region || emp?.region || rmRegion || "-",
          date: rev.date,
          // ✅ Reported by (who created the entry)
          reportedBy: rev.reportedBy || `${rev.managerCode} - ${rev.managerName}`,
          // ✅ BM Approval status
          approved: rev.approved || false,
          approvedBy: rev.approvedBy || "-",
          approvedByBM: rev.approvedByBM || null,
          rejected: rev.rejected || false,
          rejectedBy: rev.rejectedBy || "-",
        });
      }
    });

    console.log("🔍 Total revenues for RM:", revenues.length);

    const empUsers = await User.find({
      empCode: { $in: [...new Set(revenues.map((r) => r.empCode).filter(Boolean))] },
    }).lean();
    const userMap = {};
    empUsers.forEach((u) => {
      userMap[u.empCode] = u;
    });
    revenues = revenues.map((r) =>
      enrichRowWithApproverMeta(r, userMap[r.empCode], req.user)
    );

    revenues = applyRevenueFilters(revenues, req.query);

    revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenues);
  } catch (err) {
    console.error("RM Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch RM revenue" });
  }
};

/* =============================================================
   📊 Admin View - ALL Order Won entries
   ✅ NOW: Shows ALL entries immediately (no submission required)
   ✅ Shows "Approved by BM" for approved entries
============================================================= */
export const getAdminRevenue = async (req, res) => {
  try {
    const { from, to, branch, region } = req.query;

    // Get all users for empName lookup
    const allUsers = await User.find().lean();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.empCode] = u; });

    let revenues = [];

    // 1️⃣ Get ALL Customer visits with Order Won/Approved
    const customers = await Customer.find({
      "visits.orderStatus": { $in: ["Won", "Approved"] },
    }).lean();

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // ✅ Show ALL Won/Approved entries immediately
        if (
          (v.orderStatus === "Won" || v.orderStatus === "Approved") &&
          !v.rejected &&
          v.orderValue
        ) {
          const emp = userMap[v.createdBy] || userMap[c.createdBy?.empCode];
          // ✅ Determine who reported this entry
          const reporterName = v.reportedBy || (emp ? `${emp.empCode} - ${emp.name}` : v.createdBy || "-");
          
          revenues.push({
            _id: v._id,
            customerId: c.customerId,
            customerMobile: c.customerMobile || "NA",
            customerName: c.name || "-",
            company: c.company || "-",
            customerType: c.customerType || "-",
            verticalType: v.vertical || c.vertical || "-",
            distributorCode: v.distributorCode || "-",
            distributorName: v.distributorName || "-",
            orderType: v.orderType || "-",
            itemName: v.itemName || "-",
            poNumber: v.poNumber || "-",
            poFileUrl: v.poFileUrl || "-",
            orderValue: v.orderValue || 0,
            empCode: v.createdBy || c.createdBy?.empCode || "-",
            empName: emp?.name || c.createdBy?.name || "-",
            branch: v.branch || emp?.branch || "-",
            region: v.region || emp?.region || "-",
            date: v.date || c.createdAt,
            // ✅ Reported by (who created the entry)
            reportedBy: reporterName,
            // ✅ BM Approval status
            approved: v.approved || v.orderStatus === "Approved",
            approvedBy: v.approvedBy || "-",
            approvedByBM: v.approvedByBM || null,
            rejected: v.rejected || false,
            rejectedBy: v.rejectedBy || "-",
            adminApproved: v.adminApproved || false,
            adminApprovedBy: v.adminApprovedBy || null,
          });
        }
      });
    });

    // 2️⃣ Get Revenue collection entries
    const revenueEntries = await Revenue.find({
      rejected: { $ne: true },
    }).lean();

    revenueEntries.forEach((rev) => {
      // Avoid duplicates
      const exists = revenues.some(
        (r) => r.poNumber === rev.poNumber && r.empCode === rev.empCode
      );
      if (!exists) {
        const emp = userMap[rev.empCode];
        revenues.push({
          _id: rev._id,
          customerId: rev.customerId || `MANUAL-${rev._id}`,
          customerMobile: rev.customerMobile || "NA",
          customerName: rev.customerName || "-",
          company: rev.company || "-",
          customerType: rev.customerType || "-",
          verticalType: rev.verticalType || "-",
          distributorCode: rev.distributorCode || "-",
          distributorName: rev.distributorName || "-",
          orderType: rev.orderType || "-",
          itemName: rev.itemName || "-",
          poNumber: rev.poNumber || "-",
          poFileUrl: rev.poFileUrl || "-",
          orderValue: rev.orderValue || 0,
          empCode: rev.empCode || "-",
          empName: emp?.name || rev.empName || "-",
          branch: rev.branch || emp?.branch || "-",
          region: rev.region || emp?.region || "-",
          date: rev.date,
          // ✅ Reported by (who created the entry)
          reportedBy: rev.reportedBy || `${rev.managerCode} - ${rev.managerName}`,
          // ✅ BM Approval status
          approved: rev.approved || false,
          approvedBy: rev.approvedBy || "-",
          approvedByBM: rev.approvedByBM || null,
          rejected: rev.rejected || false,
          rejectedBy: rev.rejectedBy || "-",
          adminApproved: rev.adminApproved || false,
          adminApprovedBy: rev.adminApprovedBy || null,
        });
      }
    });

    console.log("🔍 Admin - Total revenues:", revenues.length);

    revenues = applyRevenueFilters(revenues, req.query);

    revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenues);
  } catch (err) {
    console.error("Admin Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch admin revenue" });
  }
};

/* =============================================================
   ✅ Admin Accept Revenue Entry
============================================================= */
export const adminAcceptRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    const adminName = `${req.user?.empCode} - ${req.user?.name}`;
    const now = new Date();

    const updatedCustomer = await Customer.findOneAndUpdate(
      { "visits._id": id },
      {
        $set: {
          "visits.$.adminApproved": true,
          "visits.$.adminApprovedBy": adminName,
          "visits.$.adminApprovedDate": now,
        },
      },
      { new: true }
    );

    if (updatedCustomer) {
      const visit = updatedCustomer.visits.find((v) => String(v._id) === id);
      if (visit?.poNumber && visit?.createdBy) {
        await Revenue.updateOne(
          { poNumber: visit.poNumber, empCode: visit.createdBy },
          {
            $set: {
              adminApproved: true,
              adminApprovedBy: adminName,
              adminApprovedDate: now,
            },
          }
        );
      }
      return res.json({
        success: true,
        message: "✅ Entry accepted by Admin",
        adminApprovedBy: adminName,
      });
    }

    const updatedRevenue = await Revenue.findByIdAndUpdate(
      id,
      {
        $set: {
          adminApproved: true,
          adminApprovedBy: adminName,
          adminApprovedDate: now,
        },
      },
      { new: true }
    );

    if (updatedRevenue) {
      return res.json({
        success: true,
        message: "✅ Entry accepted by Admin",
        adminApprovedBy: adminName,
      });
    }

    return res.status(404).json({ message: "Entry not found" });
  } catch (err) {
    console.error("Admin Accept Revenue Error:", err);
    res.status(500).json({ message: "Failed to accept entry" });
  }
};

/* =============================================================
   ❌ Admin Reject Revenue Entry (Permanent Delete)
============================================================= */
export const adminRejectRevenue = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({ "visits._id": id });
    if (customer) {
      const visit = customer.visits.id(id);
      const poNumber = visit?.poNumber;
      const empCode = visit?.createdBy;

      customer.visits.pull(id);
      await customer.save();

      if (poNumber && empCode) {
        await Revenue.deleteMany({ poNumber, empCode });
      }
    }

    await Revenue.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "❌ Entry permanently removed",
    });
  } catch (err) {
    console.error("Admin Reject Revenue Error:", err);
    res.status(500).json({ message: "Failed to remove entry" });
  }
};

/* =============================================================
   ✅ Admin: Revenue Approver Assignments
============================================================= */
export const getRevenueApproverAssignments = async (req, res) => {
  try {
    const allUsers = await User.find({ isActive: { $ne: false } }).lean();
    const userMap = {};
    allUsers.forEach((u) => {
      userMap[u.empCode] = u;
    });

    const employees = allUsers.filter((u) =>
      ["Employee", "Manager"].includes(u.role)
    );

    const rows = employees
      .map((emp) => ({
        empCode: emp.empCode,
        empName: emp.name,
        branch: emp.branch || "-",
        region: emp.region || "-",
        revenueApproverEmpCode: emp.revenueApproverEmpCode || "",
        revenueApproverName: emp.revenueApproverName || "",
        approverOptions: buildApproverOptions(emp, userMap),
      }))
      .sort((a, b) => a.empName.localeCompare(b.empName));

    res.json(rows);
  } catch (err) {
    console.error("Get Revenue Approver Assignments Error:", err);
    res.status(500).json({ message: "Failed to fetch revenue approver assignments" });
  }
};

export const setRevenueApproverAssignment = async (req, res) => {
  try {
    const { empCode } = req.params;
    const { approverEmpCode } = req.body;

    const employee = await User.findOne({ empCode });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (!approverEmpCode) {
      await User.updateOne(
        { empCode },
        { $set: { revenueApproverEmpCode: "", revenueApproverName: "" } }
      );
      return res.json({ success: true, message: "Revenue approver cleared" });
    }

    const approver = await User.findOne({ empCode: approverEmpCode });
    if (!approver) {
      return res.status(404).json({ message: "Approver not found" });
    }

    const revenueApproverName = `${approver.empCode} - ${approver.name}`;
    await User.updateOne(
      { empCode },
      {
        $set: {
          revenueApproverEmpCode: approver.empCode,
          revenueApproverName,
        },
      }
    );

    res.json({
      success: true,
      message: "Revenue approver assigned successfully",
      revenueApproverEmpCode: approver.empCode,
      revenueApproverName,
    });
  } catch (err) {
    console.error("Set Revenue Approver Assignment Error:", err);
    res.status(500).json({ message: "Failed to set revenue approver" });
  }
};
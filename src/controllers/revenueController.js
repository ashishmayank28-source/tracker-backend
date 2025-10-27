import Customer from "../models/customerModel.js";
import User from "../models/userModel.js";
import Revenue from "../models/revenueModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";

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
============================================================= */
export const getManagerRevenue = async (req, res) => {
  try {
    const managerCode = req.user?.empCode;
    const { from, to, empCode } = req.query;

    const employees = await User.find({
      $or: [{ managerEmpCode: managerCode }, { "reportTo.empCode": managerCode }],
    });
    const empCodes = employees.map((e) => e.empCode);
    const filterEmpCodes = empCode && empCode !== "all" ? [empCode] : empCodes;

    const customers = await Customer.find({
      $or: [
        { "visits.createdBy": { $in: [...filterEmpCodes, managerCode] } },
        { "createdBy.empCode": { $in: [...filterEmpCodes, managerCode] } },
      ],
    }).lean();

    let reports = [];

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        if (
          (v.orderStatus === "Won" || v.orderStatus === "Approved") &&
          v.reportedBy !== "BM" &&
          v.reportedBy !== "Branch Manager"
        ) {
          const emp = employees.find((e) => e.empCode === v.createdBy);
          reports.push({
            _id: v._id,
            customerId: c.customerId || "-",
            customerMobile: c.customerMobile || "NA",
            customerName: c.name || "-",
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
            managerCode,
            managerName: req.user?.name || "-",
            meetingType: v.meetingType,
            date: v.date || c.createdAt,
            approvedBy: v.approvedBy || "-",
            approved: v.approved || v.orderStatus === "Approved",
            
          });
        }
      });
    });

    // 🔹 Add Manual Revenues from Revenue collection
    const manualRevenues = await Revenue.find({
      managerCode,
      ...(empCode && empCode !== "all" ? { empCode } : {}),
    }).lean();

    manualRevenues.forEach((rev) => {
      reports.push({
        _id: rev._id,
        customerId: rev.customerId || `MANUAL-${rev._id}`,
        customerMobile: rev.customerMobile || "NA",
        customerName: rev.customerName || "-",
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
        empName: employees.find((e) => e.empCode === rev.empCode)?.name || "-",
        managerCode: rev.managerCode,
        managerName: rev.managerName,
        branch: rev.branch || "-",
        region: rev.region || "-",
        meetingType: "Manager Added",
        date: rev.date,
        approved: true,
        approvedBy: rev.approvedBy || "-",
        isSubmitted: rev.isSubmitted || false,
      });
    });

    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      reports = reports.filter(
        (r) => new Date(r.date) >= f && new Date(r.date) <= t
      );
    }

    reports.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(reports);
  } catch (err) {
    console.error("Manager Revenue Error:", err);
    res.status(500).json({ message: err.message });
  }
};
/* =============================================================
   ✅ Approve Revenue Entry
============================================================= */
export const approveRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    const managerName = req.user?.name || "Manager";
    const managerCode = req.user?.empCode;
    const now = new Date();

    // 🔹 Step 1: Update the visit directly and permanently inside Customer
    const updatedCustomer = await Customer.findOneAndUpdate(
      { "visits._id": id },
      {
        $set: {
          "visits.$.approved": true,
          "visits.$.approvedBy": managerName,
          "visits.$.approvedDate": now,
          "visits.$.orderStatus": "Approved", // permanent fix flag
        },
      },
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // 🔹 Step 2: Fetch the approved visit data
    const visit = updatedCustomer.visits.find((v) => String(v._id) === id);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // 🔹 Step 3: Get employee info for Revenue entry
    const employee = await User.findOne({ empCode: visit.createdBy });

    // 🔹 Step 4: Save/Update Revenue record
    const revenueData = {
      empCode: visit.createdBy,
      empName: employee?.name || "-",
      branch: employee?.branch || "-",
      region: employee?.region || "-",
      managerCode,
      managerName,
      customerId: updatedCustomer.customerId,
      customerName: updatedCustomer.name || "Unknown",
      customerMobile: updatedCustomer.customerMobile || "NA",
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
      approvedBy: managerName,
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
      message: "✅ Revenue permanently approved and fixed in database",
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
    const isBM = manager.role === "BM" || manager.role === "Branch Manager";

    // 🔹 Generate manualId (missing earlier)
    const manualId = `MANUAL-${Date.now()}`;

    // 🔹 Save into Revenue collection directly
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
      customerType: customerType || "Manual",
      verticalType: vertical || "-",
      distributorCode: distributorCode || "-",
      distributorName: distributorName || "-",
      orderType: orderType || "Project",
      orderValue: Number(orderValue) || 0,
      itemName,
      poNumber,
      poFileUrl: poFileUrl || "-",
      reportedBy: isBM ? "BM" : "Manager",
      approved: true,
      approvedBy: `${manager.empCode} - ${manager.name}`,
      isManual: true,
      isSubmitted: false,
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
   📤 Submit Manager Report Upward
============================================================= */
export const submitManagerReport = async (req, res) => {
  try {
    const manager = req.user;
    const { reports } = req.body;
    if (!reports?.length)
      return res.status(400).json({ message: "No reports to submit" });

    for (const r of reports) {
      await Customer.findOneAndUpdate(
        { "visits._id": r._id },
        {
          $set: {
            "visits.$.submitted": true,
            "visits.$.submittedBy": manager.name,
            "visits.$.submittedDate": new Date(),
          },
        }
      );
    }

    res.json({ success: true, message: "Manager reports submitted upward" });
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
            branch: v.branch || "-",
            region: v.region || "-",
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
 📤 BM: Submit Manual Entries to RM/Admin
============================================================= */
export const submitBMEntries = async (req, res) => {
  try {
    const bm = req.user;

    console.log("🔹 Submitting entries for BM:", bm.empCode, bm.name);

    // Fetch all pending records for this BM
    const pendingEntries = await Revenue.find({
      managerCode: bm.empCode,
      isSubmitted: { $ne: true },
    });

    if (!pendingEntries.length) {
      return res.json({
        success: false,
        message: "No pending entries found for submission.",
      });
    }

    // Update them to submitted
    const result = await Revenue.updateMany(
      {
        managerCode: bm.empCode,
        isSubmitted: { $ne: true },
      },
      {
        $set: {
          isSubmitted: true,
          submittedBy: `${bm.empCode} - ${bm.name}`,
          submittedDate: new Date(),
        },
      }
    );

    console.log("✅ Submitted entries:", result.modifiedCount);

    res.json({
      success: true,
      message: `✅ ${result.modifiedCount} entries submitted to RM/Admin successfully.`,
    });
  } catch (err) {
    console.error("BM Submit Error:", err);
    res.status(500).json({ message: "Failed to submit entries" });
  }
};


/* =============================================================
   📊 RM View - Combined Reports (BM + Their Teams + Manager Approved)
============================================================= */
export const getRMRevenue = async (req, res) => {
  try {
    const rmCode = req.user?.empCode;
    const rmName = req.user?.name || "Unknown RM";
    const { from, to, branch } = req.query;

    console.log("📥 RM Revenue API called by:", rmCode, "-", rmName);

    // 🔹 Step 1: Get all BMs under this RM
    const bms = await User.find({
  $or: [
    { managerEmpCode: rmCode },
    { "reportTo.empCode": rmCode }, // ye nested array se check karega
    { "reportTo.0.empCode": rmCode }, // extra safety in case array indexing needed
  ],
  role: { $in: ["BM", "BranchManager", "Branch Manager"] },
});
    const bmCodes = bms.map((b) => b.empCode);
    console.log(`👥 Found ${bms.length} BMs under RM ${rmCode}:`, bmCodes);

    // 🔹 Step 2: Get all employees under those BMs
    const teamUnderBMs = await User.find({
      managerEmpCode: { $in: bmCodes },
    }).distinct("empCode");

    console.log(
      `👤 Found ${teamUnderBMs.length} employees under BMs (${bmCodes.length} total BMs)`
    );

    // 🔹 Step 3: Fetch all relevant revenue entries
    let reports = await Revenue.find({
      $or: [
        // (1) Manager-approved entries (employees under BMs)
        {
          empCode: { $in: teamUnderBMs },
          approved: true,
        },
        // (2) BM's manual submitted entries
        {
          managerCode: { $in: bmCodes },
          isManual: true,
          isSubmitted: true,
        },
        // (3) BM's submitted manager-approved entries
        {
          managerCode: { $in: bmCodes },
          approved: true,
          isSubmitted: true,
        },
      ],
    }).lean();

    console.log(`📊 Raw reports fetched: ${reports.length}`);

    // 🔹 Step 4: Apply optional filters
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      reports = reports.filter(
        (r) => new Date(r.date) >= f && new Date(r.date) <= t
      );
      console.log(`📅 Filtered by date range (${from} → ${to}):`, reports.length);
    }

    if (branch) {
      reports = reports.filter(
        (r) => r.branch?.toLowerCase() === branch.toLowerCase()
      );
      console.log(`🏢 Filtered by branch '${branch}':`, reports.length);
    }

    // 🔹 Step 5: Remove duplicates (same PO or manualId)
    const uniqueReports = reports.filter(
      (r, i, self) =>
        i ===
        self.findIndex(
          (x) =>
            x.poNumber === r.poNumber &&
            x.customerId === r.customerId &&
            x.empCode === r.empCode
        )
    );

    console.log(`🧾 Final unique reports count: ${uniqueReports.length}`);

    // 🔹 Step 6: Sort by latest
    uniqueReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(uniqueReports);
  } catch (err) {
    console.error("❌ RM Revenue Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch RM revenue data" });
  }
};
/* =============================================================
   📊 Admin View – All Revenues Across Regions (Full Hierarchy)
============================================================= */
export const getAdminRevenue = async (req, res) => {
  try {
    console.log("📥 Admin Revenue API called by:", req.user?.empCode, "-", req.user?.name);

    const { from, to, region, branch } = req.query;

    // 🔹 Step 1: Get all Regional Managers
    const rms = await User.find({
      role: { $in: ["RM", "RegionalManager", "Regional Manager"] },
    }).lean();

    const rmCodes = rms.map((r) => r.empCode);
    console.log(`🌍 Found ${rms.length} Regional Managers:`, rmCodes);

    // 🔹 Step 2: Get all Branch Managers under these RMs (both mapping styles)
    const bms = await User.find({
      $or: [
        { managerEmpCode: { $in: rmCodes } },
        { "reportTo.empCode": { $in: rmCodes } },
        { "reportTo.0.empCode": { $in: rmCodes } },
      ],
      role: { $in: ["BM", "BranchManager", "Branch Manager"] },
    }).lean();

    const bmCodes = bms.map((b) => b.empCode);
    console.log(`🏢 Found ${bms.length} Branch Managers under RMs.`);

    // 🔹 Step 3: Get all Managers/Employees under those BMs
    const teamUnderBMs = await User.find({
      $or: [
        { managerEmpCode: { $in: bmCodes } },
        { "reportTo.empCode": { $in: bmCodes } },
        { "reportTo.0.empCode": { $in: bmCodes } },
      ],
    }).distinct("empCode");

    console.log(`👥 Found ${teamUnderBMs.length} employees under BMs.`);

    // 🔹 Step 4: Fetch all relevant revenue entries
    let reports = await Revenue.find({
      $or: [
        // (1) Manager-approved entries under employees
        { empCode: { $in: teamUnderBMs }, approved: true },
        // (2) BM manual entries (submitted upward)
        { managerCode: { $in: bmCodes }, isManual: true, isSubmitted: true },
        // (3) BM forwarded manager-approved entries
        { managerCode: { $in: bmCodes }, approved: true, isSubmitted: true },
      ],
    }).lean();

    console.log(`📊 Raw reports fetched: ${reports.length}`);

    // 🔹 Step 5: Optional filters
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      reports = reports.filter(
        (r) => new Date(r.date) >= f && new Date(r.date) <= t
      );
    }

    if (region) {
      reports = reports.filter(
        (r) => r.region?.toLowerCase() === region.toLowerCase()
      );
    }

    if (branch) {
      reports = reports.filter(
        (r) => r.branch?.toLowerCase() === branch.toLowerCase()
      );
    }

    // 🔹 Step 6: Remove duplicates
    const uniqueReports = reports.filter(
      (r, i, self) =>
        i ===
        self.findIndex(
          (x) =>
            x.poNumber === r.poNumber &&
            x.customerId === r.customerId &&
            x.empCode === r.empCode
        )
    );

    uniqueReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log("🧾 Final unique reports count:", uniqueReports.length);
    res.json(uniqueReports);
  } catch (err) {
    console.error("Admin Revenue Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch Admin revenue data" });
  }
};

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
    const approvedByName = `${managerCode} - ${managerName}`;
    const updatedCustomer = await Customer.findOneAndUpdate(
      { "visits._id": id },
      {
        $set: {
          "visits.$.approved": true,
          "visits.$.approvedBy": approvedByName,
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
      approvedBy: approvedByName,
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
   📊 Branch Manager View - Manager Submitted + Direct Reportees
============================================================= */
export const getBMRevenue = async (req, res) => {
  try {
    const bmCode = req.user?.empCode;
    const bmBranch = req.user?.branch;
    const { from, to, empCode } = req.query;

    console.log("🔍 BM Revenue - Code:", bmCode, "Branch:", bmBranch);

    // 1️⃣ Find all managers and employees who report to this BM
    const reportees = await User.find({
      $or: [
        { "reportTo.empCode": bmCode },
        { managerEmpCode: bmCode },
        { branch: bmBranch },
      ],
    }).lean();

    const reporteeEmpCodes = reportees.map((r) => r.empCode);
    const managerCodes = reportees
      .filter((r) => r.role === "Manager")
      .map((r) => r.empCode);

    console.log("🔍 BM Reportees:", reporteeEmpCodes.length, "Managers:", managerCodes.length);

    // 2️⃣ Get ALL submitted Revenue entries from managers in this branch
    let revenues = await Revenue.find({
      $or: [
        { managerCode: { $in: managerCodes }, submittedToBM: true },
        { managerCode: { $in: managerCodes }, isSubmitted: true },
        { empCode: { $in: reporteeEmpCodes }, approved: true },
        { managerCode: bmCode }, // BM's own manual entries
      ],
    }).lean();

    console.log("🔍 Revenue collection entries for BM:", revenues.length);

    // 3️⃣ Get approved Customer visits from direct reportees and managers
    const customers = await Customer.find({
      $or: [
        { "visits.createdBy": { $in: reporteeEmpCodes } },
        { "createdBy.empCode": { $in: reporteeEmpCodes } },
      ],
    }).lean();

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // Include if approved/won and from reportee
        if ((v.approved || v.orderStatus === "Approved" || v.orderStatus === "Won") &&
            reporteeEmpCodes.includes(v.createdBy)) {
          // Avoid duplicates
          const exists = revenues.some(
            (r) => r.poNumber === v.poNumber && r.empCode === v.createdBy
          );
          if (!exists && v.orderValue) {
            const emp = reportees.find((e) => e.empCode === v.createdBy);
            revenues.push({
              _id: v._id,
              customerId: c.customerId,
              customerMobile: c.customerMobile || "NA",
              customerName: c.name || "-",
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
              branch: v.branch || emp?.branch || bmBranch || "-",
              region: v.region || emp?.region || "-",
              date: v.date || c.createdAt,
              approved: v.approved || v.orderStatus === "Approved",
              approvedBy: v.approvedBy || "-",
              submittedBy: v.submittedBy || "-",
              isSubmitted: v.isSubmitted || v.submitted || false,
            });
          }
        }
      });
    });

    console.log("🔍 Total revenues for BM after merge:", revenues.length);

    // Filter by empCode if provided
    if (empCode && empCode !== "all") {
      revenues = revenues.filter((r) => r.empCode === empCode);
    }

    // Date filtering
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      revenues = revenues.filter((r) => {
        const d = new Date(r.date);
        return d >= fromDate && d <= toDate;
      });
    }

    revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenues);
  } catch (err) {
    console.error("BM Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch BM revenue" });
  }
};

/* =============================================================
 📤 BM: Submit ALL Approved Entries to RM/Admin
============================================================= */
export const submitBMEntries = async (req, res) => {
  try {
    const bm = req.user;
    const { reports } = req.body;

    // 1️⃣ Submit ALL entries from Revenue collection (not just manual)
    const manualResult = await Revenue.updateMany(
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

    // 2️⃣ Also mark approved Customer visits as submitted
    let visitCount = 0;
    if (reports && Array.isArray(reports)) {
      for (const r of reports) {
        if (r._id) {
          const updated = await Customer.findOneAndUpdate(
            { "visits._id": r._id },
            {
              $set: {
                "visits.$.submitted": true,
                "visits.$.isSubmitted": true,
                "visits.$.submittedBy": `${bm.empCode} - ${bm.name}`,
                "visits.$.submittedDate": new Date(),
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
   📊 Regional Manager View - ALL Submitted Revenue from Region
============================================================= */
export const getRMRevenue = async (req, res) => {
  try {
    const rmCode = req.user?.empCode;
    const rmRegion = req.user?.region;
    const { from, to, branch } = req.query;

    console.log("🔍 RM Revenue - Region:", rmRegion, "Code:", rmCode);

    // Find ALL users in this region (BMs, Managers, Employees)
    const regionUsers = await User.find({
      $or: [
        { region: rmRegion },
        { "reportTo.empCode": rmCode },
      ],
    }).lean();
    
    const regionEmpCodes = regionUsers.map(u => u.empCode);
    console.log("🔍 Region users count:", regionEmpCodes.length);

    // 1️⃣ Get ALL submitted Revenue entries from this region
    let revenues = await Revenue.find({
      $or: [
        { region: rmRegion },
        { empCode: { $in: regionEmpCodes } },
        { managerCode: { $in: regionEmpCodes } },
      ],
      isSubmitted: true,
    }).lean();

    console.log("🔍 Revenue collection entries:", revenues.length);

    // 2️⃣ Get ALL approved & submitted Customer visits from this region
    const customers = await Customer.find({
      $or: [
        { "visits.region": rmRegion },
        { "visits.createdBy": { $in: regionEmpCodes } },
        { "createdBy.empCode": { $in: regionEmpCodes } },
      ],
    }).lean();

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // Include if approved AND (submitted OR orderStatus is Approved)
        if ((v.approved || v.orderStatus === "Approved") && 
            (v.submitted || v.isSubmitted || v.orderStatus === "Approved")) {
          // Avoid duplicates by checking poNumber + empCode
          const exists = revenues.some(
            (r) => r.poNumber === v.poNumber && r.empCode === (v.createdBy || c.createdBy?.empCode)
          );
          if (!exists && v.orderValue) {
            const emp = regionUsers.find(u => u.empCode === v.createdBy);
            revenues.push({
              _id: v._id,
              customerId: c.customerId,
              customerMobile: c.customerMobile || "NA",
              customerName: c.name || "-",
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
              approvedBy: v.approvedBy || "-",
              submittedBy: v.submittedBy || "-",
            });
          }
        }
      });
    });

    console.log("🔍 Total revenues after merge:", revenues.length);

    // Date filtering
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      revenues = revenues.filter((r) => {
        const d = new Date(r.date);
        return d >= fromDate && d <= toDate;
      });
    }

    // Branch filtering
    if (branch) {
      revenues = revenues.filter((r) =>
        (r.branch || "").toLowerCase().includes(branch.toLowerCase())
      );
    }

    // Employee name filtering
    if (req.query.empName) {
      const empNameFilter = req.query.empName.toLowerCase();
      revenues = revenues.filter((r) =>
        (r.empName || "").toLowerCase().includes(empNameFilter)
      );
    }

    revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenues);
  } catch (err) {
    console.error("RM Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch RM revenue" });
  }
};

/* =============================================================
   📊 Admin View - ALL Submitted Revenue
============================================================= */
export const getAdminRevenue = async (req, res) => {
  try {
    const { from, to, branch, region } = req.query;

    // Get all users for empName lookup
    const allUsers = await User.find().lean();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.empCode] = u; });

    // 1️⃣ Get ALL submitted Revenue entries
    let revenues = await Revenue.find({ isSubmitted: true }).lean();
    console.log("🔍 Admin - Revenue collection entries:", revenues.length);

    // 2️⃣ Get ALL approved & submitted Customer visits
    const customers = await Customer.find({
      $or: [
        { "visits.approved": true },
        { "visits.orderStatus": "Approved" },
        { "visits.submitted": true },
        { "visits.isSubmitted": true },
      ],
    }).lean();

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // Include if approved AND has orderValue
        if ((v.approved || v.orderStatus === "Approved") && v.orderValue) {
          // Avoid duplicates
          const exists = revenues.some(
            (r) => r.poNumber === v.poNumber && r.empCode === (v.createdBy || c.createdBy?.empCode)
          );
          if (!exists) {
            const emp = userMap[v.createdBy] || userMap[c.createdBy?.empCode];
            revenues.push({
              _id: v._id,
              customerId: c.customerId,
              customerMobile: c.customerMobile || "NA",
              customerName: c.name || "-",
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
              approvedBy: v.approvedBy || "-",
              submittedBy: v.submittedBy || "-",
            });
          }
        }
      });
    });

    console.log("🔍 Admin - Total revenues after merge:", revenues.length);

    // Date filtering
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      revenues = revenues.filter((r) => {
        const d = new Date(r.date);
        return d >= fromDate && d <= toDate;
      });
    }

    // Branch filtering
    if (branch) {
      revenues = revenues.filter((r) =>
        (r.branch || "").toLowerCase().includes(branch.toLowerCase())
      );
    }

    // Region filtering
    if (region) {
      revenues = revenues.filter((r) =>
        (r.region || "").toLowerCase().includes(region.toLowerCase())
      );
    }

    // Employee name filtering
    if (req.query.empName) {
      const empNameFilter = req.query.empName.toLowerCase();
      revenues = revenues.filter((r) =>
        (r.empName || "").toLowerCase().includes(empNameFilter)
      );
    }

    revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(revenues);
  } catch (err) {
    console.error("Admin Revenue Error:", err);
    res.status(500).json({ message: "Failed to fetch admin revenue" });
  }
};
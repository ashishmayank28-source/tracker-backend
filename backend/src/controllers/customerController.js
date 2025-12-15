import Customer from "../models/customerModel.js";
import User from "../models/userModel.js";
import generateCustomerId from "../utils/generateCustomerId.js";

/* -------------------------------------------------------------
   🧾 Create New Visit (Employee Daily Tracker)
------------------------------------------------------------- */
export const createVisit = async (req, res) => {
  try {
    console.log("🔥 createVisit HANDLER REACHED");

    const {
      empCode: rawEmpCode,
      vertical,
      meetingType,
      callType,
      customerType,
      name,
      mobile,
      company,
      designation,
      discussion,
      opportunityType,
      orderStatus,
      orderValue,
      orderLossReason,
      nextMeetingDate,
      expectedOrderDate,
      reason,
      attendees,
      purpose,
      distributorName,
      distributorCode,
      orderType,
      itemName,
      poNumber,
      poFileUrl,
    } = req.body;

    // 🟢 Prefer empCode from logged-in user; fallback to body if needed
    const userEmpCode = req.user?.empCode;
    const empCode = userEmpCode
      ? String(userEmpCode)
      : Array.isArray(rawEmpCode)
      ? String(rawEmpCode[0] || "")
      : String(rawEmpCode || "");

    console.log("Normalized empCode for new visit:", empCode);
    console.log("🟢 Incoming Body:", req.body);

    const emp = req.user || {};

    /* ✅ Case 1: Internal meeting (no external customer) */
    if (meetingType === "Internal") {
      const internal = new Customer({
        customerId: generateCustomerId("INTERNAL", Date.now()),
        vertical: vertical || "",
        customerType: "Internal",
        name: "Internal Meeting",
        customerMobile: "NA",
        company: "NA",
        designation: "NA",
        empCode, // customer level
        createdBy: { empCode, name: emp.name || "" },
        visits: [
          {
            meetingType: "Internal",
            callType: callType || "",
            discussion: discussion || "",
            opportunityType: opportunityType || "",
            orderStatus: orderStatus || "Open",
            orderValue: Number(orderValue) || 0,
            orderLossReason: orderLossReason || "",
            nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
            expectedOrderDate: expectedOrderDate
              ? new Date(expectedOrderDate)
              : null,
            reason: reason || "",
            attendees: attendees || "",
            purpose: purpose || "",
            distributorName: distributorName || "",
            distributorCode: distributorCode || "",
            orderType: orderType || "",
            itemName: itemName || "",
            poNumber: poNumber || "",
            poFileUrl: poFileUrl || "",
            empCode, // visit level
            createdBy: empCode,
            createdByName: emp.name || "",
            date: new Date(),
            branch: emp.branch || "-",
            region: emp.region || "-",
            reportedBy: "Employee",
            approved: false,
            submitted: true,
          },
        ],
      });

      await internal.save();
      return res.json({
        success: true,
        message: "✅ Internal meeting saved",
        customerId: internal.customerId,
      });
    }

    /* ✅ Case 2: Leave Application */
    if (meetingType === "Leave") {
      const leave = new Customer({
        customerId: generateCustomerId("LEAVE", Date.now()),
        vertical: "Leave",
        customerType: "Leave",
        name: "Leave Application",
        customerMobile: "NA",
        company: "NA",
        designation: "NA",
        empCode, // customer level
        createdBy: { empCode, name: emp.name || "" },
        visits: [
          {
            meetingType: "Leave",
            callType: "",
            discussion: discussion || purpose || "Leave",
            opportunityType: "",
            orderStatus: "NA",
            orderValue: 0,
            orderLossReason: "",
            nextMeetingDate: null,
            expectedOrderDate: null,
            reason: discussion || purpose || "Leave",
            attendees: emp.name || empCode,
            purpose: discussion || purpose || "Leave",
            distributorName: "",
            distributorCode: "",
            orderType: "",
            itemName: "",
            poNumber: "",
            poFileUrl: "",
            empCode, // visit level
            createdBy: empCode,
            createdByName: emp.name || "",
            date: new Date(),
            branch: emp.branch || "-",
            region: emp.region || "-",
            reportedBy: "Employee",
            approved: false,
            submitted: true,
          },
        ],
      });

      await leave.save();
      return res.json({
        success: true,
        message: "✅ Leave submitted successfully",
        customerId: leave.customerId,
      });
    }

    /* ✅ Case 3: External meeting (linked to a customer) */
    let customer = await Customer.findOne({ customerMobile: mobile });

    if (!customer) {
      const newCustomerId = generateCustomerId(name, mobile);
      customer = new Customer({
        customerId: newCustomerId,
        vertical: vertical || "",
        customerType: customerType || "New",
        name: name || "",
        customerMobile: mobile || "",
        company: company || "",
        designation: designation || "",
        empCode, // customer level
        createdBy: { empCode, name: emp.name || "" },
        visits: [],
      });
    }

    // 🔹 File path (if uploaded)
    const poFilePath = req.file
      ? `/uploads/${new Date().getFullYear()}/${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}/${req.file.filename}`
      : poFileUrl || "";

    // 🔹 Construct visit object
    const newVisit = {
      meetingType: meetingType || "",
      callType: callType || "",
      vertical: vertical || "",  // ✅ Added vertical field
      discussion: discussion || "",
      opportunityType: opportunityType || "",
      orderStatus: orderStatus || "Open",
      orderValue: Number(orderValue) || 0,
      orderLossReason: orderLossReason || "",
      nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
      expectedOrderDate: expectedOrderDate ? new Date(expectedOrderDate) : null,
      reason: reason || "",
      attendees: attendees || "",
      purpose: purpose || "",
      distributorName: distributorName || "",
      distributorCode: distributorCode || "",
      orderType: orderType || "",
      itemName: itemName || "",
      poNumber: poNumber || "",
      poFileUrl: poFilePath,
      empCode, // visit level
      createdBy: empCode,
      createdByName: emp.name || "",
      date: new Date(),
      branch: emp.branch || "-",
      region: emp.region || "-",
      reportedBy: "Employee",
      approved: false,
      submitted: true,
    };

    customer.visits.push(newVisit);
    await customer.save();

    res.json({
      success: true,
      message: "✅ Visit saved successfully",
      customerId: customer.customerId,
    });
  } catch (err) {
    console.error("Create Visit Error:", err);
    res.status(500).json({ success: false, message: "Failed to save visit" });
  }
};

/* -------------------------------------------------------------
   🔍 Search Customer
------------------------------------------------------------- */
export const searchCustomer = async (req, res) => {
  try {
    const q = req.query.q || "";
    const results = await Customer.find({
      $or: [
        { name: new RegExp(q, "i") },
        { customerMobile: new RegExp(q, "i") },
        { customerId: new RegExp(q, "i") },
      ],
    }).limit(10);
    res.json(results);
  } catch (err) {
    console.error("Search Customer Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------
   📜 Get Customer History
------------------------------------------------------------- */
export const getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({ customerId: id });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });
    
    // ✅ Return full customer object with visits (sorted latest first)
    const sortedVisits = (customer.visits || []).sort(
      (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
    
    // ✅ Enrich visits with customer details
    const enrichedVisits = sortedVisits.map(v => ({
      ...v.toObject ? v.toObject() : v,
      customerId: customer.customerId,
      customerName: customer.name,
      name: customer.name,
      customerMobile: customer.customerMobile || customer.mobile,
      mobile: customer.customerMobile || customer.mobile,
      customerType: customer.customerType,
      company: customer.company,
    }));
    
    res.json(enrichedVisits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------
   🔁 Revisit (Add New Follow-Up Entry)
------------------------------------------------------------- */
export const revisit = async (req, res) => {
  try {
    const {
      empCode: rawEmpCode,
      discussion,
      orderStatus,
      orderValue,
      orderLossReason,
      nextMeetingDate,
      expectedOrderDate,
      vertical,
      distributorName,
      distributorCode,
      orderType,
      itemName,
      poNumber,
      poFileUrl,
    } = req.body;

    const userEmpCode = req.user?.empCode;
    const empCode = userEmpCode
      ? String(userEmpCode)
      : Array.isArray(rawEmpCode)
      ? String(rawEmpCode[0] || "")
      : String(rawEmpCode || "");

    console.log("Normalized empCode for revisit:", empCode);

    const c = await Customer.findOne({ customerId: req.params.id });
    if (!c) return res.status(404).json({ message: "Customer not found" });

    // 🔹 File path (if uploaded via FormData)
    const poFilePath = req.file
      ? `/uploads/${new Date().getFullYear()}/${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}/${req.file.filename}`
      : poFileUrl || "";

    const newVisit = {
      meetingType: "Revisit",
      discussion: discussion || "",
      orderStatus: orderStatus || "Open",
      orderValue: Number(orderValue) || 0,
      orderLossReason: orderLossReason || "",
      nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
      expectedOrderDate: expectedOrderDate ? new Date(expectedOrderDate) : null,
      vertical: vertical || c.vertical || "",
      distributorName: distributorName || c.distributorName || "",
      distributorCode: distributorCode || c.distributorCode || "",
      orderType: orderType || "",
      itemName: itemName || "",
      poNumber: poNumber || "",
      poFileUrl: poFilePath,  // ✅ Now uses uploaded file path
      reportedBy: "Employee",
      approved: false,
      submitted: true,
      empCode,
      createdBy: empCode,
      date: new Date(),
    };

    c.visits.push(newVisit);
    await c.save();

    console.log("✅ Revisit Added for:", c.customerId, newVisit);

    res.json({
      success: true,
      message: "✅ Revisit saved successfully",
      data: newVisit,
    });
  } catch (err) {
    console.error("❌ Revisit Error:", err);
    res.status(500).json({ success: false, message: "Failed to save revisit" });
  }
};

/* -------------------------------------------------------------
   📊 My Reports (Employee Submitted Reports)
------------------------------------------------------------- */
export const myReports = async (req, res) => {
  try {
    const rawEmpCode = req.user?.empCode;
    if (!rawEmpCode)
      return res.status(400).json({ message: "No empCode found" });

    const empCode = String(
      Array.isArray(rawEmpCode) ? rawEmpCode[0] || "" : rawEmpCode || ""
    );

    console.log("📊 myReports called for empCode:", empCode);

    const { from, to } = req.query;

    // Find all customers where this employee has interacted
    const customers = await Customer.find(
      {
        $or: [
          { empCode: empCode },
          { "createdBy.empCode": empCode },
          { "visits.empCode": empCode }, // string
          { "visits.empCode": { $in: [empCode] } }, // array
          { "visits.createdBy": empCode },
          { "visits.createdBy.empCode": empCode },
        ],
      },
      {
        customerId: 1,
        name: 1,
        customerMobile: 1,
        company: 1,
        designation: 1,
        customerType: 1,
        vertical: 1,
        visits: 1,
        createdAt: 1,
      }
    );

    console.log("📊 Found customers:", customers.length);

    let rows = [];
    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        const vEmp = v.empCode;
        let isMatch = false;

        if (typeof vEmp === "string" && vEmp === empCode) {
          isMatch = true;
        } else if (Array.isArray(vEmp) && vEmp.includes(empCode)) {
          isMatch = true;
        } else if (v.createdBy === empCode) {
          isMatch = true;
        } else if (v.createdBy?.empCode === empCode) {
          isMatch = true;
        }

        if (!isMatch) return;

        rows.push({
          _id: v._id,
          customerId: c.customerId,
          name: c.name,
          customerMobile: c.customerMobile,
          company: c.company || "-",
          designation: c.designation || "-",
          customerType: c.customerType,
          discussion: v.discussion,
          opportunityType: v.opportunityType,
          orderStatus: v.orderStatus || "-",
          orderValue: v.orderValue || "-",
          orderLossReason: v.orderLossReason || "-",
          nextMeetingDate: v.nextMeetingDate || v.nextMeeting,
          expectedOrderDate: v.expectedOrderDate || v.expectedOrder,
          attendees: v.attendees,
          purpose: v.purpose,
          date: v.date || v.visitDate || v.createdAt || c.createdAt,
          empCode: Array.isArray(v.empCode) ? v.empCode.join(",") : v.empCode,
          vertical: c.vertical || "-",
          meetingType: v.meetingType,
          callType: v.callType,
          reason: v.reason,
          distributorName: v.distributorName || "-",
          distributorCode: v.distributorCode || "-",
          orderType: v.orderType || "-",
          itemName: v.itemName || "-",
          poNumber: v.poNumber || "-",
          poFileUrl: v.poFileUrl || "-",
          // ✅ Reported by (who created the entry)
          reportedBy: v.reportedBy || v.createdBy || "-",
          // ✅ Approval fields
          approved: v.approved || v.orderStatus === "Approved",
          approvedBy: v.approvedBy || "-",
          approvedByBM: v.approvedByBM || null,
          approvedDate: v.approvedDate || null,
          // ✅ Rejection fields
          rejected: v.rejected || v.orderStatus === "Rejected",
          rejectedBy: v.rejectedBy || "-",
          rejectReason: v.rejectReason || "-",
        });
      });
    });

    console.log("📊 Flattened reports count:", rows.length);

    // ✅ Also fetch manual entries from Revenue collection for this employee
    const Revenue = (await import("../models/revenueModel.js")).default;
    const manualRevenues = await Revenue.find({ empCode }).lean();
    
    manualRevenues.forEach((rev) => {
      // Avoid duplicates - check if poNumber already exists
      const exists = rows.some(r => r.poNumber === rev.poNumber);
      if (!exists && rev.orderValue) {
        rows.push({
          _id: rev._id,
          customerId: rev.customerId || `MANUAL-${rev._id}`,
          name: rev.customerName || "Manual Entry",
          customerMobile: rev.customerMobile || "NA",
          company: "-",
          designation: "-",
          customerType: rev.customerType || "Manual",
          discussion: "-",
          opportunityType: "-",
          orderStatus: rev.orderStatus || "Won",
          orderValue: rev.orderValue || 0,
          orderLossReason: "-",
          nextMeetingDate: null,
          expectedOrderDate: null,
          attendees: "-",
          purpose: "Manual Entry by Manager",
          date: rev.date || rev.createdAt,
          empCode: rev.empCode,
          vertical: rev.verticalType || "-",
          meetingType: "Manager Added",
          callType: "-",
          reason: "-",
          distributorName: rev.distributorName || "-",
          distributorCode: rev.distributorCode || "-",
          orderType: rev.orderType || "-",
          itemName: rev.itemName || "-",
          poNumber: rev.poNumber || "-",
          poFileUrl: rev.poFileUrl || "-",
          // ✅ Reported by (Manager who created the entry)
          reportedBy: rev.reportedBy || `${rev.managerCode} - ${rev.managerName}`,
          // ✅ Approval fields
          approved: rev.approved || false,
          approvedBy: rev.approvedBy || "-",
          approvedByBM: rev.approvedByBM || null,
          approvedDate: rev.approvedDate || null,
          // ✅ Rejection fields
          rejected: rev.rejected || false,
          rejectedBy: rev.rejectedBy || "-",
          rejectReason: rev.rejectReason || "-",
        });
      }
    });

    console.log("📊 After adding manual entries:", rows.length);

    if (from && to) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => {
        const d = new Date(r.date);
        return d >= fromDate && d <= toDate;
      });
      console.log("📊 After date filter:", rows.length);
    }

    // ✅ Get employee details from User model for enrichment
    const currentUser = await User.findOne({ empCode }).lean();
    const managerName = currentUser?.reportTo?.[0]?.name || "-";
    const userLocation = currentUser?.area || "-";
    const userBranch = currentUser?.branch || "-";
    const userRegion = currentUser?.region || "-";

    // ✅ Enrich all rows with user details
    const enrichedRows = rows.map(r => ({
      ...r,
      empName: currentUser?.name || "-",
      location: userLocation,
      area: userLocation,
      branch: userBranch,
      region: userRegion,
      managerName: managerName,
    }));

    enrichedRows.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(enrichedRows);
  } catch (err) {
    console.error("❌ MyReports Error:", err);
    res.status(500).json({ message: err.message });
  }
};

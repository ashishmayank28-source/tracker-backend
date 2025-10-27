import Customer from "../models/customerModel.js";
import generateCustomerId from "../utils/generateCustomerId.js";

/* -------------------------------------------------------------
   🧾 Create New Visit (Employee Daily Tracker)
------------------------------------------------------------- */
export const createVisit = async (req, res) => {
  try {
    const {
      empCode,
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

    const emp = req.user;
    console.log("🟢 Incoming Body:", req.body);

    // ✅ Case 1: Internal meeting (no customer linkage)
    if (meetingType === "Internal") {
      const internal = new Customer({
        customerId: generateCustomerId("INTERNAL", Date.now()),
        vertical,
        customerType: "Internal",
        name: "Internal Meeting",
        mobile: "NA",
        company: "NA",
        designation: "NA",
        createdBy: { empCode: emp.empCode, name: emp.name },
        visits: [
          {
            meetingType,
            attendees,
            purpose,
            createdBy: emp.empCode,
            createdByName: emp.name,
            date: new Date(),
            branch: emp.branch || "-",   // 🟢 added
            region: emp.region || "-",   // 🟢 added
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

    // ✅ Case 2: External meeting (customer based)
    let customer = await Customer.findOne({ customerMobile: mobile });

    if (!customer) {
      const newCustomerId = generateCustomerId(name, mobile);
      customer = new Customer({
        customerId: newCustomerId,
        vertical,
        customerType: customerType || "New",
        name,
        customerMobile: mobile,
        company,
        designation,
        createdBy: { empCode: emp.empCode, name: emp.name },
        visits: [],
      });
    }

    // 🔹 File path (if uploaded)
    const poFilePath = req.file
      ? `/uploads/${new Date().getFullYear()}/${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}/${req.file.filename}`
      : poFileUrl || "-";

    // 🔹 Construct visit object
    const newVisit = {
      meetingType,
      callType,
      discussion,
      opportunityType,
      orderStatus: orderStatus || "Open",
      orderValue: Number(orderValue) || 0,
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
      poFileUrl: poFilePath,
      createdBy: emp.empCode,
      createdByName: emp.name,
      date: new Date(),
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
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer.visits || []);
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
      empCode,
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

    // 🟢 Step 1: Find Customer by ID
    const c = await Customer.findOne({ customerId: req.params.id });
    if (!c) return res.status(404).json({ message: "Customer not found" });

    // 🟢 Step 2: Prepare clean Revisit object (NO default '-')
    const newVisit = {
      meetingType: "Revisit",
      discussion: discussion || "",
      orderStatus: orderStatus || "Won",
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
      poFileUrl: poFileUrl || "",
      reportedBy: "Employee",
      approved: false,
      submitted: false,
      createdBy: empCode,
      date: new Date(),
    };

    // 🟢 Step 3: Add new visit and save
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
    const empCode = req.user?.empCode;
    if (!empCode) return res.status(400).json({ message: "No empCode found" });

    const { from, to } = req.query;

    // Find all customers where this employee created visits
    const customers = await Customer.find(
      { "visits.createdBy": empCode },
      {
        customerId: 1,
        name: 1,
        customerMobile: 1,
        company: 1,
        designation: 1,
        customerType: 1,
        vertical: 1,
        visits: 1,
      }
    );

    let reports = [];
    customers.forEach((c) => {
      c.visits.forEach((v) => {
        if (v.createdBy === empCode) {
          reports.push({
            customerId: c.customerId,
            vertical: c.vertical || "-",
            empCode: v.createdBy || "-",
            name: c.name,
            customerMobile: c.customerMobile,
            company: c.company || "-",
            designation: c.designation || "-",
            customerType: c.customerType,
            meetingType: v.meetingType,
            callType: v.callType,
            discussion: v.discussion,
            opportunityType: v.opportunityType,
            orderStatus: v.orderStatus || "-",
            orderValue: v.orderValue || "-",
            orderLossReason: v.orderLossReason || "-",
            nextMeetingDate: v.nextMeetingDate,
            expectedOrderDate: v.expectedOrderDate,
            reason: v.reason,
            attendees: v.attendees,
            purpose: v.purpose,
            distributorName: v.distributorName || "-",
            distributorCode: v.distributorCode || "-",
            orderType: v.orderType || "-",
            itemName: v.itemName || "-",
            poNumber: v.poNumber || "-",
            poFileUrl: v.poFileUrl || "-",
            date: v.date,
          });
        }
      });
    });

    // Date filter
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      reports = reports.filter(
        (r) => new Date(r.date) >= fromDate && new Date(r.date) <= toDate
      );
    }

    // Sort by latest
    reports.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(reports);
  } catch (err) {
    console.error("MyReports Error:", err);
    res.status(500).json({ message: err.message });
  }
};

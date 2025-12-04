import Customer from "../models/customerModel.js";
import User from "../models/userModel.js";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

/* ---------- Admin Report Dump ---------- */
export const getReportsDump = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const reports = await Customer.find(filter).lean();

    // 🔹 Collect all possible visit question keys
    const allVisitKeys = new Set();
    reports.forEach((r) => {
      (r.visits || []).forEach((v) => {
        Object.keys(v).forEach((k) => allVisitKeys.add(k));
      });
    });

    // 🔹 Flatten: each visit becomes a row
    const formatted = [];
    reports.forEach((r) => {
      (r.visits || []).forEach((v) => {
        const row = {
          id: r._id,
          customerId: r.customerId,
          customerType: r.customerType,
          name: r.name,
          mobile: r.mobile,
          company: r.company,
          designation: r.designation,
          createdBy: r.createdBy?.empCode || r.createdBy?.name || "NA",
          customerCreatedAt: r.createdAt,
          visitDate: v.date || v.createdAt || r.createdAt,
        };

        // Merge visit fields (exclude internal fields)
        [...allVisitKeys].forEach((key) => {
          if (!["_id", "createdAt", "updatedAt", "__v"].includes(key)) {
            row[key] = v[key] ?? "";
          }
        });

        formatted.push(row);
      });
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching reports",
      error: err.message,
    });
  }
};

/* ---------- Helper: Get reportees ---------- */
async function getReportees(currentUser) {
  if (!currentUser) return [];
  const { role, empCode } = currentUser;

  console.log("🔍 getReportees called for:", { role, empCode });

  let reportees = [];
  
  switch (role) {
    case "Manager":
    case "BranchManager":
    case "RegionalManager":
      // Find users who report to this manager - same query as /reportees/:empCode endpoint
      const users = await User.find({ "reportTo.empCode": empCode }).lean();
      reportees = users.map(u => u.empCode);
      console.log("🔍 Found users by reportTo:", users.map(u => ({ empCode: u.empCode, name: u.name })));
      
      // Also try searching by managerEmpCode field (legacy support)
      if (!reportees.length) {
        const legacyUsers = await User.find({ managerEmpCode: empCode }).lean();
        reportees = legacyUsers.map(u => u.empCode);
        console.log("🔍 Found users by managerEmpCode:", legacyUsers.map(u => ({ empCode: u.empCode, name: u.name })));
      }
      break;
    case "Admin":
      reportees = await User.find().distinct("empCode");
      break;
    default:
      reportees = [];
  }

  console.log("🔍 Final reportee empCodes:", reportees);
  return reportees;
}

/* ---------- Hierarchy Reports ---------- */
export const getHierarchyReports = async (req, res) => {
  try {
    const { from, to, empCode } = req.query;
    const match = {};
    if (empCode) {
      match["createdBy.empCode"] = empCode.toString();
    } else {
      const reportees = await getReportees(req.user);
      match["createdBy.empCode"] = { $in: reportees.map((c) => c.toString()) };
    }

    const customers = await Customer.find(match);
    const reports = [];

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        const d = new Date(v.date);
        
        // Date filtering with proper end-of-day handling
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);
        
        if ((fromDate && d < fromDate) || (toDate && d > toDate)) return;
        reports.push({
          customerId: c.customerId,
          empCode: c.createdBy.empCode,
          customer: c.name,
          mobile: c.mobile,
          company: c.company,
          designation: c.designation,
          customerType: c.customerType,
          discussion: v.discussion || v.remark || "-", // ✅ discussion fallback
          opportunityType: v.opportunityType,
          orderStatus: v.orderStatus,
          orderValue: v.orderValue || 0,
          lossReason: v.lossReason,
          nextMeeting: v.nextMeetingDate,
          expectedOrderDate: v.expectedOrderDate,
          attendees: v.attendees,
          purpose: v.purpose,
          date: v.date,
          meetingType: v.meetingType,
        });
      });
    });

    reports.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(reports);
  } catch (err) {
    console.error("Hierarchy Reports Error:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

/* ---------- Reports Summary (Employee-wise) ---------- */
export const getReportsSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    let allowedEmpCodes = [];

    if (req.user.role === "Admin") {
      allowedEmpCodes = await User.find().distinct("empCode");
    } else {
      allowedEmpCodes = await getReportees(req.user);
    }

    if (!allowedEmpCodes?.length) return res.json({ summary: [] });

    const customers = await Customer.find({
      "createdBy.empCode": { $in: allowedEmpCodes },
    }).lean();

    const summaryMap = {};
    for (const c of customers) {
      const empCode = c.createdBy?.empCode;
      if (!empCode) continue;

      if (!summaryMap[empCode]) {
        let empName = "Unknown";
        const userDoc = await User.findOne({ empCode }).lean();
        if (userDoc) empName = userDoc.name;

        summaryMap[empCode] = {
          empCode,
          empName,
          externalCount: 0,
          internalCount: 0,
          retailer: 0,
          distributor: 0,
          architect: 0,
          electrician: 0,
          endUser: 0,
        };
      }

      (c.visits || []).forEach((v) => {
        const d = new Date(v.date);
        
        // Date filtering with proper end-of-day handling
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);
        
        if ((fromDate && d < fromDate) || (toDate && d > toDate)) return;

        if (v.meetingType === "External") summaryMap[empCode].externalCount++;
        if (v.meetingType === "Internal") summaryMap[empCode].internalCount++;

        const ct = (c.customerType || "").toLowerCase();
        if (ct.includes("retail")) summaryMap[empCode].retailer++;
        else if (ct.includes("distributor")) summaryMap[empCode].distributor++;
        else if (ct.includes("arch")) summaryMap[empCode].architect++;
        else if (ct.includes("electrician")) summaryMap[empCode].electrician++;
        else if (
          ct.includes("end user") ||
          ct.includes("builder") ||
          ct.includes("developer")
        )
          summaryMap[empCode].endUser++;
      });
    }

    const summary = Object.values(summaryMap);
    res.json({ summary });
  } catch (err) {
    console.error("Reports Summary Error:", err);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
};

/* -------- Upcoming Orders -------- */
export const getUpcomingOrders = async (req, res) => {
  try {
    const { empCode, from, to, scope = "month" } = req.query;
    if (!empCode)
      return res.status(400).json({ message: "empCode is required" });

    let rangeStart, rangeEnd;
    if (from && to) {
      rangeStart = new Date(from);
      rangeEnd = new Date(to);
    } else if (scope === "week") {
      rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    } else {
      rangeStart = startOfMonth(new Date());
      rangeEnd = endOfMonth(new Date());
    }

    const customers = await Customer.find({
      "createdBy.empCode": empCode,
    }).lean();

    const upcoming = [];
    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        if (
          v.expectedOrderDate &&
          v.expectedOrderDate >= rangeStart &&
          v.expectedOrderDate <= rangeEnd
        ) {
          upcoming.push({
            customerId: c.customerId,
            empCode: c.createdBy.empCode,
            name: c.name,
            mobile:
              c.customerMobile ||
              c.mobile ||
              v.customerMobile ||
              "NA", // ✅ consistent mobile
            company: c.company,
            designation: c.designation,
            customerType: c.customerType,
            discussion: v.discussion || v.remark || "-", // ✅ discussion fallback
            opportunityType: v.opportunityType,
            orderStatus: v.orderStatus,
            orderValue: v.orderValue,
            expectedOrderDate: v.expectedOrderDate,
            date: v.date,
          });
        }
      });
    });

    upcoming.sort(
      (a, b) => new Date(a.expectedOrderDate) - new Date(b.expectedOrderDate)
    );
    res.json(upcoming);
  } catch (err) {
    console.error("Upcoming Orders Error:", err);
    res.status(500).json({ message: "Failed to fetch upcoming orders" });
  }
};

/* ---------- Submitted Reports + Summary (Fixed: Mobile + Discussion) ---------- */
export const getSubmittedReports = async (req, res) => {
  try {
    const { from, to, empCode } = req.query;

    let allowedEmpCodes = [];
    if (empCode) {
      allowedEmpCodes = [String(empCode)];
    } else if (req.user.role === "Admin") {
      allowedEmpCodes = await User.find().distinct("empCode");
      allowedEmpCodes = allowedEmpCodes.map(e => String(e));
    } else {
      allowedEmpCodes = await getReportees(req.user);
      allowedEmpCodes = allowedEmpCodes.map(e => String(e));
    }

    console.log("🔍 User role:", req.user.role);
    console.log("🔍 User empCode:", req.user.empCode);
    console.log("🔍 Allowed reportee empCodes:", allowedEmpCodes);

    if (!allowedEmpCodes?.length)
      return res.json({ summary: {}, reports: [] });

    // ✅ Same comprehensive $or query as myReports endpoint
    const customers = await Customer.find({
      $or: [
        { empCode: { $in: allowedEmpCodes } },
        { "createdBy.empCode": { $in: allowedEmpCodes } },
        { "visits.empCode": { $in: allowedEmpCodes } },
        { "visits.createdBy": { $in: allowedEmpCodes } },
      ]
    }).lean();

    console.log("🔍 Found customers:", customers.length);

    let externalCount = 0,
      internalCount = 0;
    const typeCounts = {
      Retailer: 0,
      Distributor: 0,
      Architect: 0,
      Electrician: 0,
      EndUser: 0,
    };

    const reports = [];

    customers.forEach((c) => {
      (c.visits || []).forEach((v) => {
        // ✅ Check if this visit belongs to allowed employees (same logic as myReports)
        const vEmp = v.empCode;
        let visitEmpCode = null;
        let isMatch = false;

        // Check visit-level empCode
        if (typeof vEmp === "string" && allowedEmpCodes.includes(vEmp)) {
          isMatch = true;
          visitEmpCode = vEmp;
        } else if (Array.isArray(vEmp) && vEmp.some(e => allowedEmpCodes.includes(String(e)))) {
          isMatch = true;
          visitEmpCode = vEmp.find(e => allowedEmpCodes.includes(String(e)));
        } else if (v.createdBy && allowedEmpCodes.includes(String(v.createdBy))) {
          isMatch = true;
          visitEmpCode = v.createdBy;
        } else if (v.createdBy?.empCode && allowedEmpCodes.includes(String(v.createdBy.empCode))) {
          isMatch = true;
          visitEmpCode = v.createdBy.empCode;
        } else if (c.createdBy?.empCode && allowedEmpCodes.includes(String(c.createdBy.empCode))) {
          isMatch = true;
          visitEmpCode = c.createdBy.empCode;
        }

        if (!isMatch) return;

        const d = new Date(v.date);
        
        // Date filtering with proper end-of-day handling
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);
        
        if ((fromDate && d < fromDate) || (toDate && d > toDate)) return;

        if (v.meetingType === "External") externalCount++;
        if (v.meetingType === "Internal") internalCount++;

        const ct = (c.customerType || "").toLowerCase();
        if (ct.includes("retail")) typeCounts.Retailer++;
        else if (ct.includes("distributor")) typeCounts.Distributor++;
        else if (ct.includes("arch")) typeCounts.Architect++;
        else if (ct.includes("electrician")) typeCounts.Electrician++;
        else if (
          ct.includes("end user") ||
          ct.includes("builder") ||
          ct.includes("developer")
        )
          typeCounts.EndUser++;

        reports.push({
          customerId: c.customerId || "-",
          customerName: c.name || "-",
          name: c.name || "-",
          customerMobile:
            v.customerMobile ||
            c.customerMobile ||
            c.mobile ||
            "NA",
          mobile: v.customerMobile || c.customerMobile || c.mobile || "NA",
          customerType: c.customerType || "-",
          empCode: visitEmpCode || "-",
          empName: c.createdBy?.name || "-",
          company: c.company || "-",
          designation: c.designation || "-",
          meetingType: v.meetingType || "-",
          discussion: v.discussion || v.remark || "-",
          opportunityType: v.opportunityType || "-",
          orderStatus: v.orderStatus || "-",
          orderValue: v.orderValue || 0,
          orderLossReason: v.orderLossReason || "-",
          distributorName: v.distributorName || "-",
          distributorCode: v.distributorCode || "-",
          poNumber: v.poNumber || "-",
          poFileUrl: v.poFileUrl || "-",
          nextMeeting: v.nextMeetingDate || "-",
          nextMeetingDate: v.nextMeetingDate || "-",
          expectedOrderDate: v.expectedOrderDate || "-",
          attendees: v.attendees || "-",
          purpose: v.purpose || "-",
          date: v.date || c.createdAt,
          reportedBy: v.reportedBy || "-",
        });
      });
    });

    console.log("🔍 Final reports count:", reports.length);

    reports.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
      summary: { externalCount, internalCount, typeCounts },
      reports,
    });
  } catch (err) {
    console.error("Submitted Reports Error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch submitted reports" });
  }
};

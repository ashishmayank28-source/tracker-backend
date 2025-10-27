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

  switch (role) {
    case "Manager":
    case "BranchManager":
    case "RegionalManager":
      return await User.find({ "reportTo.empCode": empCode }).distinct("empCode");
    case "Admin":
      return await User.find().distinct("empCode");
    default:
      return [];
  }
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
        if ((from && d < new Date(from)) || (to && d > new Date(to))) return;
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
        if ((from && d < new Date(from)) || (to && d > new Date(to))) return;

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
      allowedEmpCodes = [empCode];
    } else if (req.user.role === "Admin") {
      allowedEmpCodes = await User.find().distinct("empCode");
    } else {
      allowedEmpCodes = await getReportees(req.user);
    }

    if (!allowedEmpCodes?.length)
      return res.json({ summary: {}, reports: [] });

    const customers = await Customer.find({
      "createdBy.empCode": { $in: allowedEmpCodes },
    }).lean();

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
        if (!v.submitted) return;
        const d = new Date(v.date);
        if ((from && d < new Date(from)) || (to && d > new Date(to))) return;

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
          customerMobile:
            v.customerMobile ||
            c.customerMobile ||
            c.mobile ||
            (c.visits?.[0]?.customerMobile ?? "NA"), // ✅ fixed mobile
          customerType: c.customerType || "-",
          empCode: c.createdBy?.empCode || "-",
          empName: c.createdBy?.name || "-",
          company: c.company || "-",
          designation: c.designation || "-",
          meetingType: v.meetingType || "-",
          discussion: v.discussion || v.remark || "-", // ✅ fixed revisit discussion
          opportunityType: v.opportunityType || "-",
          orderStatus: v.orderStatus || "-",
          orderValue: v.orderValue || 0,
          distributorName: v.distributorName || "-",
          distributorCode: v.distributorCode || "-",
          poNumber: v.poNumber || "-",
          poFileUrl: v.poFileUrl || "-",
          nextMeeting: v.nextMeetingDate || "-",
          expectedOrderDate: v.expectedOrderDate || "-",
          attendees: v.attendees || "-",
          purpose: v.purpose || "-",
          date: v.date || c.createdAt,
          reportedBy: v.reportedBy || "-",
        });
      });
    });

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

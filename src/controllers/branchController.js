import User from "../models/userModel.js";
import Customer from "../models/customerModel.js";

// 🔹 Get direct reportees of Branch Manager
export const getBranchReportees = async (req, res) => {
  try {
    const { empCode } = req.params;

    // BM ke under sabhi users (direct reportees)
    const reportees = await User.find({ "reportTo.empCode": empCode })
      .select("empCode name designation region branch role")
      .lean();

    res.json(reportees);
  } catch (err) {
    console.error("getBranchReportees error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Get team activity summary for a branch
export const getBranchSummary = async (req, res) => {
  try {
    const { empCode } = req.params;
    const { from, to, customerType } = req.query;

    // BM ke under sabhi employees
    const team = await User.find({ "reportTo.empCode": empCode })
      .select("empCode name")
      .lean();
    const empCodes = team.map((t) => t.empCode);

    if (empCodes.length === 0) return res.json([]);

    // Customer reports
    let customers = await Customer.find({
      "visits.createdBy": { $in: empCodes },
    }).lean();

    let reports = [];
    customers.forEach((c) => {
      c.visits.forEach((v) => {
        if (empCodes.includes(v.createdBy)) {
          reports.push({
            customerId: c.customerId,
            empCode: v.createdBy,
            empName: team.find((t) => t.empCode === v.createdBy)?.name || "-",
            name: c.name,
            mobile: c.mobile,
            company: c.company,
            designation: c.designation,
            customerType: c.customerType,
            discussion: v.discussion,
            opportunityType: v.opportunityType,
            orderStatus: v.orderStatus,
            orderValue: v.orderValue,
            orderLossReason: v.orderLossReason,
            nextMeetingDate: v.nextMeetingDate,
            expectedOrderDate: v.expectedOrderDate,
            attendees: v.attendees,
            purpose: v.purpose,
            date: v.date,
          });
        }
      });
    });

    // 🔹 Apply filters
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      reports = reports.filter(
        (r) => new Date(r.date) >= fromDate && new Date(r.date) <= toDate
      );
    }
    if (customerType) {
      reports = reports.filter((r) => r.customerType === customerType);
    }

    res.json(reports);
  } catch (err) {
    console.error("getBranchSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

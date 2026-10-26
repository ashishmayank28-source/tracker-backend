import User from "../models/userModel.js";
import Customer from "../models/customerModel.js";
import Revenue from "../models/revenueModel.js";
import TourApproval from "../models/tourApprovalModel.js";
import Holiday from "../models/holidayModel.js";
import { getScopedUsers } from "../utils/scopeUtils.js";
import {
  VISIT_TYPES,
  classifyVisitType,
  getVisitEmpCode,
  historyKey,
  isQualifyingSiteVisit,
  isSyntheticCustomerId,
  normalizeCustomerId,
} from "../utils/visitClassification.js";
import {
  attendanceStatus,
  eachDateKey,
  emptyAttendanceCounts,
  localDateKey,
} from "../utils/attendanceStatus.js";

const APPROVED_TOUR_STATUSES = ["Approved", "ExpenseSubmitted", "Verified", "Completed"];

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toLocaleDateString("en-CA"),
    to: to.toLocaleDateString("en-CA"),
  };
}

function parseRange(query = {}) {
  const fallback = defaultRange();
  const from = query.from || fallback.from;
  const to = query.to || fallback.to;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return fallback;
  }
  return { from, to };
}

function inRange(dateKey, from, to) {
  return Boolean(dateKey) && dateKey >= from && dateKey <= to;
}

function widerWindow(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 2);
  const end = new Date(`${to}T23:59:59.999Z`);
  end.setUTCDate(end.getUTCDate() + 2);
  return { start, end };
}

function managerNameOf(user) {
  return user?.reportTo?.[0]?.name || user?.managerName || "-";
}

function managerCodeOf(user) {
  return user?.reportTo?.[0]?.empCode || user?.managerEmpCode || "";
}

function reportsToManager(user, managerCode) {
  if (!managerCode) return true;
  if (user?.managerEmpCode === managerCode) return true;
  return (user?.reportTo || []).some((row) => row?.empCode === managerCode);
}

async function getVisibleEmployees(reqUser, query = {}) {
  const role = reqUser?.role;
  let users;
  if (role === "Admin" || role === "Guest") {
    users = await User.find({ isActive: { $ne: false } })
      .select("empCode name role region branch managerEmpCode reportTo target")
      .lean();
  } else {
    users = await getScopedUsers(reqUser, { isActive: { $ne: false } });
  }

  const employees = (users || []).filter((user) => user.role === "Employee");
  const { region, branch, managerCode, empCode } = query;

  return employees.filter((user) => {
    if (region && region !== "all" && user.region !== region) return false;
    if (branch && branch !== "all" && user.branch !== branch) return false;
    if (managerCode && managerCode !== "all" && !reportsToManager(user, managerCode)) return false;
    if (empCode && empCode !== "all" && user.empCode !== empCode) return false;
    return true;
  });
}

async function loadHolidays(from, to) {
  const { start, end } = widerWindow(from, to);
  const holidays = await Holiday.find({ date: { $gte: start, $lte: end } }).lean();
  const map = {};
  holidays.forEach((holiday) => {
    const key = localDateKey(holiday.date);
    if (key) map[key] = holiday.name || "Holiday";
  });
  return map;
}

function flattenVisits(customers, allowedEmpCodes) {
  const allowed = new Set(allowedEmpCodes);
  const rows = [];
  customers.forEach((customer) => {
    (customer.visits || []).forEach((visit) => {
      const empCode = getVisitEmpCode(visit, customer);
      if (!empCode || !allowed.has(empCode)) return;
      rows.push({
        visitId: visit._id,
        empCode,
        customerId: customer.customerId,
        customerName: customer.name || "-",
        date: visit.date || visit.visitDate || visit.createdAt,
        dateKey: localDateKey(visit.date || visit.visitDate || visit.createdAt),
        meetingType: visit.meetingType || "",
        orderStatus: visit.orderStatus || "",
        orderValue: Number(visit.orderValue) || 0,
        submitted: Boolean(visit.submitted),
        approved: Boolean(visit.approved),
        rejected: Boolean(visit.rejected),
        discussion: visit.discussion || "",
      });
    });
  });
  return rows;
}

function classifyRows(rows) {
  const historyByKey = new Map();
  rows.forEach((row) => {
    if (isSyntheticCustomerId(row.customerId) || !isQualifyingSiteVisit(row.meetingType)) return;
    const key = historyKey(row.empCode, row.customerId);
    if (!historyByKey.has(key)) historyByKey.set(key, []);
    historyByKey.get(key).push(row);
  });

  return rows.map((row) => ({
    ...row,
    visitType: classifyVisitType(row, historyByKey.get(historyKey(row.empCode, row.customerId)) || []),
  }));
}

function emptyEmpMetrics(emp) {
  return {
    empCode: emp.empCode,
    empName: emp.name,
    region: emp.region || "-",
    branch: emp.branch || "-",
    managerCode: managerCodeOf(emp) || "-",
    managerName: managerNameOf(emp),
    attendance: emptyAttendanceCounts(),
    attendanceLabel: "Unknown",
    tourDays: 0,
    tourRequests: 0,
    tourApproved: 0,
    siteVisits: 0,
    newVisits: 0,
    revisits: 0,
    unknownVisits: 0,
    uniqueCustomers: 0,
    convertedCustomers: 0,
    tourExpenses: 0,
    totalRevenue: 0,
  };
}

function buildAttendance(empCodes, dateKeys, holidayMap, visitRows) {
  const byEmpDate = {};
  empCodes.forEach((code) => {
    byEmpDate[code] = {};
  });

  visitRows.forEach((row) => {
    if (!row.dateKey || !byEmpDate[row.empCode]) return;
    if (!byEmpDate[row.empCode][row.dateKey]) {
      byEmpDate[row.empCode][row.dateKey] = { external: 0, internal: 0, leave: 0 };
    }
    const bucket = byEmpDate[row.empCode][row.dateKey];
    if (row.meetingType === "External" || row.meetingType === "Revisit") bucket.external += 1;
    if (row.meetingType === "Internal") bucket.internal += 1;
    if (row.meetingType === "Leave") bucket.leave += 1;
  });

  const result = {};
  empCodes.forEach((code) => {
    const counts = emptyAttendanceCounts();
    const calendar = [];
    dateKeys.forEach((dateKey) => {
      const status = attendanceStatus({
        dateKey,
        holiday: holidayMap[dateKey],
        counts: byEmpDate[code][dateKey],
      });
      counts[status] += 1;
      calendar.push({ date: dateKey, status, holidayName: holidayMap[dateKey] || null });
    });
    result[code] = { counts, calendar };
  });
  return result;
}

function attendanceLabel(counts) {
  if (!counts) return "Unknown";
  return `P ${counts.P} · HD ${counts.HD} · A ${counts.A} · L ${counts.L}`;
}

export const getPerformanceFilters = async (req, res) => {
  try {
    const employees = await getVisibleEmployees(req.user, {});
    const regions = [...new Set(employees.map((e) => e.region).filter(Boolean))].sort();
    const branches = [...new Set(employees.map((e) => e.branch).filter(Boolean))].sort();
    const managerMap = new Map();
    employees.forEach((emp) => {
      const code = managerCodeOf(emp);
      const name = managerNameOf(emp);
      if (code && code !== "-") managerMap.set(code, name || code);
    });
    const managers = [...managerMap.entries()]
      .map(([empCode, name]) => ({ empCode, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const people = employees
      .map((emp) => ({
        empCode: emp.empCode,
        name: emp.name,
        region: emp.region || "-",
        branch: emp.branch || "-",
        managerCode: managerCodeOf(emp) || "-",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ regions, branches, managers, employees: people });
  } catch (err) {
    console.error("Performance filters error:", err);
    res.status(500).json({ message: "Failed to load performance filters" });
  }
};

export const getPerformanceOverview = async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
    const sortBy = req.query.sortBy || "empName";
    const sortDir = req.query.sortDir === "desc" ? -1 : 1;

    const employees = await getVisibleEmployees(req.user, req.query);
    if (!employees.length) {
      return res.json({
        from,
        to,
        kpis: {
          totalEmployees: 0,
          presentDays: 0,
          absentDays: 0,
          employeesOnApprovedTour: 0,
          attendanceDays: 0,
          tourDays: 0,
          siteVisits: 0,
          newVisits: 0,
          revisits: 0,
          uniqueCustomers: 0,
          convertedCustomers: 0,
          conversionRate: 0,
          tourExpenses: 0,
          totalRevenue: 0,
        },
        rows: [],
        page,
        limit,
        total: 0,
      });
    }

    const empCodes = employees.map((e) => e.empCode);
    const dateKeys = eachDateKey(from, to);
    const { start, end } = widerWindow(from, to);

    const [customers, revenues, tours, holidayMap] = await Promise.all([
      Customer.find(
        {
          $or: [
            { "visits.empCode": { $in: empCodes } },
            { "visits.createdBy": { $in: empCodes } },
            { "createdBy.empCode": { $in: empCodes } },
          ],
        },
        { customerId: 1, name: 1, visits: 1, createdBy: 1 }
      ).lean(),
      Revenue.find({
        empCode: { $in: empCodes },
        date: { $gte: start, $lte: end },
      }).lean(),
      TourApproval.find({
        empCode: { $in: empCodes },
        $or: [
          { requestDate: { $gte: start, $lte: end } },
          { createdAt: { $gte: start, $lte: end } },
        ],
      }).lean(),
      loadHolidays(from, to),
    ]);

    const classified = classifyRows(flattenVisits(customers, empCodes));
    const attendance = buildAttendance(empCodes, dateKeys, holidayMap, classified);
    const metrics = Object.fromEntries(employees.map((emp) => [emp.empCode, emptyEmpMetrics(emp)]));

    classified.forEach((row) => {
      if (!inRange(row.dateKey, from, to) || !metrics[row.empCode]) return;
      if (!isQualifyingSiteVisit(row.meetingType) || isSyntheticCustomerId(row.customerId)) return;
      const item = metrics[row.empCode];
      item.siteVisits += 1;
      if (row.visitType === VISIT_TYPES.NEW) item.newVisits += 1;
      else if (row.visitType === VISIT_TYPES.REVISIT) item.revisits += 1;
      else item.unknownVisits += 1;
    });

    const uniqueByEmp = {};
    const uniqueGlobal = new Set();
    classified.forEach((row) => {
      if (!inRange(row.dateKey, from, to) || !metrics[row.empCode]) return;
      if (!isQualifyingSiteVisit(row.meetingType) || isSyntheticCustomerId(row.customerId)) return;
      const key = normalizeCustomerId(row.customerId).toUpperCase();
      if (!uniqueByEmp[row.empCode]) uniqueByEmp[row.empCode] = new Set();
      uniqueByEmp[row.empCode].add(key);
      uniqueGlobal.add(key);
    });
    Object.entries(uniqueByEmp).forEach(([empCode, set]) => {
      metrics[empCode].uniqueCustomers = set.size;
    });

    const convertedByEmp = {};
    const convertedGlobal = new Set();
    const revenueByEmp = {};
    revenues.forEach((rev) => {
      const dateKey = localDateKey(rev.date || rev.createdAt);
      if (!inRange(dateKey, from, to) || !metrics[rev.empCode]) return;
      const amount = Number(rev.orderValue) || 0;
      revenueByEmp[rev.empCode] = (revenueByEmp[rev.empCode] || 0) + amount;
      const customerId = normalizeCustomerId(rev.customerId);
      if (amount > 0 && customerId && !isSyntheticCustomerId(customerId)) {
        if (!convertedByEmp[rev.empCode]) convertedByEmp[rev.empCode] = new Set();
        convertedByEmp[rev.empCode].add(customerId.toUpperCase());
        convertedGlobal.add(customerId.toUpperCase());
      }
    });
    Object.entries(revenueByEmp).forEach(([empCode, total]) => {
      metrics[empCode].totalRevenue = total;
    });
    Object.entries(convertedByEmp).forEach(([empCode, set]) => {
      metrics[empCode].convertedCustomers = set.size;
    });

    const tourEmps = new Set();
    tours.forEach((tour) => {
      const dateKey = localDateKey(tour.requestDate || tour.createdAt);
      if (!inRange(dateKey, from, to) || !metrics[tour.empCode]) return;
      const item = metrics[tour.empCode];
      item.tourRequests += 1;
      if (APPROVED_TOUR_STATUSES.includes(tour.status)) {
        item.tourApproved += 1;
        item.tourDays += 1;
        tourEmps.add(tour.empCode);
      }
      if (tour.expensesFilled) {
        item.tourExpenses += Number(tour.totalExpense) || 0;
      }
    });

    Object.entries(attendance).forEach(([empCode, data]) => {
      if (!metrics[empCode]) return;
      metrics[empCode].attendance = data.counts;
      metrics[empCode].attendanceLabel = attendanceLabel(data.counts);
    });

    let rows = Object.values(metrics);
    rows.sort((a, b) => {
      const left = a[sortBy] ?? a.empName ?? "";
      const right = b[sortBy] ?? b.empName ?? "";
      if (typeof left === "number" && typeof right === "number") return (left - right) * sortDir;
      return String(left).localeCompare(String(right)) * sortDir;
    });

    const kpis = rows.reduce(
      (acc, row) => {
        acc.presentDays += (row.attendance.P || 0) + (row.attendance.HD || 0);
        acc.absentDays += row.attendance.A || 0;
        acc.attendanceDays += (row.attendance.P || 0) + (row.attendance.HD || 0);
        acc.tourDays += row.tourDays;
        acc.siteVisits += row.siteVisits;
        acc.newVisits += row.newVisits;
        acc.revisits += row.revisits;
        acc.tourExpenses += row.tourExpenses;
        acc.totalRevenue += row.totalRevenue;
        return acc;
      },
      {
        totalEmployees: rows.length,
        presentDays: 0,
        absentDays: 0,
        employeesOnApprovedTour: tourEmps.size,
        attendanceDays: 0,
        tourDays: 0,
        siteVisits: 0,
        newVisits: 0,
        revisits: 0,
        uniqueCustomers: 0,
        convertedCustomers: 0,
        conversionRate: 0,
        tourExpenses: 0,
        totalRevenue: 0,
      }
    );
    kpis.uniqueCustomers = uniqueGlobal.size;
    kpis.convertedCustomers = convertedGlobal.size;
    kpis.conversionRate =
      kpis.uniqueCustomers > 0
        ? Number(((kpis.convertedCustomers / kpis.uniqueCustomers) * 100).toFixed(1))
        : 0;

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    res.json({
      from,
      to,
      kpis,
      rows: paged,
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error("Performance overview error:", err);
    res.status(500).json({ message: "Failed to load performance overview" });
  }
};

export const getEmployeePerformance = async (req, res) => {
  try {
    const empCode = req.params.empCode;
    const { from, to } = parseRange(req.query);
    const employees = await getVisibleEmployees(req.user, { empCode });
    const emp = employees[0] || (await User.findOne({ empCode }).select("-passwordHash").lean());
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const role = req.user?.role;
    if (role !== "Admin" && role !== "Guest") {
      if (!employees.length) return res.status(403).json({ message: "Not authorized" });
    }

    const dateKeys = eachDateKey(from, to);
    const { start, end } = widerWindow(from, to);

    const [customers, revenues, tours, holidayMap] = await Promise.all([
      Customer.find(
        {
          $or: [
            { empCode },
            { "createdBy.empCode": empCode },
            { "visits.empCode": empCode },
            { "visits.empCode": { $in: [empCode] } },
            { "visits.createdBy": empCode },
            { "visits.createdBy.empCode": empCode },
          ],
        },
        { customerId: 1, name: 1, visits: 1, createdBy: 1 }
      ).lean(),
      Revenue.find({ empCode, date: { $gte: start, $lte: end } }).lean(),
      TourApproval.find({ empCode }).lean(),
      loadHolidays(from, to),
    ]);

    const classified = classifyRows(flattenVisits(customers, [empCode]));
    const attendance = buildAttendance([empCode], dateKeys, holidayMap, classified)[empCode];

    const visits = classified
      .filter((row) => inRange(row.dateKey, from, to) && isQualifyingSiteVisit(row.meetingType))
      .sort((a, b) => String(b.dateKey).localeCompare(String(a.dateKey)))
      .map((row) => ({
        date: row.dateKey,
        customerId: isSyntheticCustomerId(row.customerId) ? "Unknown" : row.customerId,
        customerName: row.customerName || "-",
        visitType: row.visitType,
        meetingType: row.meetingType || "-",
        status: row.rejected ? "Rejected" : row.approved ? "Approved" : row.submitted ? "Submitted" : "Unknown",
        discussion: row.discussion || "",
      }));

    const uniqueCustomers = new Set(
      visits
        .filter((row) => row.customerId && row.customerId !== "Unknown")
        .map((row) => row.customerId.toUpperCase())
    );

    const conversions = [];
    let totalRevenue = 0;
    const revenueEntries = revenues
      .filter((rev) => inRange(localDateKey(rev.date || rev.createdAt), from, to))
      .map((rev) => {
        const amount = Number(rev.orderValue) || 0;
        totalRevenue += amount;
        const customerId = normalizeCustomerId(rev.customerId);
        if (amount > 0 && customerId && !isSyntheticCustomerId(customerId)) {
          conversions.push({
            date: localDateKey(rev.date || rev.createdAt),
            customerId,
            customerName: rev.customerName || "-",
            orderValue: amount,
            poNumber: rev.poNumber || "-",
          });
        }
        return {
          date: localDateKey(rev.date || rev.createdAt),
          customerId: customerId || "Unknown",
          customerName: rev.customerName || "-",
          orderValue: amount,
          poNumber: rev.poNumber || "-",
          itemName: rev.itemName || "-",
        };
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const tourDetails = tours
      .filter((tour) => inRange(localDateKey(tour.requestDate || tour.createdAt), from, to))
      .map((tour) => ({
        id: tour._id,
        toLocation: tour.toLocation || "-",
        purpose: tour.purpose || "-",
        status: tour.status || "Unknown",
        requestDate: localDateKey(tour.requestDate || tour.createdAt),
        approvedDate: tour.approvedDate ? localDateKey(tour.approvedDate) : null,
        approvedBy: tour.approvedBy || null,
        expensesFilled: Boolean(tour.expensesFilled),
        submittedAmount: Number(tour.totalExpense) || 0,
        travelExpense: Number(tour.travelExpense) || 0,
        foodExpense: Number(tour.foodExpense) || 0,
        accommodationExpense: Number(tour.accommodationExpense) || 0,
        reimbursed: Boolean(tour.reimbursed),
        reimbursedBy: tour.reimbursedBy || null,
        reimbursedDate: tour.reimbursedDate ? localDateKey(tour.reimbursedDate) : null,
      }))
      .sort((a, b) => String(b.requestDate).localeCompare(String(a.requestDate)));

    res.json({
      from,
      to,
      profile: {
        empCode: emp.empCode,
        name: emp.name,
        region: emp.region || "-",
        branch: emp.branch || "-",
        managerCode: managerCodeOf(emp) || "-",
        managerName: managerNameOf(emp),
      },
      attendance: {
        summary: attendance?.counts || emptyAttendanceCounts(),
        calendar: attendance?.calendar || [],
      },
      tours: tourDetails,
      visits,
      conversions,
      revenue: {
        total: totalRevenue,
        entries: revenueEntries,
      },
      totals: {
        siteVisits: visits.length,
        newVisits: visits.filter((v) => v.visitType === VISIT_TYPES.NEW).length,
        revisits: visits.filter((v) => v.visitType === VISIT_TYPES.REVISIT).length,
        uniqueCustomers: uniqueCustomers.size,
        convertedCustomers: new Set(conversions.map((c) => c.customerId.toUpperCase())).size,
        tourExpenses: tourDetails.reduce((sum, tour) => sum + (tour.submittedAmount || 0), 0),
        totalRevenue,
      },
    });
  } catch (err) {
    console.error("Employee performance error:", err);
    res.status(500).json({ message: "Failed to load employee performance" });
  }
};

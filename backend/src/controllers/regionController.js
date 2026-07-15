import { getScopedUsers } from "../utils/scopeUtils.js";

// ✅ Get all users under a regional manager (scoped by region)
export async function getRegionTeam(req, res) {
  try {
    if (req.user?.role !== "RegionalManager") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const users = await getScopedUsers(req.user);

    const branchManagers = users.filter((u) => u.role === "BranchManager");
    const managers = users.filter((u) => u.role === "Manager");
    const employees = users.filter((u) => u.role === "Employee");

    res.json({
      branchManagers,
      managers,
      employees,
    });
  } catch (e) {
    console.error("getRegionTeam error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
}

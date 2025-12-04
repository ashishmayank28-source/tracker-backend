import User from "../models/userModel.js";

// ✅ Get all users under a regional manager
export async function getRegionTeam(req, res) {
  try {
    const rmEmpCode = req.user?.empCode; // logged in RM
    if (!rmEmpCode) {
      return res.status(400).json({ message: "No Regional Manager empCode" });
    }

    // 🟢 Sabhi users jinka regionalManagerEmpCode = current RM
    const users = await User.find({ regionalManagerEmpCode: rmEmpCode }).lean();

    // group by role
    const branchManagers = users.filter(u => u.role === "BranchManager");
    const managers       = users.filter(u => u.role === "Manager");
    const employees      = users.filter(u => u.role === "Employee");

    res.json({
      branchManagers,
      managers,
      employees
    });
  } catch (e) {
    console.error("getRegionTeam error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
}

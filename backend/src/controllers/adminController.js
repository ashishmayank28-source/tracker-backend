import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

/* ---------- Get All Users ---------- */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* ---------- Create User ---------- */
export const createUser = async (req, res) => {
  try {
    const {
      empCode: rawEmpCode,
      name,
      role,
      password,
      area,
      branch,
      region,
      managerEmpCode,
      branchManagerEmpCode,
      regionalManagerEmpCode,
      allowedTiles, // ✅ For Guest users
    } = req.body;

    // ✅ Normalize empCode to uppercase (same as login)
    const empCode = String(rawEmpCode || "").trim().toUpperCase();

    const existing = await User.findOne({ empCode });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      empCode,
      name,
      role,
      passwordHash,
      plainPassword: password, // ⚠️ For admin reference
      area,
      branch,
      region,
      reportTo: [],
      allowedTiles: role === "Guest" ? (allowedTiles || []) : [], // ✅ Save tiles for Guest
    });

    const managers = [];
    for (const code of [
      managerEmpCode,
      branchManagerEmpCode,
      regionalManagerEmpCode,
    ]) {
      if (code) {
        const manager = await User.findOne({ empCode: code });
        if (manager) {
          managers.push({ empCode: manager.empCode, name: manager.name });
        }
      }
    }
    if (managers.length > 0) user.reportTo = managers;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
};

/* ---------- Update Active / Resigned status ---------- */
export const updateUserStatus = async (req, res) => {
  try {
    const { empCode } = req.params;
    const { status } = req.body;
    const nextStatus = String(status || "").trim();

    if (!["Active", "Resigned"].includes(nextStatus)) {
      return res.status(400).json({ message: "Status must be Active or Resigned" });
    }

    if (req.user?.empCode && String(req.user.empCode).toUpperCase() === String(empCode).toUpperCase() && nextStatus === "Resigned") {
      return res.status(400).json({ message: "You cannot mark your own account as Resigned" });
    }

    const user = await User.findOne({ empCode });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "Admin" && nextStatus === "Resigned") {
      const otherAdmins = await User.countDocuments({
        role: "Admin",
        isActive: { $ne: false },
        empCode: { $ne: user.empCode },
      });
      if (otherAdmins === 0) {
        return res.status(400).json({ message: "At least one Active Admin is required" });
      }
    }

    user.isActive = nextStatus === "Active";
    user.dateOfLeaving = nextStatus === "Resigned"
      ? (user.dateOfLeaving || new Date().toISOString().slice(0, 10))
      : "";
    await user.save();

    const sanitized = user.toObject();
    delete sanitized.passwordHash;
    res.json({
      success: true,
      message: `${user.name} marked as ${nextStatus}`,
      user: sanitized,
    });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({ message: "Failed to update user status" });
  }
};

/* ---------- Remove User ---------- */
export const removeUser = async (req, res) => {
  try {
    const { empCode } = req.params;
    await User.findOneAndDelete({ empCode });
    res.json({ message: "User removed" });
  } catch (err) {
    console.error("Remove user error:", err);
    res.status(500).json({ message: "Failed to remove user" });
  }
};

/* ---------- Reset Password ---------- */
export const resetPassword = async (req, res) => {
  try {
    const { empCode } = req.params;
    const { password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { empCode },
      { passwordHash, plainPassword: password }, // ⚠️ Also save plain for admin reference
      { new: true }
    );

    res.json(user);
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

/* ---------- Update Report-To ---------- */
export const updateReportTo = async (req, res) => {
  try {
    const { empCode } = req.params;
    const { managerEmpCode } = req.body;

    const manager = await User.findOne({ empCode: managerEmpCode });
    if (!manager) return res.status(404).json({ message: "Manager not found" });

    const user = await User.findOneAndUpdate(
      { empCode },
      {
        $addToSet: {
          reportTo: { empCode: manager.empCode, name: manager.name },
        },
      },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    console.error("updateReportTo error:", err);
    res.status(500).json({ message: "Failed to update report-to" });
  }
};

/* ---------- Remove Report-To ---------- */
export const removeReportTo = async (req, res) => {
  try {
    const { empCode, managerEmpCode } = req.params;

    const user = await User.findOneAndUpdate(
      { empCode },
      { $pull: { reportTo: { empCode: managerEmpCode } } },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    console.error("removeReportTo error:", err);
    res.status(500).json({ message: "Failed to remove report-to" });
  }
};

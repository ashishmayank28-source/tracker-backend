import User from "../models/userModel.js";

/* ---------- Recursive hierarchy builder ---------- */
async function buildTree(user, allUsers) {
  const children = allUsers.filter(
    (u) => u.reportTo?.[0]?.empCode === user.empCode
  );

  if (children.length === 0) return { ...user, subordinates: [] };

  return {
    ...user,
    subordinates: await Promise.all(
      children.map((child) => buildTree(child, allUsers))
    ),
  };
}

/* ---------- Get full hierarchy (regional/branch/area) ---------- */
export const getHierarchy = async (req, res) => {
  try {
    const { empCode } = req.params;

    const root = await User.findOne({ empCode }).lean();
    if (!root) return res.status(404).json({ message: "User not found" });

    const allUsers = await User.find({ region: root.region }).lean();

    const tree = await buildTree(root, allUsers);

    res.json(tree);
  } catch (err) {
    console.error("getHierarchy error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------- Branch Manager → Direct reportees ---------- */
export const getBranchReportees = async (req, res) => {
  try {
    const { empCode } = req.params;
    const reportees = await User.find({ branchManagerCode: empCode }).lean();
    res.json(reportees || []);
  } catch (err) {
    console.error("getBranchReportees error:", err);
    res.status(500).json({ message: "Failed to fetch reportees" });
  }
};

/* ---------- Manager → Direct reportees ---------- */
export const getManagerTeam = async (req, res) => {
  try {
    const { empCode } = req.params;
    const team = await User.find({ "reportTo.empCode": empCode }).lean();
    res.json(team || []);
  } catch (err) {
    console.error("getManagerTeam error:", err);
    res.status(500).json({ message: "Failed to fetch manager team" });
  }
};

/* ---------- Get single user by empCode ---------- */
export const getUserByCode = async (req, res) => {
  try {
    const { empCode } = req.params;
    const user = await User.findOne({ empCode }).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getUserByCode error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

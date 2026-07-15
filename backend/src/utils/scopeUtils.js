import User from "../models/userModel.js";

/** MongoDB filter for users visible to Manager / BM / RM */
export function getScopedUserFilter(currentUser) {
  const { role, empCode, branch, region } = currentUser || {};

  switch (role) {
    case "Manager":
      return {
        $or: [{ "reportTo.empCode": empCode }, { managerEmpCode: empCode }],
      };
    case "BranchManager":
      return branch ? { branch } : { _id: null };
    case "RegionalManager":
      return region ? { region } : { _id: null };
    default:
      return { _id: null };
  }
}

export async function getScopedUsers(currentUser, extraFilter = {}) {
  if (!currentUser) return [];
  if (currentUser.role === "Admin") {
    return User.find({ isActive: { $ne: false }, ...extraFilter })
      .select("-passwordHash")
      .lean();
  }
  if (!["Manager", "BranchManager", "RegionalManager"].includes(currentUser.role)) {
    return [];
  }
  return User.find({ ...getScopedUserFilter(currentUser), ...extraFilter })
    .select("-passwordHash")
    .lean();
}

export async function getScopedEmpCodes(currentUser) {
  const users = await getScopedUsers(currentUser);
  return users.map((u) => u.empCode).filter(Boolean);
}

export async function isEmpInScope(currentUser, targetEmpCode) {
  if (!targetEmpCode || !currentUser) return false;
  if (currentUser.role === "Admin") return true;
  if (targetEmpCode === currentUser.empCode) return true;

  const count = await User.countDocuments({
    empCode: targetEmpCode,
    ...getScopedUserFilter(currentUser),
  });
  return count > 0;
}

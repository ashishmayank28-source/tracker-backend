export function roleToDashboardPath(role) {
  if (!role) return "/";

  switch (role.toLowerCase()) {
    case "employee":
      return "/employee-dashboard";   // ✅ match App.jsx
    case "manager":
      return "/manager-dashboard";    // ✅ match App.jsx
    case "admin":
      return "/admin";                // ✅ match App.jsx
    case "branchmanager":
    case "branch_manager":
      return "/branch-dashboard";     // ✅ match App.jsx
    case "regionalmanager":
    case "regional_manager":
      return "/regional-dashboard";   // ✅ match App.jsx
    default:
      return "/";
  }
}

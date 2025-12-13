// backend/middleware/requireRole.js
export const requireRole = (roles) => (req, res, next) => {
  // ✅ Handle both array and single role
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  console.log("🔐 Role check - User role:", req.user?.role, "Allowed:", allowedRoles);
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    console.log("❌ Role check FAILED - Access denied");
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  console.log("✅ Role check PASSED");
  next();
};

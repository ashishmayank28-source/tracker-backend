// backend/middleware/requireRole.js
export const requireRole = (roles) => (req, res, next) => {
  // ✅ Handle both array and single role
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  const userRole = req.user?.role;
  
  // ✅ Allow Guest for GET requests (read-only access)
  const isGuestReadAccess = userRole === "Guest" && req.method === "GET";
  
  if (!req.user || (!allowedRoles.includes(userRole) && !isGuestReadAccess)) {
    console.log("❌ Role check FAILED - Access denied for", userRole);
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  next();
};

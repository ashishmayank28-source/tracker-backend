// backend/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/* ---------- Helper to extract token ---------- */
function getToken(req) {
  const h = req.headers?.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  if (req.headers?.["x-access-token"]) return String(req.headers["x-access-token"]).trim();
  if (req.cookies?.token) return String(req.cookies.token).trim();
  return null;
}

/* ---------- Main Middleware ---------- */
export const authMiddleware = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const uid = decoded?.uid || decoded?.id;
    if (!uid) return res.status(401).json({ message: "Bad token payload" });

    // 🔹 Fetch user from DB
    const user = await User.findById(uid).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: uid,
      role: (decoded?.role || user.role || "").trim(),   // ✅ role normalize
      empCode: decoded?.empCode || user.empCode,
      name: user.name,
      region: user.region || null,
      branch: user.branch || null,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

/* ---------- Role Guards ---------- */
export const requireRole = (...allowed) => (req, res, next) => {
  try {
    const role = req.user?.role?.toLowerCase();   // ✅ case-insensitive
    const allowedLower = allowed.flat().map(r => r.toLowerCase());
    
    // ✅ Allow Guest for GET requests (read-only access)
    const isGuestReadAccess = role === "guest" && req.method === "GET";
    
    if (!role || (!allowedLower.includes(role) && !isGuestReadAccess)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  } catch {
    return res.status(403).json({ message: "Forbidden" });
  }
};

/* ✅ Alias for compatibility */
export const protect = authMiddleware;

/* ---------- Admin Only ---------- */
export const adminOnly = (req, res, next) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    // ✅ Allow Guest for GET requests (read-only access)
    if (role === "admin" || (role === "guest" && req.method === "GET")) {
      console.log("✅ adminOnly PASSED for role:", role, "method:", req.method);
      next();
    } else {
      console.log("❌ adminOnly FAILED for role:", role, "method:", req.method);
      res.status(403).json({ message: "Access denied: Admins only" });
    }
  } catch (err) {
    console.error("adminOnly error:", err);
    res.status(500).json({ message: "Auth check failed" });
  }
};

/* ---------- Vendor Only ---------- */
export const vendorOnly = (req, res, next) => {
  try {
    const role = req.user?.role?.toLowerCase();
    if (role === "vendor") {
      next();
    } else {
      res.status(403).json({ message: "Access denied: Vendors only" });
    }
  } catch (err) {
    res.status(500).json({ message: "Vendor auth check failed" });
  }
};

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const SIGN_OPTS = { expiresIn: "30d" };
const MASTER = process.env.MASTER_PASSWORD || "";

const normCode = (v) => String(v ?? "").trim().toUpperCase();
const normEmail = (v) => String(v ?? "").trim().toLowerCase();

/* ---------------- LOGIN ---------------- */
export async function login(req, res) {
  try {
    console.log("🔹 Login API hit hua with body:", req.body);

    const raw = String(
      req.body?.loginId || req.body?.empCode || req.body?.email || ""
    ).trim();
    const password = String(req.body?.password || "");

    if (!raw || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }
// After user found & password validated
if (req.body.role && req.body.role !== user.role) {
  return res.status(403).json({ message: `Access denied: You are not a ${req.body.role}` });
}
 
    // 🔍 Find by email OR empCode
    const query = raw.includes("@")
      ? { email: normEmail(raw) }
      : { empCode: normCode(raw) };

    const user = await User.findOne(query).select("+passwordHash");
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    let ok = false;

    // ✅ Compare with bcrypt hash
    if (user.passwordHash) {
      try {
        ok = await bcrypt.compare(password, user.passwordHash);
      } catch (e) {
        console.error("bcrypt compare error:", e);
      }
    }

    // ✅ Fallback: legacy plain-text password
    if (!ok && user.password && user.password === password) {
      ok = true;
    }

    // ✅ Master override
    if (!ok && MASTER) {
      ok = password === MASTER;
    }

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔑 Sign JWT with empCode, role, name
    const token = jwt.sign(
      {
        id: user._id,
        empCode: user.empCode,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      SIGN_OPTS
    );

    console.log("✅ Login success:", {
      id: user._id.toString(),
      empCode: user.empCode,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user: {
        _id: user._id,
        empCode: user.empCode,
        name: user.name,
        email: user.email || "",
        role: user.role,
        area: user.area || "",
        branch: user.branch || "",
        region: user.region || "",
      },
    });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ---------------- ME ---------------- */
export async function me(req, res) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Not found" });

    console.log("ℹ️ Me API returning user:", {
      id: user._id.toString(),
      empCode: user.empCode,
      role: user.role,
    });

    return res.json({
      _id: user._id,
      empCode: user.empCode,
      name: user.name,
      email: user.email || "",
      role: user.role,
      area: user.area || "",
      branch: user.branch || "",
      region: user.region || "",
    });
  } catch (e) {
    console.error("me error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

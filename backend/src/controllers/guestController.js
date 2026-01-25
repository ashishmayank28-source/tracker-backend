import jwt from "jsonwebtoken";
import GuestPermission, { AVAILABLE_TILES } from "../models/guestPermissionModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/* =============================================================
   🔐 Guest Login
============================================================= */
export const guestLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get guest permissions config
    let guestConfig = await GuestPermission.findOne();
    
    // If no config exists, create default
    if (!guestConfig) {
      guestConfig = await GuestPermission.create({
        allowedTiles: [],
        guestUsername: "guest",
        guestPassword: "guest123",
        isEnabled: true,
      });
    }

    // Check if guest login is enabled
    if (!guestConfig.isEnabled) {
      return res.status(403).json({ message: "Guest login is disabled" });
    }

    // Validate credentials
    if (username !== guestConfig.guestUsername || password !== guestConfig.guestPassword) {
      return res.status(401).json({ message: "Invalid guest credentials" });
    }

    // Generate JWT token for guest
    const token = jwt.sign(
      {
        empCode: "GUEST",
        name: "Guest User",
        role: "Guest",
        isGuest: true,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log("✅ Guest login successful");

    res.json({
      success: true,
      token,
      user: {
        empCode: "GUEST",
        name: "Guest User",
        role: "Guest",
        isGuest: true,
        allowedTiles: guestConfig.allowedTiles,
      },
    });
  } catch (err) {
    console.error("Guest Login Error:", err);
    res.status(500).json({ message: "Guest login failed" });
  }
};

/* =============================================================
   📋 Get Guest Permissions (for dashboard)
============================================================= */
export const getGuestPermissions = async (req, res) => {
  try {
    let guestConfig = await GuestPermission.findOne();
    
    if (!guestConfig) {
      guestConfig = await GuestPermission.create({
        allowedTiles: [],
        guestUsername: "guest",
        guestPassword: "guest123",
        isEnabled: true,
      });
    }

    res.json({
      allowedTiles: guestConfig.allowedTiles,
      isEnabled: guestConfig.isEnabled,
      guestUsername: guestConfig.guestUsername,
      availableTiles: AVAILABLE_TILES,
    });
  } catch (err) {
    console.error("Get Guest Permissions Error:", err);
    res.status(500).json({ message: "Failed to get permissions" });
  }
};

/* =============================================================
   ⚙️ Update Guest Permissions (Admin Only)
============================================================= */
export const updateGuestPermissions = async (req, res) => {
  try {
    const { allowedTiles, isEnabled, guestUsername, guestPassword } = req.body;
    const adminCode = req.user?.empCode;

    let guestConfig = await GuestPermission.findOne();
    
    if (!guestConfig) {
      guestConfig = new GuestPermission();
    }

    // Update fields
    if (allowedTiles !== undefined) guestConfig.allowedTiles = allowedTiles;
    if (isEnabled !== undefined) guestConfig.isEnabled = isEnabled;
    if (guestUsername) guestConfig.guestUsername = guestUsername;
    if (guestPassword) guestConfig.guestPassword = guestPassword;
    guestConfig.updatedBy = adminCode;

    await guestConfig.save();

    console.log("✅ Guest permissions updated by:", adminCode);

    res.json({
      success: true,
      message: "✅ Guest permissions updated!",
      data: {
        allowedTiles: guestConfig.allowedTiles,
        isEnabled: guestConfig.isEnabled,
        guestUsername: guestConfig.guestUsername,
      },
    });
  } catch (err) {
    console.error("Update Guest Permissions Error:", err);
    res.status(500).json({ message: "Failed to update permissions" });
  }
};

/* =============================================================
   📋 Get Available Tiles List
============================================================= */
export const getAvailableTiles = async (req, res) => {
  res.json(AVAILABLE_TILES);
};

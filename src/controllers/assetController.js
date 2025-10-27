// backend/src/controllers/assetController.js
import Asset from "../models/assetModel.js";
import AssetLedger from "../models/assetLedgerModel.js";
import User from "../models/userModel.js";
import generateAssignmentId from "../utils/generateAssignmentId.js";

/* ---------- Assign asset to user ---------- */
export const assignAsset = async (req, res) => {
  try {
    const { empCode, type, assetId, qty } = req.body;

    const asset = await Asset.findById(assetId).lean();
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const user = await User.findOne({ empCode }).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    let ledger = await AssetLedger.findOne({ empCode, type });
    if (!ledger) {
      ledger = new AssetLedger({
        empCode: user.empCode,
        name: user.name,
        role: user.role,
        branch: user.branch,
        region: user.region,
        type,
        assignments: []
      });
    }

    // 🔹 Check if already assigned same asset
    const idx = ledger.assignments.findIndex(a => a.assetId.toString() === assetId);
    if (idx >= 0) {
      ledger.assignments[idx].qty += qty;
    } else {
      ledger.assignments.push({
        assignmentId: generateAssignmentId(),   // 🔹 Auto generated ID
        assetId,
        assetName: asset.name,
        qty
      });
    }

    await ledger.save();
    res.json({ message: "Asset assigned", ledger });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign asset", error: err.message });
  }
};

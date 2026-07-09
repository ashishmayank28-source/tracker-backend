import ChannelPartner from "../models/channelPartnerModel.js";

const normCode = (v) => String(v ?? "").trim();
const normName = (v) => String(v ?? "").trim();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getActiveChannelPartners = async (_req, res) => {
  try {
    const list = await ChannelPartner.find({ isActive: true })
      .sort({ distributorCode: 1 })
      .select("distributorCode distributorName _id")
      .lean();

    res.json(list.map((x) => x));
  } catch (err) {
    console.error("getActiveChannelPartners error:", err);
    res.status(500).json({ message: "Failed to fetch channel partners" });
  }
};

export const getAllChannelPartners = async (_req, res) => {
  try {
    const list = await ChannelPartner.find()
      .sort({ isActive: -1, distributorCode: 1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error("getAllChannelPartners error:", err);
    res.status(500).json({ message: "Failed to fetch channel partners" });
  }
};

export const createChannelPartner = async (req, res) => {
  try {
    const distributorCode = normCode(req.body?.distributorCode);
    const distributorName = normName(req.body?.distributorName);
    if (!distributorCode || !distributorName) {
      return res.status(400).json({ message: "Distributor code and name are required" });
    }

    const existing = await ChannelPartner.findOne({
      distributorCode: { $regex: new RegExp(`^${escapeRegex(distributorCode)}$`, "i") },
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.distributorName = distributorName;
        await existing.save();
        return res.status(201).json({ success: true, message: "Re-activated partner", item: existing });
      }
      return res.status(400).json({ message: "Distributor code already exists" });
    }

    const item = await ChannelPartner.create({
      distributorCode,
      distributorName,
      isActive: true,
      createdBy: req.user?.empCode || "",
    });

    res.status(201).json({ success: true, message: "Partner added", item });
  } catch (err) {
    console.error("createChannelPartner error:", err);
    res.status(500).json({ message: "Failed to add channel partner" });
  }
};

export const updateChannelPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorCode = normCode(req.body?.distributorCode);
    const distributorName = normName(req.body?.distributorName);
    const { isActive } = req.body;

    if (!distributorCode || !distributorName) {
      return res.status(400).json({ message: "Distributor code and name are required" });
    }

    const duplicate = await ChannelPartner.findOne({
      _id: { $ne: id },
      distributorCode: { $regex: new RegExp(`^${escapeRegex(distributorCode)}$`, "i") },
    });
    if (duplicate) {
      return res.status(400).json({ message: "Another partner with this code already exists" });
    }

    const item = await ChannelPartner.findByIdAndUpdate(
      id,
      {
        distributorCode,
        distributorName,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      { new: true }
    );

    if (!item) return res.status(404).json({ message: "Partner not found" });

    res.json({ success: true, message: "Partner updated", item });
  } catch (err) {
    console.error("updateChannelPartner error:", err);
    res.status(500).json({ message: "Failed to update channel partner" });
  }
};

export const deleteChannelPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ChannelPartner.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ message: "Partner not found" });
    res.json({ success: true, message: `Partner ${item.distributorCode} deleted` });
  } catch (err) {
    console.error("deleteChannelPartner error:", err);
    res.status(500).json({ message: "Failed to delete channel partner" });
  }
};


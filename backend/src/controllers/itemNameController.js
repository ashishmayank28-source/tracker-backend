import ItemName from "../models/itemNameModel.js";

const normalizeName = (v) => String(v ?? "").trim();

/* GET active item names (employees) */
export const getActiveItemNames = async (_req, res) => {
  try {
    const items = await ItemName.find({ isActive: true })
      .sort({ name: 1 })
      .select("name _id")
      .lean();

    res.json(items.map((i) => i.name));
  } catch (err) {
    console.error("getActiveItemNames error:", err);
    res.status(500).json({ message: "Failed to fetch item names" });
  }
};

/* GET all item names (admin) */
export const getAllItemNames = async (_req, res) => {
  try {
    const items = await ItemName.find().sort({ name: 1 }).lean();
    res.json(items);
  } catch (err) {
    console.error("getAllItemNames error:", err);
    res.status(500).json({ message: "Failed to fetch item names" });
  }
};

/* POST add item name (admin) */
export const createItemName = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const existing = await ItemName.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.name = name;
        await existing.save();
        return res.status(201).json({
          success: true,
          message: "Item name re-activated",
          item: existing,
        });
      }
      return res.status(400).json({ message: "Item name already exists" });
    }

    const item = await ItemName.create({
      name,
      isActive: true,
      createdBy: req.user?.empCode || "",
    });

    res.status(201).json({
      success: true,
      message: "Item name added",
      item,
    });
  } catch (err) {
    console.error("createItemName error:", err);
    res.status(500).json({ message: "Failed to add item name" });
  }
};

/* PUT update item name (admin) */
export const updateItemName = async (req, res) => {
  try {
    const { id } = req.params;
    const name = normalizeName(req.body?.name);
    const { isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const duplicate = await ItemName.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (duplicate) {
      return res.status(400).json({ message: "Another item with this name already exists" });
    }

    const item = await ItemName.findByIdAndUpdate(
      id,
      {
        name,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Item name not found" });
    }

    res.json({ success: true, message: "Item name updated", item });
  } catch (err) {
    console.error("updateItemName error:", err);
    res.status(500).json({ message: "Failed to update item name" });
  }
};

/* DELETE item name (admin) */
export const deleteItemName = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ItemName.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ message: "Item name not found" });
    }

    res.json({
      success: true,
      message: `Item "${item.name}" removed from list`,
    });
  } catch (err) {
    console.error("deleteItemName error:", err);
    res.status(500).json({ message: "Failed to delete item name" });
  }
};

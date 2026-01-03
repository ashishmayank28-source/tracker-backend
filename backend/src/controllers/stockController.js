import Stock from "../models/stockModel.js";

// ✅ Get Stock Configuration
export const getStock = async (req, res) => {
  try {
    let stock = await Stock.findOne();
    
    // If no stock config exists, create default
    if (!stock) {
      stock = new Stock({
        columns: ["Opening", "Issued", "Balance"],
        items: [
          { name: "Blenze Pro PDB", year: "2025", lot: "Lot 1", Opening: 500, Issued: 0, Balance: 500 },
          { name: "Impact PDB", year: "2025", lot: "Lot 1", Opening: 600, Issued: 0, Balance: 600 },
          { name: "Horizon PDB", year: "2025", lot: "Lot 1", Opening: 400, Issued: 0, Balance: 400 },
          { name: "Evo PDB", year: "2025", lot: "Lot 1", Opening: 350, Issued: 0, Balance: 350 },
          { name: "Orna PDB", year: "2025", lot: "Lot 1", Opening: 500, Issued: 0, Balance: 500 },
        ],
      });
      await stock.save();
    }
    
    res.json(stock);
  } catch (err) {
    console.error("Get stock error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Stock Configuration
export const updateStock = async (req, res) => {
  try {
    const { columns, items } = req.body;
    
    console.log("📦 Stock update request:", { columns, itemsCount: items?.length });
    
    let stock = await Stock.findOne();
    
    if (!stock) {
      stock = new Stock({ columns, items });
    } else {
      stock.columns = columns || stock.columns;
      
      // ✅ Properly update items - preserve _id if exists
      if (items && Array.isArray(items)) {
        stock.items = items.map(item => ({
          _id: item._id, // Preserve existing _id
          name: item.name,
          year: item.year || new Date().getFullYear().toString(),
          lot: item.lot || "Lot 1",
          Opening: item.Opening || 0,
          Issued: item.Issued || 0,
          Balance: item.Balance !== undefined ? item.Balance : (item.Opening || 0) - (item.Issued || 0),
          extraColumns: item.extraColumns || {},
          createdAt: item.createdAt || new Date(),
          updatedAt: new Date(),
        }));
      }
      
      stock.updatedBy = req.user?.name || "Admin";
      stock.updatedAt = new Date();
    }
    
    await stock.save();
    console.log("✅ Stock saved:", stock.items.map(i => ({ name: i.name, Issued: i.Issued, Balance: i.Balance })));
    res.json({ success: true, message: "Stock updated successfully", stock });
  } catch (err) {
    console.error("Update stock error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Add Stock Item
export const addStockItem = async (req, res) => {
  try {
    const { name, year, lot, Opening, Issued, Balance } = req.body;
    
    let stock = await Stock.findOne();
    if (!stock) {
      stock = new Stock({ items: [] });
    }
    
    stock.items.push({
      name,
      year: year || new Date().getFullYear().toString(),
      lot: lot || "Lot 1",
      Opening: Opening || 0,
      Issued: Issued || 0,
      Balance: Balance || Opening || 0,
    });
    
    await stock.save();
    res.json({ success: true, message: "Item added", stock });
  } catch (err) {
    console.error("Add stock item error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Remove Stock Item
export const removeStockItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    let stock = await Stock.findOne();
    if (!stock) return res.status(404).json({ message: "Stock not found" });
    
    stock.items = stock.items.filter(item => item._id.toString() !== itemId);
    await stock.save();
    
    res.json({ success: true, message: "Item removed", stock });
  } catch (err) {
    console.error("Remove stock item error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Single Stock Item (for quick edits)
export const updateStockItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;
    
    let stock = await Stock.findOne();
    if (!stock) return res.status(404).json({ message: "Stock not found" });
    
    const itemIndex = stock.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) return res.status(404).json({ message: "Item not found" });
    
    // Update the item
    Object.keys(updates).forEach(key => {
      stock.items[itemIndex][key] = updates[key];
    });
    
    stock.updatedAt = new Date();
    await stock.save();
    
    res.json({ success: true, message: "Item updated", stock });
  } catch (err) {
    console.error("Update stock item error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Deduct stock when assignment is made
export const deductStock = async (itemName, qty) => {
  try {
    let stock = await Stock.findOne();
    if (!stock) return false;
    
    const itemIndex = stock.items.findIndex(item => item.name === itemName);
    if (itemIndex === -1) return false;
    
    stock.items[itemIndex].Issued += qty;
    stock.items[itemIndex].Balance -= qty;
    await stock.save();
    
    return true;
  } catch (err) {
    console.error("Deduct stock error:", err);
    return false;
  }
};


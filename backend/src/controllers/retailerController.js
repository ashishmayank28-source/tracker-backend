import Retailer from "../models/retailerModel.js";

// Create a new retailer
export const createRetailer = async (req, res) => {
  try {
    const {
      ownerMobile,
      companyGSTN,
      companyName,
      ownerName,
      companyEmail,
      companyAddress,
      city,
      cityPIN,
      distributorCode,
      distributorName,
      cpmEID,
      cpmName,
      branch,
      region,
      createdBy,
      createdByName,
    } = req.body;

    // Check if retailer with same mobile exists
    const existing = await Retailer.findOne({ ownerMobile });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Retailer with this mobile number already exists",
      });
    }

    const retailer = new Retailer({
      ownerMobile,
      companyGSTN,
      companyName,
      ownerName,
      companyEmail,
      companyAddress,
      city,
      cityPIN,
      distributorCode,
      distributorName,
      cpmEID,
      cpmName,
      branch,
      region,
      createdBy,
      createdByName,
    });

    await retailer.save();

    res.status(201).json({
      success: true,
      message: "Retailer added successfully",
      data: retailer,
    });
  } catch (err) {
    console.error("Create retailer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to add retailer",
      error: err.message,
    });
  }
};

// Get all retailers (with optional filters)
export const getRetailers = async (req, res) => {
  try {
    const { city, branch, region, search, createdBy, status } = req.query;
    const filter = {};

    if (city) filter.city = new RegExp(city, "i");
    if (branch) filter.branch = new RegExp(branch, "i");
    if (region) filter.region = new RegExp(region, "i");
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;

    // Text search
    if (search) {
      filter.$or = [
        { companyName: new RegExp(search, "i") },
        { ownerName: new RegExp(search, "i") },
        { ownerMobile: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
      ];
    }

    const retailers = await Retailer.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: retailers.length,
      data: retailers,
    });
  } catch (err) {
    console.error("Get retailers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch retailers",
    });
  }
};

// Get retailer by ID
export const getRetailerById = async (req, res) => {
  try {
    const retailer = await Retailer.findById(req.params.id);
    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: "Retailer not found",
      });
    }
    res.json({ success: true, data: retailer });
  } catch (err) {
    console.error("Get retailer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch retailer",
    });
  }
};

// Update retailer
export const updateRetailer = async (req, res) => {
  try {
    const retailer = await Retailer.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: "Retailer not found",
      });
    }

    res.json({
      success: true,
      message: "Retailer updated successfully",
      data: retailer,
    });
  } catch (err) {
    console.error("Update retailer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update retailer",
    });
  }
};

// Delete retailer
export const deleteRetailer = async (req, res) => {
  try {
    const retailer = await Retailer.findByIdAndDelete(req.params.id);
    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: "Retailer not found",
      });
    }
    res.json({
      success: true,
      message: "Retailer deleted successfully",
    });
  } catch (err) {
    console.error("Delete retailer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete retailer",
    });
  }
};

// Get retailers by employee
export const getMyRetailers = async (req, res) => {
  try {
    const empCode = req.user.empCode;
    const retailers = await Retailer.find({ createdBy: empCode })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: retailers.length,
      data: retailers,
    });
  } catch (err) {
    console.error("Get my retailers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch retailers",
    });
  }
};

// Search retailer by mobile
export const searchByMobile = async (req, res) => {
  try {
    const { mobile } = req.params;
    const retailer = await Retailer.findOne({ ownerMobile: mobile });

    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: "Retailer not found",
      });
    }

    res.json({ success: true, data: retailer });
  } catch (err) {
    console.error("Search retailer error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to search retailer",
    });
  }
};


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

    // Check if retailer with same mobile exists for this employee
    const existing = await Retailer.findOne({ ownerMobile, createdBy });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This mobile number is already registered in your retailer database",
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

// Get all retailers for team (Manager/BM/RM/Admin)
export const getTeamRetailers = async (req, res) => {
  try {
    const { branch, region, search, city } = req.query;
    const userRole = req.user.role;
    const filter = {};

    // Role-based filtering
    if (userRole === "Manager") {
      // Manager sees retailers from their branch
      if (req.user.branch) filter.branch = req.user.branch;
    } else if (userRole === "BranchManager") {
      // BM sees all retailers from their branch
      if (req.user.branch) filter.branch = req.user.branch;
    } else if (userRole === "RegionalManager") {
      // RM sees all retailers from their region
      if (req.user.region) filter.region = req.user.region;
    }
    // Admin sees all retailers (no filter)

    // Apply additional filters from query
    if (branch && userRole === "Admin") filter.branch = new RegExp(branch, "i");
    if (region && (userRole === "Admin" || userRole === "RegionalManager")) {
      filter.region = new RegExp(region, "i");
    }
    if (city) filter.city = new RegExp(city, "i");

    // Text search
    if (search) {
      filter.$or = [
        { companyName: new RegExp(search, "i") },
        { ownerName: new RegExp(search, "i") },
        { ownerMobile: new RegExp(search, "i") },
        { createdBy: new RegExp(search, "i") },
        { createdByName: new RegExp(search, "i") },
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
    console.error("Get team retailers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch retailers",
    });
  }
};

// Check if mobile exists for employee
export const checkMobileExists = async (req, res) => {
  try {
    const { mobile } = req.params;
    const empCode = req.user.empCode;
    
    const existing = await Retailer.findOne({ 
      ownerMobile: mobile, 
      createdBy: empCode 
    });

    res.json({
      success: true,
      exists: !!existing,
      message: existing ? "This mobile is already registered in your database" : "Mobile available",
    });
  } catch (err) {
    console.error("Check mobile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to check mobile",
    });
  }
};


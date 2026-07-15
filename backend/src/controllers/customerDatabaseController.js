import CustomerDB from "../models/customerDBModel.js";
import { getScopedEmpCodes, isEmpInScope } from "../utils/scopeUtils.js";

// ✅ Create new customer
export const createCustomer = async (req, res) => {
  try {
    const {
      customerUID,
      customerType,
      mobile,
      name,
      companyName,
      email,
      address,
      city,
      pinCode,
      gstn,
      distributorCode,
      distributorName,
      cpmEID,
      cpmName,
      specialization,
      experience,
      licenseNumber,
      firmName,
      registrationNumber,
      projectTypes,
      companyType,
      reraNumber,
      ongoingProjects,
      branch,
      region,
      remarks,
    } = req.body;

    // Validate required fields
    if (!customerType || !mobile || !name || !city) {
      return res.status(400).json({ 
        success: false, 
        message: "Customer Type, Mobile, Name, and City are required" 
      });
    }

    // Check if mobile already exists for this customer type
    const existing = await CustomerDB.findOne({ mobile, customerType });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: `This mobile is already registered as ${customerType}` 
      });
    }

    // Create customer
    const customer = new CustomerDB({
      customerUID: customerUID || undefined, // Will be auto-generated if not provided
      customerType,
      mobile,
      name,
      companyName,
      email,
      address,
      city,
      pinCode,
      gstn,
      distributorCode,
      distributorName,
      cpmEID,
      cpmName,
      specialization,
      experience,
      licenseNumber,
      firmName,
      registrationNumber,
      projectTypes,
      companyType,
      reraNumber,
      ongoingProjects,
      branch: branch || req.user?.branch,
      region: region || req.user?.region,
      createdBy: req.user?.empCode,
      createdByName: req.user?.name,
      remarks,
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: `${customerType} added successfully`,
      data: customer,
    });
  } catch (err) {
    console.error("Create customer error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Customer UID already exists" 
      });
    }
    res.status(500).json({ success: false, message: "Failed to add customer" });
  }
};

// ✅ Get all customers (with optional type filter)
export const getCustomers = async (req, res) => {
  try {
    const { type, branch, region, city, search } = req.query;
    const filter = {};

    if (type) filter.customerType = type;
    if (branch) filter.branch = branch;
    if (region) filter.region = region;
    if (city) filter.city = { $regex: city, $options: "i" };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { customerUID: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await CustomerDB.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error("Get customers error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
};

// ✅ Get my customers (created by current user)
export const getMyCustomers = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { createdBy: req.user?.empCode };
    
    if (type) filter.customerType = type;

    const customers = await CustomerDB.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error("Get my customers error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
};

// ✅ Get customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await CustomerDB.findById(id);
    
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (
      req.user.role !== "Admin" &&
      customer.createdBy !== req.user.empCode &&
      !(await isEmpInScope(req.user, customer.createdBy))
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    console.error("Get customer error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch customer" });
  }
};

// ✅ Update customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CustomerDB.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (
      req.user.role !== "Admin" &&
      existing.createdBy !== req.user.empCode &&
      !(await isEmpInScope(req.user, existing.createdBy))
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updates = req.body;

    // Prevent changing customerType and customerUID
    delete updates.customerType;
    delete updates.customerUID;
    delete updates.createdBy;

    const customer = await CustomerDB.findByIdAndUpdate(id, updates, { new: true });
    
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ success: false, message: "Failed to update customer" });
  }
};

// ✅ Delete customer
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CustomerDB.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    if (
      req.user.role !== "Admin" &&
      existing.createdBy !== req.user.empCode &&
      !(await isEmpInScope(req.user, existing.createdBy))
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await CustomerDB.findByIdAndDelete(id);

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ success: false, message: "Failed to delete customer" });
  }
};

// ✅ Check if mobile exists for customer type
export const checkMobile = async (req, res) => {
  try {
    const { mobile, type } = req.params;
    const existing = await CustomerDB.findOne({ mobile, customerType: type });
    
    res.json({ exists: !!existing });
  } catch (err) {
    console.error("Check mobile error:", err);
    res.status(500).json({ exists: false });
  }
};

// ✅ Get customers by type for team (for managers)
export const getTeamCustomers = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) filter.customerType = type;

    if (req.user.role === "Admin") {
      // Admin sees all
    } else if (["Manager", "BranchManager", "RegionalManager"].includes(req.user.role)) {
      const scopedCodes = await getScopedEmpCodes(req.user);
      if (!scopedCodes.length) {
        return res.json({ success: true, count: 0, data: [] });
      }
      filter.createdBy = { $in: scopedCodes };
    } else {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const customers = await CustomerDB.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error("Get team customers error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
};

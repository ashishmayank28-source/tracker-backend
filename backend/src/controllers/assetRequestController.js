import AssetRequest from "../models/assetRequestModel.js";
import AssetItem from "../models/assetItemsModel.js";
import User from "../models/userModel.js";

// ============================================
// 🟢 ASSET ITEMS (Admin Configurable Dropdown)
// ============================================

// ✅ Get all active asset items (for dropdown)
export const getAssetItems = async (req, res) => {
  try {
    const items = await AssetItem.find({ isActive: true }).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    console.error("Get asset items error:", err);
    res.status(500).json({ message: "Failed to fetch asset items" });
  }
};

// ✅ Get all asset items (Admin - including inactive)
export const getAllAssetItems = async (req, res) => {
  try {
    const items = await AssetItem.find().sort({ name: 1 });
    res.json(items);
  } catch (err) {
    console.error("Get all asset items error:", err);
    res.status(500).json({ message: "Failed to fetch asset items" });
  }
};

// ✅ Create asset item (Admin only)
export const createAssetItem = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    // Check if already exists
    const existing = await AssetItem.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Item already exists" });
    }

    const item = new AssetItem({
      name: name.trim(),
      category: category || "General",
      description: description || "",
      createdBy: req.user.empCode,
    });

    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("Create asset item error:", err);
    res.status(500).json({ message: "Failed to create asset item" });
  }
};

// ✅ Update asset item (Admin only)
export const updateAssetItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, isActive } = req.body;

    const item = await AssetItem.findByIdAndUpdate(
      id,
      { name, category, description, isActive },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error("Update asset item error:", err);
    res.status(500).json({ message: "Failed to update asset item" });
  }
};

// ✅ Delete asset item (Admin only)
export const deleteAssetItem = async (req, res) => {
  try {
    const { id } = req.params;
    await AssetItem.findByIdAndDelete(id);
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    console.error("Delete asset item error:", err);
    res.status(500).json({ message: "Failed to delete asset item" });
  }
};

// ============================================
// 🔵 ASSET REQUESTS
// ============================================

// ✅ Create new asset request (Employee/Manager)
export const createAssetRequest = async (req, res) => {
  try {
    const { items, purpose, remarks } = req.body;
    const user = req.user;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Get user's hierarchy
    const userDoc = await User.findOne({ empCode: user.empCode });

    const request = new AssetRequest({
      empCode: user.empCode,
      empName: user.name,
      empRole: user.role,
      branch: user.branch || userDoc?.branch,
      region: user.region || userDoc?.region,
      items,
      purpose,
      remarks,
      managerId: userDoc?.managerId || "",
      bmId: userDoc?.bmId || "",
      rmId: userDoc?.rmId || "",
    });

    await request.save();
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    console.error("Create asset request error:", err);
    res.status(500).json({ message: "Failed to create asset request" });
  }
};

// ✅ Get my asset requests (Employee/Manager)
export const getMyAssetRequests = async (req, res) => {
  try {
    const requests = await AssetRequest.find({ empCode: req.user.empCode }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("Get my asset requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ✅ Get pending requests for BM approval (Branch Manager)
export const getBMPendingRequests = async (req, res) => {
  try {
    const user = req.user;
    
    // Get all users under this BM
    const teamUsers = await User.find({ bmId: user.empCode }).select("empCode");
    const teamEmpCodes = teamUsers.map((u) => u.empCode);
    teamEmpCodes.push(user.empCode); // Include BM's own requests if any

    const requests = await AssetRequest.find({
      empCode: { $in: teamEmpCodes },
      status: "Pending",
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Get BM pending requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ✅ Get all requests for BM (including approved/rejected)
export const getBMAllRequests = async (req, res) => {
  try {
    const user = req.user;
    
    // Get all users under this BM
    const teamUsers = await User.find({ bmId: user.empCode }).select("empCode");
    const teamEmpCodes = teamUsers.map((u) => u.empCode);
    teamEmpCodes.push(user.empCode);

    const requests = await AssetRequest.find({
      empCode: { $in: teamEmpCodes },
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Get BM all requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ✅ Approve/Reject request (Branch Manager)
export const bmApproveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // action: "approve" or "reject"
    const user = req.user;

    const request = await AssetRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    if (action === "approve") {
      request.status = "BM Approved";
      request.bmApproval = {
        status: "Approved",
        approvedBy: user.empCode,
        approvedByName: user.name,
        approvedAt: new Date(),
        remarks: remarks || "",
      };
    } else if (action === "reject") {
      request.status = "BM Rejected";
      request.bmApproval = {
        status: "Rejected",
        approvedBy: user.empCode,
        approvedByName: user.name,
        approvedAt: new Date(),
        remarks: remarks || "",
      };
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    console.error("BM approve request error:", err);
    res.status(500).json({ message: "Failed to process request" });
  }
};

// ✅ Get approved requests for Admin assignment
export const getApprovedRequests = async (req, res) => {
  try {
    const requests = await AssetRequest.find({ status: "BM Approved" }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("Get approved requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ✅ Get all requests (Admin)
export const getAllRequests = async (req, res) => {
  try {
    const requests = await AssetRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("Get all requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ✅ Admin assign request (mark as assigned after creating stock assignment)
export const adminAssignRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignmentId, remarks } = req.body;
    const user = req.user;

    const request = await AssetRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "BM Approved") {
      return res.status(400).json({ message: "Only BM approved requests can be assigned" });
    }

    request.status = "Assigned";
    request.adminAssignment = {
      assignedBy: user.empCode,
      assignedByName: user.name,
      assignedAt: new Date(),
      assignmentId: assignmentId || "",
      remarks: remarks || "",
    };

    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    console.error("Admin assign request error:", err);
    res.status(500).json({ message: "Failed to assign request" });
  }
};

// ✅ Mark request as completed
export const completeRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await AssetRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "Completed";
    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    console.error("Complete request error:", err);
    res.status(500).json({ message: "Failed to complete request" });
  }
};

// frontend/src/pages/admin/AssetRequestAdmin.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function AssetRequestAdmin() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("approved"); // "items", "approved", "all"
  const [loading, setLoading] = useState(true);

  // Asset Items State
  const [assetItems, setAssetItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // Requests State
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignRemarks, setAssignRemarks] = useState("");
  const [processing, setProcessing] = useState(false);

  // Fetch asset items
  const fetchAssetItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/items/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAssetItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch items error:", err);
    }
  };

  // Fetch approved requests
  const fetchApprovedRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApprovedRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch approved requests error:", err);
    }
  };

  // Fetch all requests
  const fetchAllRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch all requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssetItems();
      fetchApprovedRequests();
      fetchAllRequests();
    }
  }, [token]);

  // Create new item
  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      alert("Please enter item name");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          category: newItemCategory.trim() || "General",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Item created!");
        setNewItemName("");
        setNewItemCategory("");
        fetchAssetItems();
      } else {
        alert("❌ " + (data.message || "Failed to create item"));
      }
    } catch (err) {
      console.error("Create item error:", err);
      alert("❌ Error creating item");
    }
  };

  // Update item
  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/items/${editingItem._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingItem),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Item updated!");
        setEditingItem(null);
        fetchAssetItems();
      } else {
        alert("❌ " + (data.message || "Failed to update"));
      }
    } catch (err) {
      console.error("Update item error:", err);
      alert("❌ Error updating item");
    }
  };

  // Delete item
  const handleDeleteItem = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Item deleted!");
        fetchAssetItems();
      } else {
        alert("❌ " + (data.message || "Failed to delete"));
      }
    } catch (err) {
      console.error("Delete item error:", err);
      alert("❌ Error deleting item");
    }
  };

  // Assign request
  const handleAssign = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/asset-requests/assign/${selectedRequest._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks: assignRemarks }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Request marked as Assigned!");
        setSelectedRequest(null);
        setAssignRemarks("");
        fetchApprovedRequests();
        fetchAllRequests();
      } else {
        alert("❌ " + (data.message || "Failed to assign"));
      }
    } catch (err) {
      console.error("Assign error:", err);
      alert("❌ Error assigning request");
    } finally {
      setProcessing(false);
    }
  };

  // Status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return { bg: "#fef3c7", color: "#92400e" };
      case "BM Approved":
        return { bg: "#d1fae5", color: "#065f46" };
      case "BM Rejected":
        return { bg: "#fee2e2", color: "#991b1b" };
      case "Assigned":
        return { bg: "#dbeafe", color: "#1e40af" };
      case "Completed":
        return { bg: "#e0e7ff", color: "#3730a3" };
      default:
        return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20, color: "#1e293b" }}>📦 Asset Request Management</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("items")}
          style={{
            padding: "10px 24px",
            background: activeTab === "items" ? "#8b5cf6" : "#f1f5f9",
            color: activeTab === "items" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ⚙️ Manage Items ({assetItems.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          style={{
            padding: "10px 24px",
            background: activeTab === "approved" ? "#22c55e" : "#f1f5f9",
            color: activeTab === "approved" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ✅ BM Approved ({approvedRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "10px 24px",
            background: activeTab === "all" ? "#3b82f6" : "#f1f5f9",
            color: activeTab === "all" ? "white" : "#475569",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📋 All Requests ({allRequests.length})
        </button>
      </div>

      {/* Items Tab */}
      {activeTab === "items" && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3 style={{ marginBottom: 16 }}>➕ Add New Item</h3>
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item Name *"
              style={{
                flex: 1,
                minWidth: 200,
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            />
            <input
              type="text"
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              placeholder="Category (optional)"
              style={{
                width: 150,
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            />
            <button
              onClick={handleCreateItem}
              style={{
                padding: "10px 20px",
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ➕ Add
            </button>
          </div>

          <h3 style={{ marginBottom: 16 }}>📋 Item List</h3>
          {assetItems.length === 0 ? (
            <p style={{ color: "#64748b" }}>No items added yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Name</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Category</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assetItems.map((item, idx) => (
                    <tr key={item._id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                        {item.name}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                        {item.category || "-"}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: item.isActive ? "#d1fae5" : "#fee2e2",
                            color: item.isActive ? "#065f46" : "#991b1b",
                          }}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                        <button
                          onClick={() => setEditingItem({ ...item })}
                          style={{
                            padding: "4px 10px",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            marginRight: 5,
                            fontSize: 12,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          style={{
                            padding: "4px 10px",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Approved Tab */}
      {activeTab === "approved" && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3 style={{ marginBottom: 16 }}>✅ BM Approved Requests (Ready to Assign)</h3>
          {approvedRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <p>No approved requests pending assignment</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Request ID</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Employee</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Branch</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Items</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Approved By</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedRequests.map((req, idx) => (
                    <tr key={req._id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#3b82f6" }}>
                        {req.requestId}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 600 }}>{req.empName}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{req.empCode}</div>
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                        {req.branch || "-"}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                        {req.items?.map((i) => `${i.itemName} (${i.qty})`).join(", ")}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                        {req.bmApproval?.approvedByName || "-"}
                      </td>
                      <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                        <button
                          onClick={() => setSelectedRequest(req)}
                          style={{
                            padding: "6px 14px",
                            background: "#22c55e",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          📦 Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Tab */}
      {activeTab === "all" && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3 style={{ marginBottom: 16 }}>📋 All Asset Requests</h3>
          {allRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <p>No requests found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Request ID</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Employee</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Items</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>BM</th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {allRequests.map((req, idx) => {
                    const statusStyle = getStatusColor(req.status);
                    return (
                      <tr key={req._id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#3b82f6" }}>
                          {req.requestId}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          <div style={{ fontWeight: 600 }}>{req.empName}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{req.empCode}</div>
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
                          {req.items?.map((i) => `${i.itemName} (${i.qty})`).join(", ")}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: statusStyle.bg,
                              color: statusStyle.color,
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: 12 }}>
                          {req.bmApproval?.approvedByName || "-"}
                        </td>
                        <td style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: 12 }}>
                          {req.adminAssignment?.assignedByName || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: "95%",
            }}
          >
            <h3 style={{ marginBottom: 20 }}>✏️ Edit Item</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Name</label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Category</label>
              <input
                type="text"
                value={editingItem.category || ""}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editingItem.isActive}
                  onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleUpdateItem}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingItem(null)}
                style={{
                  padding: "12px 20px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {selectedRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: "95%",
            }}
          >
            <h3 style={{ marginBottom: 20 }}>📦 Assign Request - {selectedRequest.requestId}</h3>

            <div style={{ marginBottom: 12 }}>
              <strong>Employee:</strong> {selectedRequest.empName} ({selectedRequest.empCode})
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Branch:</strong> {selectedRequest.branch || "-"}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Items:</strong>
              <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                {selectedRequest.items?.map((item, i) => (
                  <li key={i}>
                    {item.itemName} - <b>{item.qty}</b> qty
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>BM Approved By:</strong> {selectedRequest.bmApproval?.approvedByName || "-"}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                Admin Remarks
              </label>
              <textarea
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                placeholder="Add any remarks..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleAssign}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: processing ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                ✅ Mark as Assigned
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setAssignRemarks("");
                }}
                style={{
                  padding: "12px 20px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

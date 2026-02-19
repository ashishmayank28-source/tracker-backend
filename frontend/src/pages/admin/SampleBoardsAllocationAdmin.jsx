import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function SampleBoardsAllocationAdmin({ isGuest = false }) {
  const { user, token } = useAuth();

  const [stockColumns, setStockColumns] = useState(["Opening", "Issued", "Balance"]);
  const [items, setItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  
  // ✅ History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* 🔹 Fetch Stock from Database */
  const fetchStock = async () => {
    try {
      setStockLoading(true);
      const res = await fetch(`${API_BASE}/api/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.items) {
        // ✅ Ensure Balance is calculated if not set
        const itemsWithBalance = data.items.map(item => ({
          ...item,
          Opening: item.Opening || 0,
          Issued: item.Issued || 0,
          Balance: item.Balance !== undefined ? item.Balance : (item.Opening || 0) - (item.Issued || 0),
        }));
        setItems(itemsWithBalance);
        setStockColumns(data.columns || ["Opening", "Issued", "Balance"]);
        console.log("📦 Stock loaded:", itemsWithBalance);
      }
    } catch (err) {
      console.error("Stock fetch error:", err);
    } finally {
      setStockLoading(false);
    }
  };

  /* 🔹 Fetch History for an Item */
  const fetchItemHistory = async (item) => {
    setHistoryLoading(true);
    setSelectedHistoryItem(item);
    setShowHistoryModal(true);
    
    try {
      // ✅ Fetch all assignments using correct endpoint
      const res = await fetch(`${API_BASE}/api/assignments/history/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allAssignments = await res.json();
      
      console.log("📜 All Assignments:", allAssignments);
      console.log("🔍 Looking for item:", item.name);
      
      // ✅ Filter by item name only (case insensitive) to get ALL allocations for this item
      const itemNameLower = (item.name || "").toLowerCase().trim();
      const filtered = (Array.isArray(allAssignments) ? allAssignments : []).filter(a => {
        const assignmentItem = (a.item || "").toLowerCase().trim();
        return assignmentItem === itemNameLower;
      });
      
      console.log("✅ Filtered assignments:", filtered.length, "records");
      
      // Flatten to show individual employee allocations with Assignment ID
      const history = [];
      filtered.forEach(assignment => {
        (assignment.employees || []).forEach(emp => {
          history.push({
            assignmentId: assignment.rootId || assignment._id || "-", // ✅ Assignment ID
            date: assignment.date || assignment.createdAt,
            empCode: emp.empCode,
            empName: emp.name,
            qty: emp.qty || 0,
            usedQty: emp.usedQty || 0,
            purpose: assignment.purpose || "-",
            assignedBy: assignment.assignedBy || "-",
            lrNo: assignment.lrNo || "-",
            year: assignment.year || "-",
            lot: assignment.lot || "-",
          });
        });
      });
      
      // Sort by date (newest first)
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log("📊 History data:", history.length, "employee allocations");
      setItemHistory(history);
    } catch (err) {
      console.error("Error fetching item history:", err);
      setItemHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /* 🔹 Save Stock to Database */
  const saveStock = async (newItems, newColumns) => {
    try {
      const itemsToSave = newItems || items;
      const columnsToSave = newColumns || stockColumns;
      
      console.log("💾 Saving stock:", { items: itemsToSave, columns: columnsToSave });
      
      const res = await fetch(`${API_BASE}/api/stock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: itemsToSave, columns: columnsToSave }),
      });
      const data = await res.json();
      if (data.success) {
        console.log("✅ Stock saved successfully");
        // ✅ Refresh stock from DB to ensure sync
        await fetchStock();
      } else {
        console.error("Stock save failed:", data.message);
        alert("❌ Failed to save stock: " + data.message);
      }
    } catch (err) {
      console.error("Stock save error:", err);
      alert("❌ Stock save error: " + err.message);
    }
  };

  /* 🔹 Load stock on mount */
  useEffect(() => {
    if (token) fetchStock();
  }, [token]);

  const [employees, setEmployees] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [columns, setColumns] = useState(["Qty"]);
  const [showHistory, setShowHistory] = useState(false);
  
  // ✅ NEW: Assignment Mode (Item→Employees OR Employee→Items)
  const [assignmentMode, setAssignmentMode] = useState("itemToEmp"); // "itemToEmp" or "empToItems"
  
  // 🚨 DEBUG: Log to verify component is rendering - ALWAYS RUN
  console.log("🚨🚨🚨 SampleBoardsAllocationAdmin component RENDERING NOW! 🚨🚨🚨");
  console.log("🚨 Assignment Mode state:", assignmentMode);
  const [selectedEmp, setSelectedEmp] = useState(null); // Single employee for empToItems mode
  const [selectedItems, setSelectedItems] = useState([]); // Multi items for empToItems mode
  const [itemQuantities, setItemQuantities] = useState({}); // { itemName: qty } for empToItems mode
  const [filters, setFilters] = useState({
    rootId: "",
    rmId: "",
    bmId: "",
    empCode: "",
    empName: "",
    purpose: "",
    role: "",
  });

  /* 🔹 Fetch all employees */
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${API_BASE}/api/users/all?ts=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }
    if (token) fetchUsers();
  }, [token]);

  /* 🔹 Toggle employee */
  const toggleEmployee = (emp) => {
    if (selectedEmps.find((e) => e.empCode === emp.empCode)) {
      setSelectedEmps(selectedEmps.filter((e) => e.empCode !== emp.empCode));
    } else {
      setSelectedEmps([...selectedEmps, { ...emp, qty: 0, extra: {} }]);
    }
  };

  /* ✅ NEW: Toggle item for empToItems mode */
  const toggleItem = (itemName) => {
    if (selectedItems.includes(itemName)) {
      setSelectedItems(selectedItems.filter(i => i !== itemName));
      const newQty = { ...itemQuantities };
      delete newQty[itemName];
      setItemQuantities(newQty);
    } else {
      setSelectedItems([...selectedItems, itemName]);
      setItemQuantities({ ...itemQuantities, [itemName]: 0 });
    }
  };

  /* ✅ NEW: Update item quantity for empToItems mode */
  const updateItemQty = (itemName, qty) => {
    setItemQuantities({ ...itemQuantities, [itemName]: Number(qty) || 0 });
  };

  /* 🔹 Update allocation table values */
  const updateValue = (empCode, field, value) => {
    setSelectedEmps((prev) =>
      prev.map((e) =>
        e.empCode === empCode
          ? field === "qty"
            ? { ...e, qty: Number(value) }
            : { ...e, extra: { ...e.extra, [field]: value } }
          : e
      )
    );
  };

  /* 🔹 Save assignment - Supports TWO modes */
  const handleAllot = async () => {
    if (!purpose) {
      alert("❌ Please select a purpose!");
      return;
    }

    const timestamp = Date.now();
    const createdIds = [];
    const stockUpdates = {};

    try {
      if (assignmentMode === "itemToEmp") {
        // ✅ MODE 1: Item → Multi Employees (separate IDs)
        if (!selectedItem) {
          alert("❌ Please select an item first!");
          return;
        }

        const totalQty = selectedEmps.reduce((sum, e) => sum + (e.qty || 0), 0);
        const found = items.find((i) => i.name === selectedItem);
        
        const availableStock = found ? (found.Balance || (found.Opening - (found.Issued || 0))) : 0;
        
        if (found && totalQty > availableStock) {
          alert(`❌ Not enough stock available!\n\nItem: ${selectedItem}\nAvailable: ${availableStock}\nRequested: ${totalQty}`);
          return;
        }
        
        if (totalQty === 0) {
          alert("❌ Please enter quantity for at least one employee!");
          return;
        }

        const selectedItemData = items.find(i => i.name === selectedItem);
        const itemYear = selectedItemData?.year || new Date().getFullYear().toString();
        const itemLot = selectedItemData?.lot || "Lot 1";
        
        // Create SEPARATE assignment for EACH selected employee
        for (let i = 0; i < selectedEmps.length; i++) {
          const emp = selectedEmps[i];
          const rootId = `A${timestamp}-${i + 1}`; // Unique ID for each
          
          const newAssignment = {
            rootId,
            item: selectedItem,
            year: itemYear,
            lot: itemLot,
            employees: [emp],
            purpose,
            assignedBy: user.name,
            role: "Admin",
            region: emp.region || user.region || "Unknown",
            date: new Date().toLocaleString(),
            toVendor: false,
          };

          const res = await fetch(`${API_BASE}/api/assignments/admin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newAssignment),
          });

          if (!res.ok) throw new Error(`Failed to save assignment for ${emp.name}`);
          createdIds.push(rootId);
        }

        // Update stock for this item
        stockUpdates[selectedItem] = totalQty;

      } else {
        // ✅ MODE 2: Employee → Multi Items (SAME ID for all items)
        if (!selectedEmp) {
          alert("❌ Please select an employee first!");
          return;
        }
        if (selectedItems.length === 0) {
          alert("❌ Please select at least one item!");
          return;
        }

        // Check stock availability for all items
        for (const itemName of selectedItems) {
          const qty = itemQuantities[itemName] || 0;
          if (qty <= 0) {
            alert(`❌ Please enter quantity for item: ${itemName}`);
            return;
          }
          const found = items.find((i) => i.name === itemName);
          const availableStock = found ? (found.Balance || (found.Opening - (found.Issued || 0))) : 0;
          if (found && qty > availableStock) {
            alert(`❌ Not enough stock available!\n\nItem: ${itemName}\nAvailable: ${availableStock}\nRequested: ${qty}`);
            return;
          }
        }

        // ✅ Generate SAME rootId for ALL items
        const rootId = `A${timestamp}`; // Same ID for all items

        // Create ONE assignment per item, but with SAME rootId
        for (const itemName of selectedItems) {
          const qty = itemQuantities[itemName] || 0;
          const selectedItemData = items.find(i => i.name === itemName);
          const itemYear = selectedItemData?.year || new Date().getFullYear().toString();
          const itemLot = selectedItemData?.lot || "Lot 1";

          const newAssignment = {
            rootId, // ✅ SAME ID for all items
            item: itemName,
            year: itemYear,
            lot: itemLot,
            employees: [{ ...selectedEmp, qty, extra: {} }],
            purpose,
            assignedBy: user.name,
            role: "Admin",
            region: selectedEmp.region || user.region || "Unknown",
            date: new Date().toLocaleString(),
            toVendor: false,
          };

          const res = await fetch(`${API_BASE}/api/assignments/admin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newAssignment),
          });

          if (!res.ok) throw new Error(`Failed to save assignment for item ${itemName}`);
          
          // Track stock update
          stockUpdates[itemName] = qty;
        }

        createdIds.push(rootId); // Single ID for all items
      }

      fetchHistory();

      // ✅ Update stock in DB for all affected items
      const newItems = items.map((i) => {
        if (stockUpdates[i.name]) {
          const newIssued = (i.Issued || 0) + stockUpdates[i.name];
          const newBalance = (i.Opening || 0) - newIssued;
          console.log(`📦 Stock update for ${i.name}: Issued ${i.Issued || 0} → ${newIssued}, Balance → ${newBalance}`);
          return { ...i, Issued: newIssued, Balance: newBalance };
        }
        return i;
      });
      
      await saveStock(newItems);

      // Reset form
      if (assignmentMode === "itemToEmp") {
        setSelectedEmps([]);
        setSelectedItem("");
      } else {
        setSelectedEmp(null);
        setSelectedItems([]);
        setItemQuantities({});
      }
      setPurpose("");

      const modeMsg = assignmentMode === "itemToEmp" 
        ? `${createdIds.length} separate IDs created:\n${createdIds.join("\n")}`
        : `✅ Single Assignment ID: ${createdIds[0]}\nAll ${selectedItems.length} items share this ID for LR update convenience.`;
      
      alert(`✅ Stock assigned!\n${modeMsg}`);
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Failed to save assignment in DB!");
    }
  };

/* 🔹 Fetch history */
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/history/admin?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch admin history");
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History fetch error:", err);
      setAssignments([]);
    }
  };

  /* 🔹 Submit to vendor */
  const handleSubmitToVendor = async (rootId, purpose) => {
  const lowerPurpose = (purpose || "").toLowerCase();

  // ✅ Allow both "project" and "marketing"
  if (!lowerPurpose.includes("project") && !lowerPurpose.includes("marketing")) {
    return alert("❌ Only Project/Marketing assignments allowed");
  }

  try {
    const res = await fetch(`${API_BASE}/api/assignments/dispatch/${rootId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert("✅ Sent to Vendor Successfully!");
      fetchHistory(); // refresh table
    } else {
      alert(data.message || "❌ Failed to send to Vendor");
    }
  } catch (err) {
    console.error("Dispatch error:", err);
    alert("❌ Dispatch request failed");
  }
};

  /* 🔹 LR Update (Admin can also edit) */
  async function handleLRUpdate(rootId, lrNo) {
    if (!lrNo.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/assignments/lr/${rootId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lrNo }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ LR No. Updated Successfully");
        fetchHistory();
      }
    } catch (err) {
      console.error("LR update error:", err);
    }
  }

  /* 🔹 POD Update for Employee visibility */
  async function handlePODUpdate(rootId) {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/pod/${rootId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ POD Updated! Now visible to employees.");
        fetchHistory();
      } else {
        alert(data.message || "❌ Failed to update POD");
      }
    } catch (err) {
      console.error("POD update error:", err);
      alert("❌ Failed to update POD");
    }
  }
  /* 🔹 Stock table column control */
  const removeStockColumn = (col) => {
    if (["Opening", "Issued", "Balance"].includes(col)) {
      alert("❌ Cannot remove core columns");
      return;
    }
    const newColumns = stockColumns.filter((c) => c !== col);
    setStockColumns(newColumns);
    saveStock(items, newColumns);
  };

  /* 🔹 Filtered assignments */
  const filteredAssignments = assignments.filter((a) => {
    return (
      (!filters.rootId || (a.rootId || "").toLowerCase().includes(filters.rootId.toLowerCase())) &&
      (!filters.rmId || (a.rmId || "").toLowerCase().includes(filters.rmId.toLowerCase())) &&
      (!filters.bmId || (a.bmId || "").toLowerCase().includes(filters.bmId.toLowerCase())) &&
      (!filters.empCode ||
        (a.employees || []).some((e) =>
          (e.empCode || "").toLowerCase().includes(filters.empCode.toLowerCase())
        )) &&
      (!filters.empName ||
        (a.employees || []).some((e) =>
          (e.name || "").toLowerCase().includes(filters.empName.toLowerCase())
        )) &&
      (!filters.purpose || (a.purpose || "").toLowerCase().includes(filters.purpose.toLowerCase())) &&
      (!filters.role || (a.role || "").toLowerCase().includes(filters.role.toLowerCase()))
    );
  });

  // 🚨 DEBUG: Log right before return
  console.log("🚨 About to render JSX, assignmentMode =", assignmentMode);
  console.log("🚨 Toggle should be visible with z-index 9999");

  return (
    <div style={{ padding: 20 }}>
      {/* 🚨🚨🚨 ASSIGNMENT MODE TOGGLE - MUST BE VISIBLE 🚨🚨🚨 */}
      <div 
        id="assignment-mode-toggle"
        style={{ 
          marginBottom: 30, 
          marginTop: 0,
          padding: 30, 
          background: "#0ea5e9",
          borderRadius: 12, 
          border: "5px solid #0284c7",
          boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
          position: "relative",
          zIndex: 99999,
          width: "100%",
          boxSizing: "border-box",
          minHeight: "150px"
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 15, textAlign: "center" }}>
          📋 ASSIGNMENT MODE SELECTION
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 15, flexWrap: "wrap", justifyContent: "center" }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              cursor: "pointer",
              padding: "16px 20px",
              background: assignmentMode === "itemToEmp" ? "#ffffff" : "rgba(255,255,255,0.2)",
              borderRadius: 10,
              border: assignmentMode === "itemToEmp" ? "3px solid #ffffff" : "3px solid rgba(255,255,255,0.5)",
              transition: "all 0.2s",
              minWidth: 280,
              flex: "1 1 300px"
            }}>
              <input
                type="radio"
                name="assignmentMode"
                value="itemToEmp"
                checked={assignmentMode === "itemToEmp"}
                onChange={(e) => {
                  setAssignmentMode(e.target.value);
                  setSelectedEmps([]);
                  setSelectedItem("");
                  setSelectedEmp(null);
                  setSelectedItems([]);
                  setItemQuantities({});
                }}
                style={{ width: 22, height: 22, cursor: "pointer", accentColor: "#0ea5e9" }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: assignmentMode === "itemToEmp" ? "#0ea5e9" : "white" }}>
                  📦 Item → Multi Employees
                </div>
                <div style={{ fontSize: 13, color: assignmentMode === "itemToEmp" ? "#64748b" : "rgba(255,255,255,0.9)", marginTop: 4 }}>
                  (Separate Assignment ID per employee)
                </div>
              </div>
            </label>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              cursor: "pointer",
              padding: "16px 20px",
              background: assignmentMode === "empToItems" ? "#ffffff" : "rgba(255,255,255,0.2)",
              borderRadius: 10,
              border: assignmentMode === "empToItems" ? "3px solid #ffffff" : "3px solid rgba(255,255,255,0.5)",
              transition: "all 0.2s",
              minWidth: 280,
              flex: "1 1 300px"
            }}>
              <input
                type="radio"
                name="assignmentMode"
                value="empToItems"
                checked={assignmentMode === "empToItems"}
                onChange={(e) => {
                  setAssignmentMode(e.target.value);
                  setSelectedEmps([]);
                  setSelectedItem("");
                  setSelectedEmp(null);
                  setSelectedItems([]);
                  setItemQuantities({});
                }}
                style={{ width: 22, height: 22, cursor: "pointer", accentColor: "#0ea5e9" }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: assignmentMode === "empToItems" ? "#0ea5e9" : "white" }}>
                  👤 Employee → Multi Items
                </div>
                <div style={{ fontSize: 13, color: assignmentMode === "empToItems" ? "#64748b" : "rgba(255,255,255,0.9)", marginTop: 4 }}>
                  (Same Assignment ID for all items - LR update convenience)
                </div>
              </div>
            </label>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, marginTop: 20 }}>
        <h2 style={{ margin: 0 }}>📦 Sample Allocation (Admin)</h2>
        <button
          onClick={fetchHistory}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* 🔹 Main Stock Table - Year & Lot Wise */}
      <h3>📊 Main Stock Table</h3>
      {stockLoading ? (
        <p>Loading stock...</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="6" style={{ width: "100%", marginBottom: 20, borderCollapse: "collapse" }}>
              <thead style={{ background: "#f5f5f5" }}>
                <tr>
                  <th style={{ minWidth: 120 }}>Item</th>
                  <th style={{ minWidth: 80, background: "#e3f2fd" }}>Year</th>
                  <th style={{ minWidth: 80, background: "#fff3e0" }}>Lot</th>
                  {stockColumns.map((col) => (
                    <th key={col} style={{ minWidth: 80 }}>
                      {col}
                      {/* ✅ Hide column delete for Guest */}
                      {!isGuest && !["Opening", "Issued", "Balance"].includes(col) && (
                        <button onClick={() => removeStockColumn(col)} style={{ marginLeft: 5, color: "red", fontSize: 10 }}>
                          ✕
                        </button>
                      )}
                    </th>
                  ))}
                  <th>History</th>
                  {/* ✅ Hide Action column for Guest */}
                  {!isGuest && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it._id || idx}>
                    <td>
                      {isGuest ? (
                        <span style={{ padding: 4 }}>{it.name || ""}</span>
                      ) : (
                        <input
                          type="text"
                          value={it.name || ""}
                          onChange={(e) => {
                            const newItems = items.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p));
                            setItems(newItems);
                          }}
                          onBlur={() => saveStock()}
                          style={{ width: "100%", border: "1px solid #ddd", padding: 4 }}
                        />
                      )}
                    </td>
                    <td style={{ background: "#e3f2fd" }}>
                      {isGuest ? (
                        <span style={{ padding: 4 }}>{it.year || "2025"}</span>
                      ) : (
                        <select
                          value={it.year || "2025"}
                          onChange={(e) => {
                            const newItems = items.map((p, i) => (i === idx ? { ...p, year: e.target.value } : p));
                            setItems(newItems);
                            saveStock(newItems);
                          }}
                          style={{ width: "100%", padding: 4 }}
                        >
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                        </select>
                      )}
                    </td>
                    <td style={{ background: "#fff3e0" }}>
                      {isGuest ? (
                        <span style={{ padding: 4 }}>{it.lot || "Lot 1"}</span>
                      ) : (
                        <select
                          value={it.lot || "Lot 1"}
                          onChange={(e) => {
                            const newItems = items.map((p, i) => (i === idx ? { ...p, lot: e.target.value } : p));
                            setItems(newItems);
                            saveStock(newItems);
                          }}
                          style={{ width: "100%", padding: 4 }}
                        >
                          <option value="Lot 1">Lot 1</option>
                          <option value="Lot 2">Lot 2</option>
                          <option value="Lot 3">Lot 3</option>
                          <option value="Lot 4">Lot 4</option>
                          <option value="Lot 5">Lot 5</option>
                        </select>
                      )}
                    </td>
                    {stockColumns.map((col) => (
                      <td key={col}>
                        {isGuest ? (
                          <span style={{ padding: 4 }}>{it[col] || 0}</span>
                        ) : (
                          <input
                            type="number"
                            value={it[col] || 0}
                            disabled={col === "Balance"} // Balance is auto-calculated
                            onChange={(e) => {
                              const newVal = Number(e.target.value);
                              const newItems = items.map((p, i) => {
                                if (i !== idx) return p;
                                const updated = { ...p, [col]: newVal };
                                // ✅ Auto-calculate Balance when Opening or Issued changes
                                if (col === "Opening" || col === "Issued") {
                                  updated.Balance = (updated.Opening || 0) - (updated.Issued || 0);
                                }
                                return updated;
                              });
                              setItems(newItems);
                            }}
                            onBlur={() => saveStock()}
                            style={{ width: 70, padding: 4, border: "1px solid #ddd" }}
                          />
                        )}
                      </td>
                    ))}
                    {/* 📜 History Button */}
                    <td>
                      <button 
                        onClick={() => fetchItemHistory(it)}
                        style={{ 
                          background: "#8b5cf6", 
                          color: "white", 
                          border: "none", 
                          padding: "4px 10px", 
                          borderRadius: 4, 
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        📜 History
                      </button>
                    </td>
                    {/* ✅ Hide Remove button for Guest */}
                    {!isGuest && (
                      <td>
                        <button 
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== idx);
                            setItems(newItems);
                            saveStock(newItems);
                          }} 
                          style={{ color: "red", background: "#fee2e2", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}
                        >
                          ❌ Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* ✅ Hide edit buttons for Guest users */}
            {!isGuest && (
              <>
                <button 
                  onClick={() => {
                    const newCol = prompt("Enter new stock column name:");
                    if (newCol && !stockColumns.includes(newCol)) {
                      const newColumns = [...stockColumns, newCol];
                      setStockColumns(newColumns);
                      const newItems = items.map((i) => ({ ...i, [newCol]: 0 }));
                      setItems(newItems);
                      saveStock(newItems, newColumns);
                    }
                  }}
                  style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}
                >
                  ➕ Add Column
                </button>
                <button 
                  onClick={() => {
                    const newName = prompt("Enter new item name:");
                    if (newName) {
                      const newItems = [...items, { name: newName, year: "2025", lot: "Lot 1", Opening: 0, Issued: 0, Balance: 0 }];
                      setItems(newItems);
                      saveStock(newItems);
                    }
                  }} 
                  style={{ background: "#10b981", color: "white", border: "none", padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}
                >
                  ➕ Add Item
                </button>
                {/* ✅ NEW: Add New Lot Button */}
                <button 
                  onClick={() => {
                    const year = prompt("Enter Year (e.g., 2025):", new Date().getFullYear().toString());
                    if (!year) return;
                    
                    const lotNumber = prompt("Enter Lot Number (1-5):", "2");
                    if (!lotNumber) return;
                    
                    const lotName = `Lot ${lotNumber}`;
                    const itemName = prompt("Enter Item Name for this lot:");
                    if (!itemName) return;
                    
                    const opening = prompt("Enter Opening Stock:", "0");
                    
                    const newItems = [...items, { 
                      name: itemName, 
                      year: year, 
                      lot: lotName, 
                      Opening: Number(opening) || 0, 
                      Issued: 0, 
                      Balance: Number(opening) || 0 
                    }];
                    setItems(newItems);
                    saveStock(newItems);
                    alert(`✅ New lot added: ${itemName} (${year} - ${lotName})`);
                  }} 
                  style={{ background: "#8b5cf6", color: "white", border: "none", padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}
                >
                  📦 Add New Lot
                </button>
                <button 
                  onClick={() => saveStock()}
                  style={{ background: "#f59e0b", color: "white", border: "none", padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}
                >
                  💾 Save Changes
                </button>
              </>
            )}
            <button 
              onClick={fetchStock}
              style={{ background: "#6b7280", color: "white", border: "none", padding: "8px 12px", borderRadius: 4, cursor: "pointer" }}
            >
              🔄 Refresh Stock
            </button>
          </div>
        </>
      )}

      {/* 🔹 Assign To - Region-wise Hierarchy (RM removed - Admin → BM → Manager → Emp) */}
      {/* ✅ Hide for Guest users */}
      {!isGuest && (
        <div style={{ marginTop: 30 }}>
          {assignmentMode === "itemToEmp" ? (
            <>
              <b>Assign To:</b>
              <p style={{ fontSize: 12, color: "#666", margin: "5px 0" }}>
                ℹ️ Flow: Admin → BM → Manager → Employee
              </p>
            </>
          ) : (
            <>
              <b>Select Employee:</b>
              <p style={{ fontSize: 12, color: "#666", margin: "5px 0" }}>
                ℹ️ Select one employee, then select multiple items. All items will share the same Assignment ID.
              </p>
              <select
                value={selectedEmp?.empCode || ""}
                onChange={(e) => {
                  const emp = employees.find(em => em.empCode === e.target.value);
                  setSelectedEmp(emp || null);
                  setSelectedItems([]);
                  setItemQuantities({});
                }}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", minWidth: 300, marginTop: 10 }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.empCode} value={emp.empCode}>
                    {emp.name} ({emp.empCode}) - {emp.role || "Employee"}
                  </option>
                ))}
              </select>
            </>
          )}
          {/* ✅ Employee multi-select (only for itemToEmp mode) */}
          {assignmentMode === "itemToEmp" && (() => {
            // Group employees by region, then by role (excluding RM)
            const grouped = employees.reduce((acc, emp) => {
              const region = emp.region || "Unknown Region";
              if (!acc[region]) acc[region] = { BM: [], Manager: [], Employee: [] };
              const role = emp.role || "Employee";
              // ❌ Skip Regional Managers - RM layer removed
              if (role.includes("Regional")) return acc;
              else if (role.includes("Branch")) acc[region].BM.push(emp);
              else if (role === "Manager") acc[region].Manager.push(emp);
              else acc[region].Employee.push(emp);
              return acc;
            }, {});

            return Object.entries(grouped).map(([region, roles]) => (
              <div key={region} style={{ marginTop: 15, border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#1976d2" }}>🌍 {region}</h4>

                {/* Branch Managers */}
                {roles.BM.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <b style={{ color: "#ff9800" }}>Branch Managers:</b>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {roles.BM.map((emp) => (
                        <label key={emp.empCode} style={{ border: "1px solid #ff9800", borderRadius: 4, padding: "3px 6px", fontSize: 12, background: selectedEmps.find(e => e.empCode === emp.empCode) ? "#ffe0b2" : "white" }}>
                          <input type="checkbox" checked={!!selectedEmps.find((e) => e.empCode === emp.empCode)} onChange={() => toggleEmployee(emp)} />{" "}
                          {emp.name} ({emp.empCode})
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Managers */}
                {roles.Manager.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <b style={{ color: "#4caf50" }}>Managers:</b>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {roles.Manager.map((emp) => (
                        <label key={emp.empCode} style={{ border: "1px solid #4caf50", borderRadius: 4, padding: "3px 6px", fontSize: 12, background: selectedEmps.find(e => e.empCode === emp.empCode) ? "#c8e6c9" : "white" }}>
                          <input type="checkbox" checked={!!selectedEmps.find((e) => e.empCode === emp.empCode)} onChange={() => toggleEmployee(emp)} />{" "}
                          {emp.name} ({emp.empCode})
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employees */}
                {roles.Employee.length > 0 && (
                  <div>
                    <b style={{ color: "#2196f3" }}>Employees:</b>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {roles.Employee.map((emp) => (
                        <label key={emp.empCode} style={{ border: "1px solid #2196f3", borderRadius: 4, padding: "3px 6px", fontSize: 12, background: selectedEmps.find(e => e.empCode === emp.empCode) ? "#bbdefb" : "white" }}>
                          <input type="checkbox" checked={!!selectedEmps.find((e) => e.empCode === emp.empCode)} onChange={() => toggleEmployee(emp)} />{" "}
                          {emp.name} ({emp.empCode})
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ✅ NEW: Employee → Items Mode: Item Selection */}
      {!isGuest && assignmentMode === "empToItems" && selectedEmp && (
        <div style={{ marginTop: 20, padding: 15, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <b style={{ fontSize: 14 }}>Select Items (Multi-select):</b>
          <p style={{ fontSize: 12, color: "#666", margin: "5px 0" }}>
            ✅ All selected items will share the same Assignment ID: <code style={{ background: "#e0e7ff", padding: "2px 6px", borderRadius: 3 }}>A{Date.now()}</code>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {items.map((item) => (
              <label
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  border: selectedItems.includes(item.name) ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  borderRadius: 6,
                  background: selectedItems.includes(item.name) ? "#dbeafe" : "white",
                  cursor: "pointer",
                  minWidth: 200,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.name)}
                  onChange={() => toggleItem(item.name)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Year: {item.year} | Lot: {item.lot} | Balance: {item.Balance || (item.Opening - (item.Issued || 0))}
                  </div>
                </div>
                {selectedItems.includes(item.name) && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={itemQuantities[item.name] || ""}
                    onChange={(e) => updateItemQty(item.name, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 60,
                      padding: "4px 6px",
                      border: "1px solid #3b82f6",
                      borderRadius: 4,
                      textAlign: "center",
                    }}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 🔹 Allocation Table - Mode 1: Item → Employees */}
      {assignmentMode === "itemToEmp" && selectedEmps.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Allocate Stock</h3>
          <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
            <option value="">-- Select Item --</option>
            {items.map((it) => (
              <option key={it.name} value={it.name}>
                {it.name}
              </option>
            ))}
          </select>

          <table border="1" cellPadding="6" style={{ width: "100%", marginTop: 15 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Emp Code</th>
                <th>Name</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedEmps.map((emp) => (
                <tr key={emp.empCode}>
                  <td>{selectedItem}</td>
                  <td>{emp.empCode}</td>
                  <td>{emp.name}</td>
                  {columns.map((col) => (
                    <td key={col}>
                      <input
                        type={col === "Qty" ? "number" : "text"}
                        value={col === "Qty" ? emp.qty || "" : emp.extra?.[col] || ""}
                        onChange={(e) =>
                          updateValue(emp.empCode, col === "Qty" ? "qty" : col, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 10 }}>
            <button onClick={() => setColumns([...columns, "Extra" + Date.now()])}>➕ Add Column</button>
          </div>
        </>
      )}

      {/* ✅ NEW: Allocation Table - Mode 2: Employee → Items */}
      {assignmentMode === "empToItems" && selectedEmp && selectedItems.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Allocation Summary</h3>
          <div style={{ padding: 15, background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac", marginBottom: 15 }}>
            <div style={{ fontWeight: 600, color: "#166534" }}>
              👤 Employee: <span style={{ color: "#0ea5e9" }}>{selectedEmp.name} ({selectedEmp.empCode})</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>
              ✅ All items below will share the same Assignment ID for LR update convenience
            </div>
          </div>
          <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f5f5f5" }}>
              <tr>
                <th>Item Name</th>
                <th>Year</th>
                <th>Lot</th>
                <th>Available Stock</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((itemName) => {
                const item = items.find(i => i.name === itemName);
                const availableStock = item ? (item.Balance || (item.Opening - (item.Issued || 0))) : 0;
                return (
                  <tr key={itemName}>
                    <td style={{ fontWeight: 600 }}>{itemName}</td>
                    <td>{item?.year || "-"}</td>
                    <td>{item?.lot || "-"}</td>
                    <td style={{ color: availableStock > 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {availableStock}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max={availableStock}
                        value={itemQuantities[itemName] || ""}
                        onChange={(e) => updateItemQty(itemName, e.target.value)}
                        style={{ width: 80, padding: "6px", border: "1px solid #ddd", borderRadius: 4 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

          {/* Purpose Selection - Show for both modes */}
          {((assignmentMode === "itemToEmp" && selectedEmps.length > 0) || 
            (assignmentMode === "empToItems" && selectedEmp && selectedItems.length > 0)) && (
            <div style={{ marginTop: 15 }}>
              <label>
                <b>Purpose:</b>{" "}
                {(() => {
                  if (assignmentMode === "itemToEmp") {
                    // Auto-detect purpose based on selected employee roles (RM removed)
                    const hasBM = selectedEmps.some(e => (e.role || "").includes("Branch"));
                    const hasOnlyBM = selectedEmps.every(e => (e.role || "").includes("Branch"));
                    
                    // If only BM selected → Team Bifurcation
                    // If Emp/Manager selected → Project/Marketing
                    const autoPurpose = hasOnlyBM && hasBM ? "Team Bifurcation" : "Project/Marketing";
                    
                    // Auto-set purpose if not manually changed
                    if (!purpose && autoPurpose) {
                      setTimeout(() => setPurpose(autoPurpose), 0);
                    }
                  } else {
                    // For empToItems mode, default to Project/Marketing
                    if (!purpose) {
                      setTimeout(() => setPurpose("Project/Marketing"), 0);
                    }
                  }
                  
                  return (
                    <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                      <option value="">-- Select Purpose --</option>
                      <option value="Team Bifurcation">Team Bifurcation (for BM)</option>
                      <option value="Project/Marketing">Project/Marketing (for Emp/Manager)</option>
                    </select>
                  );
                })()}
              </label>
              <span style={{ marginLeft: 10, fontSize: 12, color: "#666" }}>
                {purpose === "Project/Marketing" && "✅ Will have 'Submit to Vendor' option"}
                {purpose === "Team Bifurcation" && "ℹ️ BM will further distribute to Manager/Emp"}
              </span>
            </div>
          )}

          {/* Allot Button - Show for both modes */}
          {((assignmentMode === "itemToEmp" && selectedEmps.length > 0 && selectedItem) || 
            (assignmentMode === "empToItems" && selectedEmp && selectedItems.length > 0)) && (
            <button
              onClick={handleAllot}
              style={{
                marginTop: 15,
                background: "#4caf50",
                color: "white",
                padding: "10px 20px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
            >
              ✅ {assignmentMode === "itemToEmp" ? "Allot Stock" : "Allot Stock (Same ID for All Items)"}
            </button>
          )}
        </>
      )}

      {/* 🔹 Assignment History */}
{showHistory && (
  <div style={{ marginTop: 30 }}>
    <h3>📑 Assignment History</h3>

    {/* Filters - RM ID removed */}
    <div style={{ marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input 
        type="text" 
        placeholder="Filter by Root ID" 
        value={filters.rootId}
        onChange={(e) => setFilters((p) => ({ ...p, rootId: e.target.value }))} 
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}
      />
      <input 
        type="text" 
        placeholder="Filter by BM ID" 
        value={filters.bmId}
        onChange={(e) => setFilters((p) => ({ ...p, bmId: e.target.value }))} 
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}
      />
      <input 
        type="text" 
        placeholder="Filter by Emp Code" 
        value={filters.empCode}
        onChange={(e) => setFilters((p) => ({ ...p, empCode: e.target.value }))} 
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}
      />
      <input 
        type="text" 
        placeholder="Filter by Emp Name" 
        value={filters.empName}
        onChange={(e) => setFilters((p) => ({ ...p, empName: e.target.value }))} 
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}
      />
      <input 
        type="text" 
        placeholder="Filter by Purpose" 
        value={filters.purpose}
        onChange={(e) => setFilters((p) => ({ ...p, purpose: e.target.value }))} 
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}
      />
      <input 
        type="text" 
        placeholder="Filter by Role" 
        value={filters.role}
        onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))} 
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #d1d5db" }}
      />
      <button
        onClick={() => setFilters({ rootId: "", rmId: "", bmId: "", empCode: "", empName: "", purpose: "", role: "" })}
        style={{
          padding: "6px 14px",
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        🔄 Reset Filters
      </button>
    </div>

    {/* Scrollable Table Container */}
    <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
    {/* RM ID column & duplicate LR column removed */}
    <table border="1" cellPadding="6" style={{ minWidth: "1000px", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>Root ID</th>
          <th>BM ID</th>
          <th>Date</th>
          <th>Emp Code</th>
          <th>Emp Name</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Purpose</th>
          <th>Assigned By</th>
          <th>Role</th>
          <th>To Dispatch</th>
          <th>LR No. (Update)</th>
          <th>POD to Emp</th>
        </tr>
      </thead>
      <tbody>
  {filteredAssignments.map((a) =>
    (a.employees || []).map((emp, j) => (
      <tr
        key={`${a._id}-${j}`}
        style={{
          backgroundColor: a.toVendor ? "#e6ffe6" : "white", // ✅ green after sent
        }}
      >
        <td>{a.rootId}</td>
        <td>{a.bmId || "-"}</td>
        <td>{a.date}</td>
        <td>{emp.empCode}</td>
        <td>{emp.name}</td>
        <td>{a.item}</td>
        <td>{emp.qty || "-"}</td>
        <td>{a.purpose}</td>
        <td>{a.assignedBy}</td>
        <td>{a.role}</td>

        {/* ✅ Submit to Vendor - Use bmId if exists, otherwise rootId */}
        <td>
          {(a.purpose || "").toLowerCase().includes("project") ||
           (a.purpose || "").toLowerCase().includes("marketing") ? (
            a.toVendor ? (
              "✅ Sent"
            ) : (
              <button
                onClick={() =>
                  handleSubmitToVendor(a.bmId || a.rootId, a.purpose)
                }
                style={{
                  background: "#00ccff",
                  color: "white",
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Submit
              </button>
            )
          ) : (
            "-"
          )}
        </td>

        {/* ✅ LR No. - Combined display & update */}
        <td>
          {a.lrNo ? (
            <span style={{ color: "green", fontWeight: "bold" }}>{a.lrNo}</span>
          ) : (
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="LR No"
                style={{ width: "70px", padding: "4px", fontSize: 12 }}
                id={`lr-${a.bmId || a.rootId}`}
              />
              <button
                onClick={() => {
                  const updateId = a.bmId || a.rootId;
                  const val = document.getElementById(`lr-${updateId}`).value;
                  if (!val.trim()) return alert("Please enter LR No. first");
                  handleLRUpdate(updateId, val);
                }}
                style={{
                  background: "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 6px",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Save
              </button>
            </div>
          )}
        </td>
              {/* ✅ POD Update Button */}
              <td>
                {a.lrNo ? (
                  a.podUpdatedForEmp ? (
                    <span style={{ color: "green", fontWeight: "bold" }}>✅ Sent</span>
                  ) : (
                    <button
                      onClick={() => handlePODUpdate(a.rootId)}
                      style={{
                        background: "#8b5cf6",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Send to Emp
                    </button>
                  )
                ) : (
                  <span style={{ color: "#9ca3af" }}>-</span>
                )}
              </td>
      </tr>
    ))
  )}
</tbody>
    </table>
    </div> {/* End scrollable wrapper */}
  </div>
)}
      <button
        onClick={() => {
          if (!showHistory) fetchHistory();
          setShowHistory(!showHistory);
        }}
        style={{ marginTop: 20, background: "#2196f3", color: "white", padding: "6px 12px", borderRadius: 4 }}
      >
        📑 History
      </button>

      {/* 📜 Item History Modal */}
      {showHistoryModal && selectedHistoryItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
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
              maxWidth: 1200,
              width: "98%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: 15,
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#1e293b" }}>
                  📜 Issue History - {selectedHistoryItem.name}
                </h3>
                <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748b" }}>
                  Year: <b>{selectedHistoryItem.year}</b> | Lot: <b>{selectedHistoryItem.lot}</b> | 
                  Opening: <b style={{ color: "#3b82f6" }}>{selectedHistoryItem.Opening}</b> | 
                  Issued: <b style={{ color: "#f59e0b" }}>{selectedHistoryItem.Issued}</b> | 
                  Balance: <b style={{ color: "#22c55e" }}>{selectedHistoryItem.Balance}</b>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryItem(null);
                  setItemHistory([]);
                }}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✕ Close
              </button>
            </div>

            {historyLoading ? (
              <p style={{ textAlign: "center", padding: 40 }}>Loading history...</p>
            ) : itemHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
                <p>No issue history found for this item.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 15, fontSize: 14, color: "#475569" }}>
                  Total <b>{itemHistory.length}</b> allocations | 
                  Total Qty: <b style={{ color: "#f59e0b" }}>{itemHistory.reduce((sum, h) => sum + (h.qty || 0), 0)}</b>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#8b5cf6", color: "white" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Assignment ID</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Emp Code</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Employee Name</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Qty Issued</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Used</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Purpose</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Assigned By</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>LR No.</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Year</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Lot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemHistory.map((h, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 11, color: "#6366f1" }}>
                          {h.assignmentId}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {h.date ? new Date(h.date).toLocaleDateString() : "-"}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#3b82f6" }}>
                          {h.empCode}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {h.empName}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600, color: "#f59e0b" }}>
                          {h.qty}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", textAlign: "center", color: "#22c55e" }}>
                          {h.usedQty || 0}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {h.purpose}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {h.assignedBy}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                          {h.lrNo || "-"}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                          {h.year}
                        </td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                          {h.lot}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

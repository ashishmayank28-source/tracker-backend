import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function SampleBoardsAllocationAdmin() {
  const { user, token } = useAuth();

  const [stockColumns, setStockColumns] = useState(["Opening", "Issued", "Balance"]);
  const [items, setItems] = useState([
    { name: "Blenze Pro PDB", Opening: 500, Issued: 0, Balance: 500 },
    { name: "Impact PDB", Opening: 600, Issued: 0, Balance: 600 },
    { name: "Horizon PDB", Opening: 400, Issued: 0, Balance: 400 },
    { name: "Evo PDB", Opening: 350, Issued: 0, Balance: 350 },
    { name: "Orna PDB", Opening: 500, Issued: 0, Balance: 500 },
  ]);

  const [employees, setEmployees] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [columns, setColumns] = useState(["Qty"]);
  const [showHistory, setShowHistory] = useState(false);
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

  /* 🔹 Save assignment - Generate SEPARATE ID for EACH employee */
  const handleAllot = async () => {
    if (!selectedItem) {
      alert("❌ Please select an item first!");
      return;
    }
    if (!purpose) {
      alert("❌ Please select a purpose!");
      return;
    }

    const totalQty = selectedEmps.reduce((sum, e) => sum + (e.qty || 0), 0);
    const found = items.find((i) => i.name === selectedItem);
    if (found && totalQty > found.Balance) {
      alert("❌ Not enough stock available!");
      return;
    }

    const timestamp = Date.now();
    const createdIds = [];

    try {
      // Create SEPARATE assignment for EACH selected employee
      for (let i = 0; i < selectedEmps.length; i++) {
        const emp = selectedEmps[i];
        const rootId = `A${timestamp}-${i + 1}`; // Unique ID for each
        
        const newAssignment = {
          rootId,
          item: selectedItem,
          employees: [emp], // Single employee per assignment
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

      fetchHistory();

      setItems((prev) =>
        prev.map((i) =>
          i.name === selectedItem
            ? { ...i, Issued: i.Issued + totalQty, Balance: i.Balance - totalQty }
            : i
        )
      );

      setSelectedEmps([]);
      setPurpose("");
      alert(`✅ Stock assigned!\n${createdIds.length} separate IDs created:\n${createdIds.join("\n")}`);
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
  /* 🔹 Stock table row/col controls */
  const addStockRow = () => {
    const newName = prompt("Enter new item name:");
    if (newName) {
      setItems([...items, { name: newName, Opening: 0, Issued: 0, Balance: 0 }]);
    }
  };
  const removeStockRow = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };
  const addStockColumn = () => {
    const newCol = prompt("Enter new stock column name:");
    if (newCol && !stockColumns.includes(newCol)) {
      setStockColumns([...stockColumns, newCol]);
      setItems((prev) => prev.map((i) => ({ ...i, [newCol]: 0 })));
    }
  };
  const removeStockColumn = (col) => {
    if (["Opening", "Issued", "Balance"].includes(col)) {
      alert("❌ Cannot remove core columns");
      return;
    }
    setStockColumns(stockColumns.filter((c) => c !== col));
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

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
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

      {/* 🔹 Main Stock Table */}
      <h3>📊 Main Stock Table</h3>
      <table border="1" cellPadding="6" style={{ width: "100%", marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Item</th>
            {stockColumns.map((col) => (
              <th key={col}>
                {col}
                {!["Opening", "Issued", "Balance"].includes(col) && (
                  <button onClick={() => removeStockColumn(col)} style={{ marginLeft: 5, color: "red" }}>
                    ❌
                  </button>
                )}
              </th>
            ))}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td>{it.name}</td>
              {stockColumns.map((col) => (
                <td key={col}>
                  <input
                    type="number"
                    value={it[col] || 0}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, [col]: Number(e.target.value) } : p))
                      )
                    }
                  />
                </td>
              ))}
              <td>
                <button onClick={() => removeStockRow(idx)} style={{ color: "red" }}>
                  ❌ Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addStockColumn}>➕ Add Column</button>
      <button onClick={addStockRow} style={{ marginLeft: 10 }}>
        ➕ Add Row
      </button>

      {/* 🔹 Assign To - Region-wise Hierarchy (RM removed - Admin → BM → Manager → Emp) */}
      <div style={{ marginTop: 30 }}>
        <b>Assign To:</b>
        <p style={{ fontSize: 12, color: "#666", margin: "5px 0" }}>
          ℹ️ Flow: Admin → BM → Manager → Employee
        </p>
        {(() => {
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

      {/* 🔹 Allocation Table */}
      {selectedEmps.length > 0 && (
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

          <div style={{ marginTop: 15 }}>
            <label>
              <b>Purpose:</b>{" "}
              {(() => {
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

          <button
            onClick={handleAllot}
            style={{
              marginTop: 15,
              background: "#4caf50",
              color: "white",
              padding: "6px 12px",
              borderRadius: 4,
            }}
          >
            ✅ Allot Stock
          </button>
        </>
      )}

      {/* 🔹 Assignment History */}
{showHistory && (
  <div style={{ marginTop: 30 }}>
    <h3>📑 Assignment History</h3>

    {/* Filters - RM ID removed */}
    <div style={{ marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
      <input type="text" placeholder="Filter by Root ID" onChange={(e) => setFilters((p) => ({ ...p, rootId: e.target.value }))} />
      <input type="text" placeholder="Filter by BM ID" onChange={(e) => setFilters((p) => ({ ...p, bmId: e.target.value }))} />
      <input type="text" placeholder="Filter by Emp Code" onChange={(e) => setFilters((p) => ({ ...p, empCode: e.target.value }))} />
      <input type="text" placeholder="Filter by Emp Name" onChange={(e) => setFilters((p) => ({ ...p, empName: e.target.value }))} />
      <input type="text" placeholder="Filter by Purpose" onChange={(e) => setFilters((p) => ({ ...p, purpose: e.target.value }))} />
      <input type="text" placeholder="Filter by Role" onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))} />
    </div>

    {/* Scrollable Table Container */}
    <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
    {/* RM ID column removed from table */}
    <table border="1" cellPadding="6" style={{ minWidth: "1100px", borderCollapse: "collapse" }}>
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
          <th>Received from Vendor LR No.</th>
          <th>To update LR details</th>
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

        {/* ✅ Submit to Vendor (now allowed for ANY project/marketing purpose) */}
        <td>
          {(a.purpose || "").toLowerCase().includes("project") ||
           (a.purpose || "").toLowerCase().includes("marketing") ? (
            a.toVendor ? (
              "✅ Sent"
            ) : (
              <button
                onClick={() =>
                  handleSubmitToVendor(a.rootId, a.purpose)
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

        {/* ✅ LR Details */}
        <td>{a.lrNo || ""}</td>
        <td>{a.lrNo || "-"}</td>
              <td>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Enter LR No"
                    style={{ width: "80px" }}
                    id={`lr-${a.rootId}`}
                  />
                  <button
                    onClick={() => {
                      const val = document.getElementById(`lr-${a.rootId}`).value;
                      if (!val.trim()) return alert("Please enter LR No. first");
                      handleLRUpdate(a.rootId, val);
                    }}
                    style={{
                      background: "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Update
                  </button>
                </div>
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
    </div>
  );
}

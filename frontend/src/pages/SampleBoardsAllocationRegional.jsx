import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";
const safeNum = (v) => (isNaN(v) || v == null ? 0 : Number(v));

export default function SampleBoardsAllocationRegional() {
  const { user, token } = useAuth();

  const [items, setItems] = useState([]);          // Stock summary
  const [employees, setEmployees] = useState([]);  // RM’s team
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [assignments, setAssignments] = useState([]); // History
  const [columns, setColumns] = useState(["Qty"]);

  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [assignmentsFilter, setAssignmentsFilter] = useState({
    id: "",
    emp: "",
    item: "",
    purpose: "",
  });

  /* 🔹 Fetch RM team */
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`${API_BASE}/api/users/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch team");
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching RM team:", err);
        setEmployees([]);
      }
    }
    if (token && user?.role === "RegionalManager") fetchTeam();
  }, [token, user]);

  /* 🔹 Fetch stock + history from backend */
  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch(`${API_BASE}/api/assignments/regional/stock?ts=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch stock");
        const data = await res.json();
        setItems(data.stock || []);
        setAssignments(data.assignments || []);
      } catch (err) {
        console.error("Error fetching stock:", err);
        setItems([]);
      }
    }
    if (token && user?.role === "RegionalManager") fetchStock();
  }, [token, user]);

  /* 🔹 Toggle employee */
  const toggleEmployee = (emp) => {
    if (selectedEmps.find((e) => e.empCode === emp.empCode)) {
      setSelectedEmps(selectedEmps.filter((e) => e.empCode !== emp.empCode));
    } else {
      setSelectedEmps([...selectedEmps, { ...emp, qty: 0, extra: {} }]);
    }
  };

  /* 🔹 Update value */
  const updateValue = (empCode, field, value) => {
    setSelectedEmps((prev) =>
      prev.map((e) =>
        e.empCode === empCode
          ? field === "qty"
            ? { ...e, qty: safeNum(value) }
            : { ...e, extra: { ...e.extra, [field]: value } }
          : e
      )
    );
  };

  /* 🔹 Allot stock (RM → BM/Employees) - Generate SEPARATE ID for EACH */
  const handleAllot = async () => {
    if (!selectedItem) {
      alert("❌ Please select an item first!");
      return;
    }
    if (!purpose) {
      alert("❌ Please select a purpose!");
      return;
    }

    const stockItem = items.find((i) => i.name === selectedItem);
    const totalQty = selectedEmps.reduce((sum, e) => sum + safeNum(e.qty), 0);

    if (!stockItem || totalQty > safeNum(stockItem.stock)) {
      alert("❌ Not enough stock available!");
      return;
    }

    const timestamp = Date.now();
    const baseRootId = assignments.find(a => a.item === selectedItem)?.rootId || "NA";
    const createdIds = [];

    try {
      // Create SEPARATE assignment for EACH selected employee
      for (let i = 0; i < selectedEmps.length; i++) {
        const emp = selectedEmps[i];
        const rmId = `RM${timestamp}-${i + 1}`; // Unique RM ID for each

        const newAssignment = {
          rootId: baseRootId,
          rmId,
          item: selectedItem,
          employees: [{
            empCode: emp.empCode,
            name: emp.name,
            qty: safeNum(emp.qty),
            extra: emp.extra || {},
          }],
          purpose,
          assignedBy: user?.name || "Unknown",
          role: user?.role || "RegionalManager",
          region: user?.region || "Unknown",
          date: new Date().toLocaleString(),
        };

        const res = await fetch(`${API_BASE}/api/assignments/allocate/rm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newAssignment),
        });

        if (!res.ok) throw new Error(`Failed to allocate for ${emp.name}`);
        const saved = await res.json();
        setAssignments((prev) => [saved, ...prev]);
        createdIds.push(rmId);
      }

      setItems((prev) =>
        prev.map((i) =>
          i.name === selectedItem
            ? { ...i, stock: safeNum(i.stock) - totalQty }
            : i
        )
      );

      setSelectedEmps([]);
      setPurpose("");
      alert(`✅ Stock allocated!\n${createdIds.length} separate IDs created:\n${createdIds.join("\n")}`);
    } catch (err) {
      console.error("Allocation error:", err);
      alert("❌ Failed to allocate");
    }
  };

  /* 🔹 Search assignment by ID */
  const handleSearch = () => {
    if (!searchId) return alert("Please enter Assignment ID");
    const found = assignments.find(
      (a) => a.rootId === searchId || a.rmId === searchId || a.bmId === searchId
    );
    if (found) setSearchResult(found);
    else {
      alert("❌ No assignment found");
      setSearchResult(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🌍 Sample Allocation (Regional Manager)</h2>

      {/* Search + History Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 15, gap: 8 }}>
        <input
          type="text"
          placeholder="Enter Assignment ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={{ padding: "6px" }}
        />
        <button onClick={handleSearch} style={{ padding: "6px 12px" }}>🔍 Search</button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{ padding: "6px 12px", background: "#2196f3", color: "white", border: "none", borderRadius: 4 }}
        >
          📑 Allocated Report
        </button>
      </div>

      {/* Stock Summary */}
      {items.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <h3>📊 My Current Stock</h3>
          <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f5f5f5" }}>
              <tr>
                <th>Item</th>
                <th>Available Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{safeNum(item.stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>⚠️ No stock assigned by Admin</p>
      )}

      {/* Assign To */}
      {items.length > 0 && employees.length > 0 && (
        <>
          <div style={{ margin: "15px 0" }}>
            <label>
              <b>Select Item:</b>{" "}
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                style={{ padding: "6px", minWidth: "200px" }}
              >
                <option value="">-- Select Item --</option>
                {items.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} (Available: {safeNum(item.stock)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: 15 }}>
            <b>Assign To:</b>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {employees.map((emp) => (
                <label key={emp.empCode} style={{ border: "1px solid #ccc", borderRadius: 4, padding: "4px 8px" }}>
                  <input
                    type="checkbox"
                    checked={!!selectedEmps.find((e) => e.empCode === emp.empCode)}
                    onChange={() => toggleEmployee(emp)}
                  />{" "}
                  {emp.name} ({emp.empCode})
                </label>
              ))}
            </div>
          </div>

          {/* Allocation Table */}
          {selectedEmps.length > 0 && (
            <>
              <table border="1" cellPadding="6" style={{ width: "100%", marginTop: 15, borderCollapse: "collapse" }}>
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
                            value={col === "Qty" ? safeNum(emp.qty) : emp.extra?.[col] || ""}
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

              <div style={{ marginTop: 15 }}>
                <label>
                  <b>Purpose:</b>{" "}
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                    <option value="">-- Select Purpose --</option>
                    <option value="Team Bifurcation">To bifurcate among the team</option>
                    <option value="Project/Marketing">To use Project/Marketing</option>
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  onClick={handleAllot}
                  style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid #999", background: "#4caf50", color: "white", cursor: "pointer" }}
                >
                  ✅ Allot Stock
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* History */}
      {showHistory && (
        <div style={{ marginTop: 30 }}>
          <h3>📑 Assignment History</h3>
          <div style={{ marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input type="text" placeholder="Filter by ID" onChange={(e) => setAssignmentsFilter((p) => ({ ...p, id: e.target.value }))} />
            <input type="text" placeholder="Filter by Employee" onChange={(e) => setAssignmentsFilter((p) => ({ ...p, emp: e.target.value }))} />
            <input type="text" placeholder="Filter by Item" onChange={(e) => setAssignmentsFilter((p) => ({ ...p, item: e.target.value }))} />
            <input type="text" placeholder="Filter by Purpose" onChange={(e) => setAssignmentsFilter((p) => ({ ...p, purpose: e.target.value }))} />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead style={{ background: "#f5f5f5" }}>
                <tr>
                  <th>Root ID</th>
                  <th>RM ID</th>
                  <th>BM ID</th>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Employee</th>
                  <th>Qty (T/U/A)</th>
                  <th>Purpose</th>
                  <th>Assigned By</th>
                </tr>
              </thead>
              <tbody>
                {assignments
                  .filter((a) =>
                    (a.rootId || "").toLowerCase().includes(assignmentsFilter.id.toLowerCase()) ||
                    (a.rmId || "").toLowerCase().includes(assignmentsFilter.id.toLowerCase()) ||
                    (a.bmId || "").toLowerCase().includes(assignmentsFilter.id.toLowerCase())
                  )
                  .filter((a) => (a.item || "").toLowerCase().includes(assignmentsFilter.item.toLowerCase()))
                  .filter((a) => (a.purpose || "").toLowerCase().includes(assignmentsFilter.purpose.toLowerCase()))
                  .map((a, i) =>
                    (a.employees || [])
                      .filter((emp) =>
                        (emp.name || "").toLowerCase().includes(assignmentsFilter.emp.toLowerCase())
                      )
                      .map((emp, j) => {
                        const available = safeNum(emp.qty) - safeNum(emp.usedQty);
                        return (
                          <tr key={`${i}-${j}`}>
                            <td>{a.rootId || "-"}</td>
                            <td>{a.rmId || "-"}</td>
                            <td>{a.bmId || "-"}</td>
                            <td>{a.date}</td>
                            <td>{a.item}</td>
                            <td>{emp.name} ({emp.empCode})</td>
                            <td>
                              <span>{safeNum(emp.qty)}</span> / {" "}
                              <span style={{ color: "#f59e0b" }}>{safeNum(emp.usedQty)}</span> / {" "}
                              <span style={{ fontWeight: "bold", color: available > 0 ? "green" : "red" }}>
                                {available}
                              </span>
                            </td>
                            <td>{a.purpose}</td>
                            <td>{a.assignedBy}</td>
                          </tr>
                        );
                      })
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔹 Team Sample Usage History */}
      <div style={{ marginTop: 40 }}>
        <h3>📋 Team Sample Usage History</h3>
        {assignments.some((a) =>
          (a.employees || []).some((e) => e.usedSamples?.length > 0)
        ) ? (
          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead style={{ background: "#d1fae5" }}>
                <tr>
                  <th>Employee</th>
                  <th>Item</th>
                  <th>Used Against (Customer ID / Project)</th>
                  <th>Qty Used</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {assignments.flatMap((h) =>
                  (h.employees || [])
                    .filter((e) => e.usedSamples?.length > 0)
                    .flatMap((e) =>
                      e.usedSamples.map((us, idx) => (
                        <tr key={`${h._id}-${e.empCode}-${idx}`}>
                          <td>{e.name} ({e.empCode})</td>
                          <td>{h.item}</td>
                          <td style={{ fontWeight: "bold", color: "#1d4ed8" }}>{us.customerId}</td>
                          <td style={{ textAlign: "center" }}>{us.qty}</td>
                          <td>{us.usedAt ? new Date(us.usedAt).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))
                    )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "#6b7280" }}>⚠️ No samples used yet by team members.</p>
        )}
      </div>
    </div>
  );
}

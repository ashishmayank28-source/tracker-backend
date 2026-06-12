import { useEffect, useState } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ItemNamesManager() {
  const { token } = useAuth() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/item-names/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadItems();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/item-names`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add");

      setNewName("");
      setMessage(`✅ "${name}" added to dropdown list`);
      await loadItems();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from dropdown list?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/item-names/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");

      setMessage(`✅ "${name}" removed`);
      await loadItems();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditName(item.name);
  };

  const handleSaveEdit = async (id) => {
    const name = editName.trim();
    if (!name) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/item-names/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, isActive: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      setEditingId(null);
      setEditName("");
      setMessage("✅ Item name updated");
      await loadItems();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      const res = await fetch(`${API_BASE}/api/item-names/${item._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: item.name, isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      setMessage(item.isActive ? `✅ "${item.name}" hidden from employees` : `✅ "${item.name}" shown to employees`);
      await loadItems();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  if (loading) {
    return <p style={{ padding: 20 }}>⏳ Loading item names...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <p style={{ color: "#64748b", marginBottom: 20 }}>
        Manage the item names that employees can select when marking an order as <strong>Won</strong>.
      </p>

      <form
        onSubmit={handleAdd}
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New item name"
          style={{
            flex: 1,
            minWidth: 220,
            padding: "10px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          style={{
            padding: "10px 18px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          + Add Item
        </button>
      </form>

      {message && (
        <p
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 8,
            background: message.startsWith("✅") ? "#ecfdf5" : "#fef2f2",
            color: message.startsWith("✅") ? "#047857" : "#b91c1c",
          }}
        >
          {message}
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={th}>Item Name</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                  No item names yet. Add one above.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={td}>
                    {editingId === item._id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: item.isActive ? "#dcfce7" : "#fee2e2",
                        color: item.isActive ? "#166534" : "#991b1b",
                      }}
                    >
                      {item.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {editingId === item._id ? (
                        <>
                          <ActionBtn onClick={() => handleSaveEdit(item._id)} color="#16a34a">
                            Save
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => {
                              setEditingId(null);
                              setEditName("");
                            }}
                            color="#64748b"
                          >
                            Cancel
                          </ActionBtn>
                        </>
                      ) : (
                        <>
                          <ActionBtn onClick={() => startEdit(item)} color="#2563eb">
                            Edit
                          </ActionBtn>
                          <ActionBtn onClick={() => toggleActive(item)} color="#f59e0b">
                            {item.isActive ? "Hide" : "Show"}
                          </ActionBtn>
                          <ActionBtn onClick={() => handleDelete(item._id, item.name)} color="#dc2626">
                            Delete
                          </ActionBtn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: "12px 14px", fontSize: 13, color: "#475569" };
const td = { padding: "12px 14px", fontSize: 14 };

function ActionBtn({ children, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        border: `1px solid ${color}`,
        background: "#fff",
        color,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

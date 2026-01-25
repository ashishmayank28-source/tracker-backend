// frontend/src/pages/admin/GuestPermissionManager.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../auth.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

export default function GuestPermissionManager() {
  const { token } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // State for permissions
  const [allowedTiles, setAllowedTiles] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [guestUsername, setGuestUsername] = useState("guest");
  const [guestPassword, setGuestPassword] = useState("");
  const [availableTiles, setAvailableTiles] = useState([]);

  // ✅ Fetch current permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/guest/permissions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setAllowedTiles(data.allowedTiles || []);
        setIsEnabled(data.isEnabled !== false);
        setGuestUsername(data.guestUsername || "guest");
        setAvailableTiles(data.availableTiles || []);
      } catch (err) {
        console.error("Failed to fetch guest permissions:", err);
        setMessage("❌ Failed to load permissions");
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [token]);

  // ✅ Toggle tile selection
  const toggleTile = (tileId) => {
    setAllowedTiles((prev) =>
      prev.includes(tileId)
        ? prev.filter((id) => id !== tileId)
        : [...prev, tileId]
    );
  };

  // ✅ Select all tiles
  const selectAll = () => {
    setAllowedTiles(availableTiles.map((t) => t.id));
  };

  // ✅ Deselect all tiles
  const deselectAll = () => {
    setAllowedTiles([]);
  };

  // ✅ Save permissions
  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const body = {
        allowedTiles,
        isEnabled,
        guestUsername,
      };

      // Only include password if it's been changed
      if (guestPassword) {
        body.guestPassword = guestPassword;
      }

      const res = await fetch(`${API_BASE}/api/guest/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save");
      }

      setMessage("✅ Guest permissions saved successfully!");
      setGuestPassword(""); // Clear password field
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>⏳ Loading permissions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Enable/Disable Guest Login */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          padding: 16,
          background: isEnabled ? "#ecfdf5" : "#fef2f2",
          borderRadius: 8,
          border: `1px solid ${isEnabled ? "#a7f3d0" : "#fecaca"}`,
        }}
      >
        <input
          type="checkbox"
          id="guestEnabled"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          style={{ width: 20, height: 20, cursor: "pointer" }}
        />
        <label
          htmlFor="guestEnabled"
          style={{ fontSize: 15, fontWeight: 500, cursor: "pointer" }}
        >
          {isEnabled ? "✅ Guest Login Enabled" : "❌ Guest Login Disabled"}
        </label>
      </div>

      {/* Credentials Section */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h4 style={{ margin: "0 0 16px 0", fontWeight: 600 }}>
          🔑 Guest Login Credentials
        </h4>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={guestUsername}
              onChange={(e) => setGuestUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={guestPassword}
              onChange={(e) => setGuestPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tile Selection */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h4 style={{ margin: 0, fontWeight: 600 }}>
            📋 Select Tiles for Guest Access
          </h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={selectAll}
              style={{
                padding: "6px 12px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              style={{
                padding: "6px 12px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Deselect All
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {availableTiles.map((tile) => (
            <div
              key={tile.id}
              onClick={() => toggleTile(tile.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 14,
                background: allowedTiles.includes(tile.id) ? `${tile.color}15` : "#fff",
                border: `2px solid ${allowedTiles.includes(tile.id) ? tile.color : "#e2e8f0"}`,
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={allowedTiles.includes(tile.id)}
                onChange={() => {}}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span
                style={{
                  fontWeight: allowedTiles.includes(tile.id) ? 600 : 400,
                  color: allowedTiles.includes(tile.id) ? "#1e293b" : "#64748b",
                }}
              >
                {tile.label}
              </span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
          {allowedTiles.length} of {availableTiles.length} tiles selected
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: message.startsWith("✅") ? "#ecfdf5" : "#fef2f2",
            color: message.startsWith("✅") ? "#059669" : "#dc2626",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "12px 24px",
          background: saving ? "#94a3b8" : "#22c55e",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving..." : "💾 Save Permissions"}
      </button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { API_BASE, token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!user?.empCode) return;
    
    fetch(`${API_BASE}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setAddress(data.courierAddress || "");
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load profile" }))
      .finally(() => setLoading(false));
  }, [user?.empCode, API_BASE, token]);

  async function saveAddress() {
    setSaving(true);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch(`${API_BASE}/api/users/${profile.empCode}/address`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courierAddress: address }),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      setProfile({ ...profile, courierAddress: address });
      setEditingAddress(false);
      setMessage({ type: "success", text: "Address updated successfully" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save address" });
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Basic Info - Read Only */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{profile.name}</h2>
              <p className="text-sm text-gray-500">{profile.empCode}</p>
            </div>
          </div>
        </div>

        {/* Details - Read Only */}
        <div className="divide-y divide-gray-100">
          <InfoRow label="Role" value={profile.role} />
          <InfoRow label="Designation" value={profile.designation || "-"} />
          <InfoRow label="Email" value={profile.email || "-"} />
          <InfoRow label="Mobile" value={profile.mobile || "-"} />
          {profile.mobile2 && <InfoRow label="Mobile 2" value={profile.mobile2} />}
          <InfoRow label="Area" value={profile.area || "-"} />
          <InfoRow label="Branch" value={profile.branch || "-"} />
          <InfoRow label="Region" value={profile.region || "-"} />
          
          {/* Reports To */}
          {profile.reportTo?.length > 0 && (
            <InfoRow 
              label="Reports To" 
              value={profile.reportTo.map(m => m.name).join(", ")} 
            />
          )}
        </div>

        {/* Courier Address - Editable */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                Courier Address
              </label>
              {editingAddress ? (
                <div className="mt-2">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your delivery address"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveAddress}
                      disabled={saving}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAddress(false);
                        setAddress(profile.courierAddress || "");
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-800">
                  {profile.courierAddress || "Not set"}
                </p>
              )}
            </div>
            {!editingAddress && (
              <button
                onClick={() => setEditingAddress(true)}
                className="text-purple-600 text-sm hover:text-purple-700"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This address will be used for sample/material delivery
          </p>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full mt-6 py-3 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 font-medium"
      >
        Logout
      </button>

      {/* Note */}
      <p className="text-xs text-gray-400 text-center mt-4">
        To update other details, please contact your administrator
      </p>
    </div>
  );
}

// Simple Info Row Component
function InfoRow({ label, value }) {
  return (
    <div className="px-6 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

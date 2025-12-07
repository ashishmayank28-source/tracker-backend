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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-gray-100 py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Back
        </button>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-8 text-center text-white">
            <div className="w-20 h-20 rounded-full bg-white mx-auto flex items-center justify-center text-3xl font-bold text-purple-600 shadow-lg">
              {profile.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <h1 className="text-xl font-bold mt-4">{profile.name}</h1>
            <p className="text-purple-200 text-sm">{profile.empCode}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs">
              {profile.role}
            </span>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
              message.type === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message.text}
            </div>
          )}

          {/* Info Sections */}
          <div className="p-4 space-y-4">
            {/* Personal Info */}
            <Section title="Personal Information">
              <InfoItem label="Email" value={profile.email || "Not set"} />
              <InfoItem label="Mobile" value={profile.mobile || "Not set"} />
              {profile.mobile2 && <InfoItem label="Mobile 2" value={profile.mobile2} />}
              <InfoItem label="Designation" value={profile.designation || "Not set"} />
            </Section>

            {/* Work Info */}
            <Section title="Work Information">
              <InfoItem label="Area" value={profile.area || "Not assigned"} />
              <InfoItem label="Branch" value={profile.branch || "Not assigned"} />
              <InfoItem label="Region" value={profile.region || "Not assigned"} />
              {profile.reportTo?.length > 0 && (
                <InfoItem label="Reports To" value={profile.reportTo.map(m => m.name).join(", ")} />
              )}
            </Section>

            {/* Delivery Address */}
            <Section 
              title="Delivery Address" 
              action={!editingAddress && (
                <button
                  onClick={() => setEditingAddress(true)}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Edit
                </button>
              )}
            >
              {editingAddress ? (
                <div className="space-y-3">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    placeholder="Enter your delivery address"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveAddress}
                      disabled={saving}
                      className="flex-1 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAddress(false);
                        setAddress(profile.courierAddress || "");
                      }}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {profile.courierAddress || "Not set"}
                </p>
              )}
            </Section>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full py-3 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 font-medium text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Contact administrator to update other details
        </p>
      </div>
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

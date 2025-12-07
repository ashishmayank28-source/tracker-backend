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
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-40 overflow-auto">
      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white">
        {/* Back Button */}
        <div className="px-4 pt-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-white/80 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Profile Header */}
        <div className="px-6 pt-6 pb-16 text-center">
          {/* Avatar */}
          <div className="inline-block">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-4xl font-bold text-purple-600 shadow-xl border-4 border-white/30">
              {profile.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
          
          {/* Name & Code */}
          <h1 className="text-2xl font-bold mt-4">{profile.name}</h1>
          <p className="text-purple-200 mt-1">{profile.empCode}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
            {profile.role}
          </span>
        </div>
      </div>

      {/* Content - Overlapping Cards */}
      <div className="px-4 -mt-8 pb-8 max-w-2xl mx-auto">
        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm shadow ${
            message.type === "success" 
              ? "bg-green-100 text-green-700 border-l-4 border-green-500" 
              : "bg-red-100 text-red-700 border-l-4 border-red-500"
          }`}>
            {message.text}
          </div>
        )}

        {/* Personal Info Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
            <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
              <span>👤</span> Personal Information
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            <InfoRow icon="📧" label="Email" value={profile.email || "Not set"} />
            <InfoRow icon="📱" label="Mobile" value={profile.mobile || "Not set"} />
            {profile.mobile2 && <InfoRow icon="📞" label="Mobile 2" value={profile.mobile2} />}
            <InfoRow icon="💼" label="Designation" value={profile.designation || "Not set"} />
          </div>
        </div>

        {/* Work Info Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
              <span>🏢</span> Work Information
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            <InfoRow icon="📍" label="Area" value={profile.area || "Not assigned"} />
            <InfoRow icon="🏬" label="Branch" value={profile.branch || "Not assigned"} />
            <InfoRow icon="🌍" label="Region" value={profile.region || "Not assigned"} />
            {profile.reportTo?.length > 0 && (
              <InfoRow 
                icon="👔" 
                label="Reports To" 
                value={profile.reportTo.map(m => m.name).join(", ")} 
              />
            )}
          </div>
        </div>

        {/* Courier Address Card - Editable */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <span>📦</span> Delivery Address
            </h3>
            {!editingAddress && (
              <button
                onClick={() => setEditingAddress(true)}
                className="text-xs px-3 py-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition"
              >
                Edit
              </button>
            )}
          </div>
          <div className="p-4">
            {editingAddress ? (
              <div>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter your delivery address for samples/materials"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveAddress}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {saving ? "Saving..." : "Save Address"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingAddress(false);
                      setAddress(profile.courierAddress || "");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                {profile.courierAddress || "No address set. Click Edit to add your delivery address."}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              This address is used for sample/material delivery
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 font-medium transition flex items-center justify-center gap-2"
        >
          <span>🚪</span> Logout
        </button>

        {/* Note */}
        <p className="text-xs text-gray-400 text-center mt-4 pb-4">
          To update other details, please contact your administrator
        </p>
      </div>
    </div>
  );
}

// Info Row Component with Icon
function InfoRow({ icon, label, value }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  );
}

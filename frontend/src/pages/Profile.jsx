import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth.jsx";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { API_BASE, token, user, setAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user?.empCode) return;
    setLoading(true);
    fetch(`${API_BASE}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch((e) => setErr("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user?.empCode]);

  // Save single field
  async function saveField(fieldName, value) {
    setSaving(true);
    setErr("");
    try {
      const body = { [fieldName]: value };
      const res = await fetch(`${API_BASE}/api/users/${profile.empCode}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");
      
      setProfile({ ...profile, [fieldName]: value });
      if (fieldName === "name") {
        setAuth(token, { ...user, name: value });
      }
      setSuccess("Updated successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setErr(err.message || "Failed to save");
    } finally {
      setSaving(false);
      setEditField(null);
    }
  }

  // Handle photo upload
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErr("Please select an image file");
      return;
    }
    if (file.size > 500 * 1024) {
      setErr("Image size should be less than 500KB");
      return;
    }

    setUploadingPhoto(true);
    setErr("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        
        const res = await fetch(`${API_BASE}/api/users/${profile.empCode}/photo`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profilePhoto: base64 }),
        });

        if (res.ok) {
          setProfile({ ...profile, profilePhoto: base64 });
          setAuth(token, { ...user, profilePhoto: base64 });
          setSuccess("Photo updated!");
          setTimeout(() => setSuccess(""), 2000);
        } else {
          setErr("Failed to upload photo");
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErr("Failed to upload photo");
      setUploadingPhoto(false);
    }
  }

  function startEdit(field, currentValue) {
    setEditField(field);
    setEditValue(currentValue || "");
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  // Get role display
  const getRoleDisplay = (role) => {
    const roleMap = {
      Employee: "Sales Executive",
      Manager: "Area Manager",
      BranchManager: "Branch Manager",
      RegionalManager: "Regional Manager",
      Admin: "Administrator",
      Vendor: "Vendor Partner",
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">No profile data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-2xl">←</button>
        <h1 className="text-xl font-medium">Profile</h1>
      </div>

      {/* Profile Photo Section */}
      <div className="bg-gradient-to-b from-teal-50 to-white py-8">
        <div className="flex flex-col items-center">
          {/* Photo */}
          <div className="relative">
            <div 
              className="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center"
            >
              {profile.profilePhoto ? (
                <img 
                  src={profile.profilePhoto} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-white">
                  {profile.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            {/* Edit Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-2 right-2 w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-600 transition"
            >
              {uploadingPhoto ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-white text-lg">✏️</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mx-4 mt-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
          ✓ {success}
        </div>
      )}
      {err && (
        <div className="mx-4 mt-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
          ✗ {err}
        </div>
      )}

      {/* Profile Fields */}
      <div className="bg-white mx-0 md:mx-4 mt-4 rounded-lg shadow-sm">
        {/* Name */}
        <ProfileField
          icon="👤"
          label="Name"
          value={profile.name}
          editable
          onEdit={() => startEdit("name", profile.name)}
        />

        {/* Designation */}
        <ProfileField
          icon="💼"
          label="Designation"
          value={profile.designation || getRoleDisplay(profile.role)}
          editable
          onEdit={() => startEdit("designation", profile.designation)}
          sublabel="Your job title"
        />

        {/* Employee Code */}
        <ProfileField
          icon="🆔"
          label="Employee Code"
          value={profile.empCode}
          sublabel="This cannot be changed"
        />

        {/* Role */}
        <ProfileField
          icon="🎯"
          label="Role"
          value={getRoleDisplay(profile.role)}
          sublabel="Assigned by administrator"
        />
      </div>

      {/* Contact Information */}
      <div className="bg-white mx-0 md:mx-4 mt-4 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-xs text-teal-600 font-medium uppercase tracking-wide">Contact Information</span>
        </div>

        {/* Primary Mobile */}
        <ProfileField
          icon="📱"
          label="Primary Mobile"
          value={profile.mobile || "Not set"}
          editable
          onEdit={() => startEdit("mobile", profile.mobile)}
          sublabel="Your primary contact number"
        />

        {/* Secondary Mobile */}
        <ProfileField
          icon="📞"
          label="Secondary Mobile"
          value={profile.mobile2 || "Not set"}
          editable
          onEdit={() => startEdit("mobile2", profile.mobile2)}
          sublabel="Optional alternate number"
        />

        {/* Email */}
        <ProfileField
          icon="✉️"
          label="Email Address"
          value={profile.email || "Not set"}
          editable
          onEdit={() => startEdit("email", profile.email)}
        />

        {/* Courier Address */}
        <ProfileField
          icon="📍"
          label="Courier Address"
          value={profile.courierAddress || "Not set"}
          editable
          onEdit={() => startEdit("courierAddress", profile.courierAddress)}
          sublabel="Address for sample delivery"
          multiline
        />
      </div>

      {/* Work Location */}
      <div className="bg-white mx-0 md:mx-4 mt-4 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-xs text-teal-600 font-medium uppercase tracking-wide">Work Location</span>
        </div>

        <ProfileField
          icon="📌"
          label="Area"
          value={profile.area || "Not assigned"}
        />

        <ProfileField
          icon="🏢"
          label="Branch"
          value={profile.branch || "Not assigned"}
        />

        <ProfileField
          icon="🌍"
          label="Region"
          value={profile.region || "Not assigned"}
        />
      </div>

      {/* Reports To */}
      {profile.reportTo?.length > 0 && (
        <div className="bg-white mx-0 md:mx-4 mt-4 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-xs text-teal-600 font-medium uppercase tracking-wide">Reports To</span>
          </div>
          {profile.reportTo.map((manager, idx) => (
            <ProfileField
              key={idx}
              icon="👔"
              label={manager.name}
              value={manager.empCode}
            />
          ))}
        </div>
      )}

      {/* Logout Button */}
      <div className="mx-0 md:mx-4 mt-6 mb-8">
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 py-4 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
        >
          <span>🚪</span> Logout
        </button>
      </div>

      {/* Edit Modal */}
      {editField && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:w-96 md:rounded-xl rounded-t-xl overflow-hidden">
            <div className="bg-teal-600 text-white px-4 py-4 flex items-center justify-between">
              <button onClick={() => setEditField(null)} className="text-xl">✕</button>
              <span className="font-medium">Edit {editField}</span>
              <button 
                onClick={() => saveField(editField, editValue)}
                disabled={saving}
                className="text-xl"
              >
                {saving ? "..." : "✓"}
              </button>
            </div>
            <div className="p-4">
              {editField === "courierAddress" ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border-b-2 border-teal-500 py-2 text-lg focus:outline-none resize-none"
                  rows={4}
                  autoFocus
                  placeholder={`Enter ${editField}`}
                />
              ) : (
                <input
                  type={editField === "email" ? "email" : "text"}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border-b-2 border-teal-500 py-2 text-lg focus:outline-none"
                  autoFocus
                  placeholder={`Enter ${editField}`}
                />
              )}
              <p className="text-xs text-gray-400 mt-2">
                {editField === "courierAddress" 
                  ? "Enter full address for sample/material delivery"
                  : editField === "mobile" || editField === "mobile2"
                  ? "Enter 10-digit mobile number"
                  : editField === "email"
                  ? "Enter valid email address"
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Profile Field Component - WhatsApp Style
function ProfileField({ icon, label, value, sublabel, editable, onEdit, multiline }) {
  return (
    <div 
      className={`flex items-start gap-4 px-4 py-4 border-b border-gray-100 last:border-b-0 ${editable ? "cursor-pointer hover:bg-gray-50" : ""}`}
      onClick={editable ? onEdit : undefined}
    >
      <span className="text-2xl w-8 text-center flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-gray-800 ${multiline ? "whitespace-pre-wrap" : "truncate"} ${!value || value === "Not set" ? "text-gray-400" : ""}`}>
          {value || "Not set"}
        </p>
        {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
      </div>
      {editable && (
        <span className="text-gray-400 text-lg flex-shrink-0">✏️</span>
      )}
    </div>
  );
}

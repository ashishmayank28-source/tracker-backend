// src/components/Layout.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Layout({ children }) {
  const { user, token, logout, API_BASE, setAuth } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get role display name
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

  // Handle photo upload
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 500 * 1024) {
      alert("Image size should be less than 500KB");
      return;
    }

    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        
        const res = await fetch(`${API_BASE}/api/users/${user.empCode}/photo`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profilePhoto: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update user in auth context
          setAuth(token, { ...user, profilePhoto: base64 });
          setShowPhotoModal(false);
        } else {
          alert("Failed to upload photo");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Failed to upload photo");
      setUploading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
    setShowDropdown(false);
  }

  function goToProfile() {
    navigate("/profile");
    setShowDropdown(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow px-4 py-3 flex justify-between items-center sticky top-0 z-50 overflow-visible">
        <Link to="/" className="text-xl font-bold text-purple-700 hover:text-purple-800 transition">
          Sales Tracker
        </Link>

        {/* User Profile Section */}
        {user && (
          <div className="relative z-[60]" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-full p-1 pr-3 transition"
            >
              {/* Profile Photo */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white shadow">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              {/* Arrow */}
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div 
                className="absolute mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                style={{ 
                  right: "-8px",
                  width: "300px",
                  maxWidth: "calc(100vw - 16px)",
                  maxHeight: "calc(100vh - 80px)",
                  overflowY: "auto",
                  zIndex: 9999
                }}
              >
                {/* User Info Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    {/* Photo with upload option */}
                    <div
                      onClick={() => setShowPhotoModal(true)}
                      className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold cursor-pointer hover:bg-white/30 transition overflow-hidden border-2 border-white/50 flex-shrink-0"
                      title="Click to change photo"
                    >
                      {user.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.name?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{user.name || "User"}</p>
                      <p className="text-xs text-purple-100 truncate">
                        {user.designation || getRoleDisplay(user.role)}
                      </p>
                      <p className="text-xs text-purple-200">{user.empCode}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                {(user.branch || user.region || user.mobile) && (
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {user.branch && (
                        <span><span className="text-gray-400">Branch:</span> <span className="font-medium">{user.branch}</span></span>
                      )}
                      {user.region && (
                        <span><span className="text-gray-400">Region:</span> <span className="font-medium">{user.region}</span></span>
                      )}
                      {user.mobile && (
                        <span><span className="text-gray-400">📱</span> <span className="font-medium">{user.mobile}</span></span>
                      )}
                    </div>
                  </div>
                )}

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={goToProfile}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                  >
                    <span>👤</span>
                    <span>View Full Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPhotoModal(true);
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                  >
                    <span>📷</span>
                    <span>Change Photo</span>
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <h3 className="text-lg font-semibold">Upload Profile Photo</h3>
              <p className="text-sm text-purple-100">Max size: 500KB</p>
            </div>
            <div className="p-6">
              {/* Current Photo */}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-4 border-gray-100 shadow">
                  {user?.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "📷 Select Photo"}
              </button>

              {/* Cancel */}
              <button
                onClick={() => setShowPhotoModal(false)}
                className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6">{children}</main>

      {/* Footer */}
      <footer className="bg-white shadow p-4 text-center text-sm text-gray-500">
        © 2025 Sales Tracker. All rights reserved.
      </footer>
    </div>
  );
}

// src/components/Layout.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  // Close profile when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
    setShowProfile(false);
  }

  function goToProfile() {
    navigate("/profile");
    setShowProfile(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="text-xl font-bold text-purple-700 hover:text-purple-800 transition">
          Sales Tracker
        </Link>

        {/* User Section */}
        {user && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 hover:bg-purple-50 rounded-full p-1.5 pr-3 transition border border-transparent hover:border-purple-200"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${showProfile ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div 
                className="absolute mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                style={{ 
                  right: 0,
                  width: "220px",
                  zIndex: 9999
                }}
              >
                {/* User Info Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{user.name}</p>
                      <p className="text-purple-200 text-xs">{user.empCode}</p>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
                  <span className="text-xs text-purple-600 font-medium">{user.role}</span>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={goToProfile}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                  >
                    <span className="w-5 text-center">👤</span>
                    <span>View Profile</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
                  >
                    <span className="w-5 text-center">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6">{children}</main>

      {/* Footer */}
      <footer className="bg-white shadow p-4 text-center text-sm text-gray-500">
        © 2025 Sales Tracker. All rights reserved.
      </footer>
    </div>
  );
}

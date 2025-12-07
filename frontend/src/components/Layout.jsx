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
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition"
            >
              {/* Avatar - First Letter */}
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user.name || "User"}
              </span>
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
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                style={{ zIndex: 9999 }}
              >
                {/* User Info */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.empCode}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>

                {/* Menu */}
                <div className="py-1">
                  <button
                    onClick={goToProfile}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span>👤</span> View Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <span>🚪</span> Logout
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

// src/components/Layout.jsx
import { Link } from "react-router-dom";

// src/components/Layout.jsx
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow p-4">
        <h1 className="text-2xl font-bold text-purple-700">Sales Tracker</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>

      {/* Footer */}
      <footer className="bg-white shadow p-4 text-center text-sm text-gray-500">
        © 2025 Sales Tracker. All rights reserved.
      </footer>
    </div>
  );
}

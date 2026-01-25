import { useState } from "react";
import { useAuth } from "../../auth.jsx"; // ✅ For role check
import AddCustomerForm from "./AddCustomerForm.jsx";
import CustomerList from "./CustomerList.jsx";
import RetailerDatabase from "../RetailerDatabase.jsx"; // ✅ Existing Retailer DB (for Employee)
import RetailerDatabaseTeam from "../RetailerDatabaseTeam.jsx"; // ✅ Retailer DB for Team (for Manager/Admin)
import AddRetailer from "../AddRetailer.jsx"; // ✅ Existing Add Retailer

// ✅ Main Customer Database Page
export default function CustomerDatabase({ onBack }) {
  const { user } = useAuth();
  const [activeTile, setActiveTile] = useState("main");
  const [selectedType, setSelectedType] = useState("");
  
  // ✅ Check if user is Manager/Admin - show team data
  const isManagerOrAbove = ["Manager", "BranchManager", "RegionalManager", "Admin"].includes(user?.role);

  // Customer types with their icons and colors
  const customerTypes = [
    { type: "Retailer", icon: "🏪", color: "#22c55e", description: "Shop owners & retailers" },
    { type: "Electrician", icon: "⚡", color: "#f59e0b", description: "Electrical contractors" },
    { type: "Architect", icon: "🏛️", color: "#8b5cf6", description: "Architects & designers" },
    { type: "Interior Designer", icon: "🎨", color: "#ec4899", description: "Interior design professionals" },
    { type: "Builder", icon: "🏗️", color: "#3b82f6", description: "Construction builders" },
    { type: "Developer", icon: "🏢", color: "#14b8a6", description: "Real estate developers" },
  ];

  // Handle adding new customer
  const handleAddCustomer = (type) => {
    setSelectedType(type);
    setActiveTile("add");
  };

  // Handle viewing customer list
  const handleViewList = (type) => {
    setSelectedType(type);
    setActiveTile("list");
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Main Dashboard */}
      {activeTile === "main" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              📋 Customer Database
            </h2>
            {onBack && (
              <button onClick={onBack} style={backBtnStyle}>
                ← Back
              </button>
            )}
          </div>

          <p style={{ color: "#64748b", marginBottom: 30, fontSize: 15 }}>
            Manage your customer relationships - Retailers, Electricians, Architects, Interior Designers, Builders & Developers
          </p>

          {/* Customer Type Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}>
            {customerTypes.map((ct) => (
              <CustomerTypeCard
                key={ct.type}
                type={ct.type}
                icon={ct.icon}
                color={ct.color}
                description={ct.description}
                onAdd={() => handleAddCustomer(ct.type)}
                onView={() => handleViewList(ct.type)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add Customer Form */}
      {activeTile === "add" && selectedType && (
        selectedType === "Retailer" ? (
          // ✅ Use existing AddRetailer for Retailer type
          <div>
            <button onClick={() => setActiveTile("main")} style={backBtnStyle}>
              ← Back
            </button>
            <AddRetailer />
          </div>
        ) : (
          <AddCustomerForm
            customerType={selectedType}
            onBack={() => setActiveTile("main")}
            onSuccess={() => {}}
          />
        )
      )}

      {/* Customer List */}
      {activeTile === "list" && selectedType && (
        selectedType === "Retailer" ? (
          // ✅ Use RetailerDatabaseTeam for Manager/Admin, RetailerDatabase for Employee
          <div>
            <button onClick={() => setActiveTile("main")} style={backBtnStyle}>
              ← Back to Customer Database
            </button>
            {isManagerOrAbove ? <RetailerDatabaseTeam /> : <RetailerDatabase />}
          </div>
        ) : (
          <CustomerList
            customerType={selectedType}
            onBack={() => setActiveTile("main")}
          />
        )
      )}
    </div>
  );
}

// ✅ Customer Type Card Component
function CustomerTypeCard({ type, icon, color, description, onAdd, onView }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      padding: 24,
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      borderLeft: `5px solid ${color}`,
      transition: "all 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 15 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            {type}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {description}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onAdd}
          style={{
            flex: 1,
            padding: "10px 16px",
            background: color,
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ➕ Add New
        </button>
        <button
          onClick={onView}
          style={{
            flex: 1,
            padding: "10px 16px",
            background: `${color}15`,
            color: color,
            border: `1px solid ${color}`,
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          📋 View All
        </button>
      </div>
    </div>
  );
}

/* ============ Styles ============ */
const backBtnStyle = {
  padding: "10px 20px",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 14,
};

import { Link } from 'react-router-dom';

export default function LoginSelector() {
  const options = [
    { role: "Employee", path: "/login/employee", icon: "🧑‍💼", color: "#3b82f6" },
    { role: "Manager", path: "/login/manager", icon: "🏢", color: "#8b5cf6" },
    { role: "Branch Manager", path: "/login/branch", icon: "🏛️", color: "#f97316" },
    { role: "Regional Manager", path: "/login/regional", icon: "🌐", color: "#10b981" },
    { role: "Admin", path: "/login/admin", icon: "🔧", color: "#ef4444" },
    { role: "Vendor", path: "/vendor/login", icon: "📦", color: "#06b6d4" },
    { role: "Guest", path: "/login/guest", icon: "🎫", color: "#9333ea" }, // ✅ Guest Login - Ticket/Pass icon
  ];

  return (
    <div style={{ padding: 40 }}>
      <h2>Select Login</h2>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <Link
            key={opt.role}
            to={opt.path}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 24,
              width: 160,
              textAlign: 'center',
              textDecoration: 'none',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${opt.color}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.icon}</div>
            <strong style={{ color: '#1e293b' }}>{opt.role}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function LoginSelector() {
  const options = [
    { role: "Employee", path: "/login/employee" },
    { role: "Manager", path: "/login/manager" },
    { role: "Branch Manager", path: "/login/branch" },
    { role: "Regional Manager", path: "/login/regional" },
    { role: "Admin", path: "/login/admin" },
    { role: "Vendor", path: "/vendor/login" } 
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
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 20,
              width: 160,
              textAlign: 'center',
              textDecoration: 'none',
              background: '#f9f9f9'
            }}
          >
            <strong>{opt.role}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}

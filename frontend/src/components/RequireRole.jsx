import { Navigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function RequireRole({ roles, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  if (!roles.includes(user.role)) {
    return <h3>⛔ Access denied</h3>;
  }

  return children;
}

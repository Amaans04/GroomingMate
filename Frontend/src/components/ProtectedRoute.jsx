import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthed, isReady } = useAuth();
  if (!isReady) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}


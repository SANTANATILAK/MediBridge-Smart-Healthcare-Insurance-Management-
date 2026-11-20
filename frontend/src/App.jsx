import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { dashboardPath } from './api.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';
import HospitalDashboard from './pages/HospitalDashboard.jsx';
import InsurerDashboard from './pages/InsurerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={`/login?portal=${role.toLowerCase()}`} replace />;
  if (user.role !== role) return <Navigate to={dashboardPath(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/patient" element={<Protected role="PATIENT"><PatientDashboard /></Protected>} />
      <Route path="/hospital" element={<Protected role="HOSPITAL"><HospitalDashboard /></Protected>} />
      <Route path="/insurer" element={<Protected role="INSURER"><InsurerDashboard /></Protected>} />
      <Route path="/admin" element={<Protected role="ADMIN"><AdminDashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

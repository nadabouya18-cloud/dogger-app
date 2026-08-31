import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterWalker from './pages/RegisterWalker';
import Dashboard from './pages/Dashboard';
import BookingFlow from './pages/BookingFlow';
import WalkerHome from './pages/WalkerHome';
import AddDog from './pages/AddDog';
import { supabase } from './supabase';

function ProtectedRoute({ children }) {
  const [session, setSession] = React.useState(undefined);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);
  if (session === undefined) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ fontSize: 48 }}>🐾</div>
    </div>
  );
  if (!session) return <Navigate to={window.location.pathname === '/walker' ? '/login?redirect=walker' : '/login'} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-walker" element={<RegisterWalker />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/book" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />
        <Route path="/book/:flowType" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />
        <Route path="/book/:flowType/:step" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />
        <Route path="/walker" element={<ProtectedRoute><WalkerHome /></ProtectedRoute>} />
        <Route path="/add-dog" element={<ProtectedRoute><AddDog /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider, ProtectedRoute } from './lib/context/AuthContext';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
// Import original Advisor components that I'm not modifying
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<SignIn />} />

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireRole="Admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            {/* Placeholder routes for the rest of Admin pages */}
            <Route path="msa" element={<div className="p-8">MSA Repository (Integration Ready)</div>} />
            <Route path="advisors" element={<div className="p-8">Legal Advisors (Integration Ready)</div>} />
            <Route path="analytics" element={<div className="p-8">Analytics (Integration Ready)</div>} />
            <Route path="audit" element={<div className="p-8">Audit Logs (Integration Ready)</div>} />
            <Route path="settings" element={<div className="p-8">Settings (Integration Ready)</div>} />
          </Route>

          {/* Legal Advisor Routes - preserving original architecture inside ProtectedRoute */}
          <Route 
            path="/advisor/*" 
            element={
              <ProtectedRoute requireRole="Legal Reviewer">
                {/* We wrap the existing AppShell and Dashboard here to preserve Vinayak's work */}
                <AppShell 
                  role="legal" 
                  currentNav="dashboard" 
                  onNavigate={() => {}} 
                  accentKey="gold" 
                  onChangeAccent={() => {}} 
                  onSwitchRole={() => {}} 
                  pendingContractsCount={0}
                >
                  <Dashboard 
                    contracts={[]}
                    trendData={[]}
                    deptData={[]}
                    countryData={[]}
                    clauseData={[]}
                    clauseTypeRisk={[]}
                    riskTab="dept"
                    onSetRiskTab={() => {}}
                    activeNav="dashboard"
                    onOpenExportModal={() => {}}
                  />
                </AppShell>
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
  );
}

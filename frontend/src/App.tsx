import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider, ProtectedRoute } from './lib/context/AuthContext';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import MsaRepository from './pages/admin/MsaRepository';
import LegalAdvisors from './pages/admin/LegalAdvisors';
import Analytics from './pages/admin/Analytics';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
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
            <Route path="msa" element={<MsaRepository />} />
            <Route path="advisors" element={<LegalAdvisors />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
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

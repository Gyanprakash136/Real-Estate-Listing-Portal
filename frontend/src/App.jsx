import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Browse from './pages/customer/Browse'
import ListingDetail from './pages/customer/ListingDetail'
import CustomerInquiries from './pages/customer/Inquiries'
import ClientDashboard from './pages/client/Dashboard'
import AddListing from './pages/client/AddListing'
import ManageListings from './pages/client/ManageListings'
import AdminDashboard from './pages/admin/AdminDashboard'
import Chat from './pages/Chat'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listings/:id" element={<ListingDetail />} />

        {/* Customer */}
        <Route path="/my-inquiries" element={
          <ProtectedRoute role="customer"><CustomerInquiries /></ProtectedRoute>
        } />

        {/* Client */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>
        } />
        <Route path="/add-listing" element={
          <ProtectedRoute role="client"><AddListing /></ProtectedRoute>
        } />
        <Route path="/manage-listings" element={
          <ProtectedRoute role="client"><ManageListings /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><Chat /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

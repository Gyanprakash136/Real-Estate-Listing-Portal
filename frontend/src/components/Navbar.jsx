import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiHome, FiSearch, FiPlus, FiList, FiMail, FiLogOut, FiUser, FiBell, FiSettings } from 'react-icons/fi'

export default function Navbar() {
  const { user, logout, isClient, isCustomer, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="glass-panel" style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      height: 72,
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid rgba(15,23,42,0.05)',
      backgroundColor: 'rgba(255,255,255,0.95)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--primary)' }}>
            RealEstate.io
          </span>
        </Link>

        {/* Center Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <NavLink to="/browse" label="Market" active={isActive('/browse') || isActive('/')} />
          
          {isClient && (
            <>
              <NavLink to="/dashboard" label="Insights" active={isActive('/dashboard')} />
              <NavLink to="/manage-listings" label="Portfolio" active={isActive('/manage-listings')} />
            </>
          )}

          {isCustomer && (
            <NavLink to="/my-inquiries" label="Dossiers" active={isActive('/my-inquiries')} />
          )}

          {isAdmin && (
            <NavLink to="/admin" label="Admin Verify" active={isActive('/admin')} />
          )}

          {user && (
            <NavLink to="/chat" label="Chat" active={isActive('/chat')} />
          )}

          {!user && (
            <>
              <NavLink to="/about" label="Insights" active={isActive('/about')} />
              <NavLink to="/dossiers" label="Dossiers" active={isActive('/dossiers')} />
            </>
          )}
        </div>

        {/* Right Auth/Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer' }}>Support</span>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
              {isClient && (
                 <Link to="/add-listing" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-round)' }}>
                   List Property
                 </Link>
              )}
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--on-surface-variant)', marginRight: '0.5rem' }}>
                <FiBell size={18} style={{ cursor: 'pointer' }} />
              </div>

              {/* User Avatar & Dropdown */}
              <div 
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 700,
                  cursor: 'pointer', position: 'relative',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }} 
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {user.full_name?.[0]?.toUpperCase() || 'U'}

                {menuOpen && (
                  <div className="card-surface" style={{
                    position: 'absolute', top: '120%', right: 0,
                    width: 220, padding: '0.75rem', zIndex: 1100,
                    display: 'flex', flexDirection: 'column', gap: '0.25rem'
                  }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-container)', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 'var(--text-sm)' }}>{user.full_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--on-surface-variant)' }}>{user.email}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => navigate('/dashboard')}>
                      <FiUser /> Profile
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--error)' }} onClick={handleLogout}>
                      <FiLogOut /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-round)' }}>Join Now</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, label, active }) {
  return (
    <Link to={to} style={{
      fontSize: 'var(--text-sm)', fontWeight: 600,
      color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
      paddingBottom: '4px',
      borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
      transition: 'var(--transition)',
    }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--on-surface)'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--on-surface-variant)'; } }}
    >
      {label}
    </Link>
  )
}

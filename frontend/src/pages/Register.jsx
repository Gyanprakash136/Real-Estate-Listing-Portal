import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiLock, FiPhone, FiArrowRight } from 'react-icons/fi'
import { register as registerApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('customer')
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await registerApi({ ...data, role })
      login(res.data)
      toast.success(`Account created! Welcome, ${res.data.full_name} 🎉`)
      navigate(role === 'client' ? '/dashboard' : '/browse')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Join RealEstate.io
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create your free account today</p>
        </div>

        <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          {/* Role Selector */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>I want to...</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <RoleCard
                selected={role === 'customer'}
                onClick={() => setRole('customer')}
                emoji="🔍"
                title="Buy / Rent"
                desc="Browse and inquire about properties"
              />
              <RoleCard
                selected={role === 'client'}
                onClick={() => setRole('client')}
                emoji="🏠"
                title="List Property"
                desc="Post and manage your listings"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <FiUser style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('full_name', { required: 'Full name is required' })}
                  type="text" className="form-input"
                  style={{ paddingLeft: '2.5rem' }} placeholder="Your full name"
                />
              </div>
              {errors.full_name && <span className="form-error">{errors.full_name.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email" className="form-input"
                  style={{ paddingLeft: '2.5rem' }} placeholder="you@example.com"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <div style={{ position: 'relative' }}>
                <FiPhone style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('phone')}
                  type="tel" className="form-input"
                  style={{ paddingLeft: '2.5rem' }} placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                  type="password" className="form-input"
                  style={{ paddingLeft: '2.5rem' }} placeholder="Min 8 characters"
                />
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Creating account...' : <><span>Create Account</span><FiArrowRight /></>}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function RoleCard({ selected, onClick, emoji, title, desc }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: selected ? 'rgba(108,99,255,0.12)' : 'var(--bg-secondary)',
      border: `1px solid ${selected ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)', padding: '1rem', cursor: 'pointer',
      textAlign: 'left', transition: 'var(--transition)', color: 'var(--text-primary)',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{emoji}</div>
      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '0.25rem', color: selected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
        {title}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{desc}</div>
    </button>
  )
}

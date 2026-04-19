import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiLock, FiArrowRight } from 'react-icons/fi'
import { resetPassword } from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const password = watch('password', '')

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid or missing reset token.')
      return
    }
    
    setLoading(true)
    try {
      await resetPassword(token, data.password)
      toast.success('Password reset successfully! You can now log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Invalid Link</h2>
          <p>The password reset link is invalid or missing the token.</p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ marginTop: '1rem' }}>Request new link</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 56, height: 56, background: 'var(--gradient-accent)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '1.5rem', fontWeight: 800, color: 'white',
            fontFamily: 'Outfit, sans-serif',
          }}>!</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Choose a new password for your account</p>
        </div>

        <div style={{
          background: 'var(--gradient-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '2rem',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Resetting...' : <><span>Reset Password</span><FiArrowRight /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

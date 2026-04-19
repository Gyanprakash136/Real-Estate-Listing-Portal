import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiMail, FiArrowRight, FiArrowLeft } from 'react-icons/fi'
import { forgotPassword } from '../api/client'

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await forgotPassword(data.email)
      toast.success(res.data?.message || 'Password reset link sent!')
      setSubmitted(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, background: 'var(--gradient-success, linear-gradient(135deg, #10b981, #059669))', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '1.5rem', fontWeight: 800, color: 'white',
          }}>✓</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '1rem' }}>
            Check your email
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            We've sent a password reset link to your email address. Please check your inbox (and spam folder) to continue.
          </p>
          <Link to="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <FiArrowLeft /><span>Back to login</span>
          </Link>
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
          }}>?</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Forgot Password
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your email to receive a reset link</p>
        </div>

        <div style={{
          background: 'var(--gradient-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '2rem',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Sending link...' : <><span>Send Reset Link</span><FiArrowRight /></>}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

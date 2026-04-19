import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiMessageSquare, FiExternalLink, FiPhone, FiMail } from 'react-icons/fi'
import { getMyInquiries } from '../../api/client'

const STATUS_STYLE = {
  new: { bg: 'rgba(108,99,255,0.12)', color: '#6C63FF', border: 'rgba(108,99,255,0.3)' },
  read: { bg: 'rgba(245,166,35,0.12)', color: '#F5A623', border: 'rgba(245,166,35,0.3)' },
  responded: { bg: 'rgba(16,217,164,0.12)', color: '#10D9A4', border: 'rgba(16,217,164,0.3)' },
}

export default function CustomerInquiries() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getMyInquiries()
      .then(r => setInquiries(r.data))
      .catch(() => toast.error('Failed to load inquiries'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiMessageSquare style={{ color: 'var(--accent-primary)' }} />
            My Inquiries
          </h1>
          <p className="page-subtitle">{inquiries.length} inquiries sent</p>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          {['all', 'new', 'read', 'responded'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
              {f} ({f === 'all' ? inquiries.length : inquiries.filter(i => i.status === f).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📩</span>
            <h3>No inquiries yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Browse listings and send your first inquiry!</p>
            <Link to="/browse" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>Browse Listings</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(inq => {
              const s = STATUS_STYLE[inq.status] || STATUS_STYLE.new
              return (
                <div key={inq.id} style={{
                  background: 'var(--gradient-card)', border: `1px solid ${inq.status === 'responded' ? 'rgba(16,217,164,0.2)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '1.5rem',
                  borderLeft: `4px solid ${s.color}`,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <Link to={`/listings/${inq.listing_id}`} style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {inq.listing_title} <FiExternalLink size={13} style={{ color: 'var(--accent-primary)' }} />
                      </Link>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                        Sent on {new Date(inq.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'capitalize', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {inq.status}
                    </span>
                  </div>

                  {/* Your message */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>YOUR MESSAGE</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>{inq.message}</p>
                  </div>

                  {/* Owner response */}
                  {inq.client_response && (
                    <div style={{ background: 'rgba(16,217,164,0.06)', border: '1px solid rgba(16,217,164,0.15)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)', marginBottom: '0.375rem', fontWeight: 600 }}>OWNER RESPONSE</div>
                      <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>{inq.client_response}</p>
                    </div>
                  )}

                  {/* Contact info */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {inq.contact_email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        <FiMail size={11} /> {inq.contact_email}
                      </div>
                    )}
                    {inq.contact_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        <FiPhone size={11} /> {inq.contact_phone}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

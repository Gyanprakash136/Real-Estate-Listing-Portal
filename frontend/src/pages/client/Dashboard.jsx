import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPlus, FiEye, FiMessageSquare, FiList, FiTrendingUp, FiAlertCircle, FiGrid } from 'react-icons/fi'
import { getMyListings, getReceivedInquiries, updateInquiryStatus, formatPrice, acceptChatRequest } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function ClientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [l, i] = await Promise.all([getMyListings(), getReceivedInquiries()])
      setListings(l.data)
      setInquiries(i.data)
    } catch (err) {
      // Don't show toast on polling errors to avoid annoyance, only on initial load
      if (loading) toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0)
  const totalInquiries = inquiries.length
  const activeListings = listings.filter(l => l.status === 'active').length
  const newInquiries = inquiries.filter(i => i.status === 'new').length

  const handleMarkRead = async (inqId) => {
    try {
      await updateInquiryStatus(inqId, { status: 'read' })
      setInquiries(prev => prev.map(i => i.id === inqId ? { ...i, status: 'read' } : i))
    } catch { toast.error('Update failed') }
  }

  const handleAcceptChat = async (inqId) => {
    try {
      await acceptChatRequest(inqId)
      toast.success('Chat accepted!')
      navigate('/chat')
    } catch { toast.error('Failed to start chat') }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Good {timeGreeting()}, {user?.full_name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's what's happening with your listings</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className={`btn btn-ghost ${loading ? 'loading' : ''}`} onClick={fetchData}>
              <FiTrendingUp /> Refresh
            </button>
            <Link to="/add-listing" className="btn btn-primary">
              <FiPlus /> Add Listing
            </Link>
          </div>
        </div>

        {listings.some(l => l.stale_flagged && l.status === 'active') && (
          <div style={{
            background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)',
            borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '2rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{ fontSize: '1.5rem' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-red)' }}>Action Required: Stale Listings Detected</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Some of your listings have been flagged as stale due to low activity. Please update or promote them to avoid automatic removal.
              </div>
            </div>
            <Link to="/manage-listings" className="btn btn-secondary btn-sm">Review Flagged</Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
          <StatCard icon={<FiList />} color="purple" label="Total Listings" value={listings.length} />
          <StatCard icon={<FiGrid />} color="green" label="Active" value={activeListings} />
          <StatCard icon={<FiEye />} color="gold" label="Total Views" value={totalViews} />
          <StatCard icon={<FiMessageSquare />} color="red" label="New Inquiries" value={newInquiries} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Recent Listings */}
          <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)' }}>Your Listings</h2>
              <Link to="/manage-listings" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)' }}>View all →</Link>
            </div>
            <div>
              {listings.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem' }}>
                  <span className="empty-state-icon">🏠</span>
                  <h3>No listings yet</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Start by adding your first property</p>
                  <Link to="/add-listing" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>Add Listing</Link>
                </div>
              ) : listings.slice(0, 5).map(l => (
                <Link key={l.id} to={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'var(--transition)', cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{l.city}, {l.state}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>{formatPrice(l.price)}</span>
                      <StatusBadge status={l.status} />
                      <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                        <span>👁 {l.view_count || 0}</span>
                        <span>💬 {l.inquiry_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Inquiries */}
          <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                Recent Inquiries
                {newInquiries > 0 && (
                  <span style={{
                    marginLeft: 8, background: 'rgba(255,87,87,0.15)', color: 'var(--accent-red)',
                    border: '1px solid rgba(255,87,87,0.2)', borderRadius: 20,
                    padding: '1px 8px', fontSize: 'var(--text-xs)', fontWeight: 700,
                  }}>{newInquiries} new</span>
                )}
              </h2>
            </div>
            <div>
              {inquiries.length === 0 ? (
                <div className="empty-state" style={{ padding: '2.5rem' }}>
                  <span className="empty-state-icon">📩</span>
                  <h3>No inquiries yet</h3>
                </div>
              ) : inquiries.slice(0, 6).map(inq => (
                <div key={inq.id} style={{
                  padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
                  background: inq.status === 'new' ? 'rgba(108,99,255,0.03)' : 'transparent',
                  borderLeft: inq.status === 'new' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{inq.customer_name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {inq.status === 'new' && (
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleMarkRead(inq.id)}>
                          Mark read
                        </button>
                      )}
                      {inq.status !== 'accepted' ? (
                        <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleAcceptChat(inq.id)}>
                          Accept & Chat
                        </button>
                      ) : (
                        <Link to="/chat" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>View Chat</Link>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>Re: {inq.listing_title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inq.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, color, label, value }) {
  const colors = {
    purple: { bg: 'rgba(108,99,255,0.12)', color: '#6C63FF' },
    green: { bg: 'rgba(16,217,164,0.12)', color: '#10D9A4' },
    gold: { bg: 'rgba(245,166,35,0.12)', color: '#F5A623' },
    red: { bg: 'rgba(255,87,87,0.12)', color: '#FF5757' },
  }
  const c = colors[color]
  return (
    <div className="stat-card">
      <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { active: 'badge-active', pending: 'badge-pending', stale: 'badge-stale', sold: 'badge-sold' }
  return <span className={`badge ${map[status] || ''}`} style={{ fontSize: '0.65rem' }}>{status}</span>
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

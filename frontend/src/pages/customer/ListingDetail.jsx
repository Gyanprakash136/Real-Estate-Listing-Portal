import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiDroplet, FiMaximize, FiMapPin, FiEye, FiMessageSquare, FiPhone, FiMail, FiArrowLeft, FiStar, FiCalendar } from 'react-icons/fi'
import { FaBed } from 'react-icons/fa'
import { getListing, submitInquiry, formatPrice } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { SingleListingMap } from '../../components/MapView'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    getListing(id)
      .then(r => setListing(r.data))
      .catch(() => { toast.error('Listing not found'); navigate('/browse') })
      .finally(() => setLoading(false))
  }, [id])

  const onSubmitInquiry = async (data) => {
    if (!user) { toast.error('Please login to send an inquiry'); navigate('/login'); return }
    if (user.role !== 'customer') { toast.error('Only customers can send inquiries'); return }
    setSubmitting(true)
    try {
      await submitInquiry({ listing_id: id, ...data })
      toast.success('Inquiry sent! The owner will contact you soon. 📩')
      reset()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit inquiry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!listing) return null

  const images = listing.images || []

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1100 }}>
        {/* Back */}
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }} onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back to listings
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Image Gallery */}
            <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {images.length > 0 ? (
                <>
                  <div style={{ height: 380, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                    <img
                      src={images[activeImg]?.startsWith('http') ? images[activeImg] : `${BASE_URL}${images[activeImg]}`}
                      alt={listing.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  {images.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', overflowX: 'auto' }}>
                      {images.map((img, i) => (
                        <div key={i} onClick={() => setActiveImg(i)} style={{
                          width: 72, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                          cursor: 'pointer', border: `2px solid ${i === activeImg ? 'var(--accent-primary)' : 'transparent'}`,
                          opacity: i === activeImg ? 1 : 0.6, transition: 'var(--transition)',
                        }}>
                          <img
                            src={img?.startsWith('http') ? img : `${BASE_URL}${img}`}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', opacity: 0.3 }}>🏠</div>
              )}
            </div>

            {/* Details Card */}
            <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
              {/* Status & Type */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'capitalize', background: 'rgba(108,99,255,0.12)', color: 'var(--accent-primary)', border: '1px solid rgba(108,99,255,0.2)' }}>
                  {listing.property_type}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'capitalize', background: listing.status === 'active' ? 'rgba(16,217,164,0.12)' : 'rgba(245,166,35,0.12)', color: listing.status === 'active' ? 'var(--accent-green)' : 'var(--accent-gold)', border: '1px solid rgba(16,217,164,0.2)' }}>
                  {listing.status}
                </span>
                {listing.stale_flagged && <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 'var(--text-xs)', fontWeight: 600, background: 'rgba(255,87,87,0.12)', color: 'var(--accent-red)', border: '1px solid rgba(255,87,87,0.2)' }}>⚠ Stale</span>}
              </div>

              <div className="price-tag" style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.75rem' }}>
                {formatPrice(listing.price)}
              </div>

              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                {listing.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginBottom: '1.5rem' }}>
                <FiMapPin size={14} />
                {listing.address}, {listing.city}, {listing.state} {listing.zip_code && `- ${listing.zip_code}`}
              </div>

              {/* Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {listing.bedrooms != null && <SpecCard icon={<FaBed />} label="Bedrooms" val={listing.bedrooms} />}
                {listing.bathrooms != null && <SpecCard icon={<FiDroplet />} label="Bathrooms" val={listing.bathrooms} />}
                {listing.area_sqft && <SpecCard icon={<FiMaximize />} label="Area" val={`${listing.area_sqft} sqft`} />}
                {listing.price_per_sqft && <SpecCard icon="₹" label="Per sqft" val={`₹${listing.price_per_sqft}`} />}
                {listing.neighborhood_score && <SpecCard icon={<FiStar />} label="Score" val={`${listing.neighborhood_score}/10`} />}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  <FiEye size={14} />{listing.view_count || 0} views
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  <FiMessageSquare size={14} />{listing.inquiry_count || 0} inquiries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  <FiCalendar size={14} />Listed {new Date(listing.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.75rem' }}>About this property</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1.5rem' }}>{listing.description}</p>
                </>
              )}

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.75rem' }}>Amenities</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {listing.amenities.map(a => (
                      <span key={a} style={{ padding: '4px 12px', background: 'rgba(16,217,164,0.08)', color: 'var(--accent-green)', border: '1px solid rgba(16,217,164,0.15)', borderRadius: 20, fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Map */}
            <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '1rem' }}>📍 Property Location</h3>
              <SingleListingMap latitude={listing.latitude} longitude={listing.longitude} title={listing.title} address={listing.address} />
            </div>
          </div>

          {/* Right column — Contact + Owner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: 80 }}>
            {/* Owner Card */}
            {listing.client_name && (
              <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.75rem', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Listed By</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 44, height: 44, background: 'var(--gradient-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: 'white', fontFamily: 'Outfit' }}>
                    {listing.client_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{listing.client_name}</div>
                    {listing.client_phone && (
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: 2 }}>
                        <FiPhone size={11} /> {listing.client_phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Inquiry Form */}
            <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '1.25rem' }}>Send Inquiry</h3>

              {!user ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: 'var(--text-sm)' }}>Login as a customer to contact the owner</p>
                  <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Login to Inquire</Link>
                </div>
              ) : user.role !== 'customer' ? (
                <div style={{ padding: '1rem', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--accent-gold)' }}>
                  ⚠ Clients cannot send inquiries. Switch to a customer account.
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmitInquiry)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Your Message *</label>
                    <textarea
                      {...register('message', { required: 'Message is required' })}
                      className="form-input form-textarea"
                      style={{ minHeight: 100 }}
                      placeholder="Hello, I'm interested in this property..."
                    />
                    {errors.message && <span className="form-error">{errors.message.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Email *</label>
                    <input
                      {...register('contact_email', { required: 'Email required' })}
                      type="email" className="form-input"
                      defaultValue={user?.email}
                      placeholder="your@email.com"
                    />
                    {errors.contact_email && <span className="form-error">{errors.contact_email.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone (optional)</label>
                    <input {...register('contact_phone')} type="tel" className="form-input" placeholder="+91 ..." />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
                    {submitting ? 'Sending...' : <><FiMail /> Send Inquiry</>}
                  </button>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Your inquiry is sent via Kafka event stream
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SpecCard({ icon, label, val }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{val}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

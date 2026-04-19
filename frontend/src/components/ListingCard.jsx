import React from 'react'
import { Link } from 'react-router-dom'
import { FiDroplet, FiMaximize, FiMapPin, FiEye, FiMessageSquare } from 'react-icons/fi'
import { FaBed } from 'react-icons/fa'
import { formatPrice } from '../api/client'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATUS_CHIP = {
  active:   'chip-positive',
  pending:  'chip-neutral',
  stale:    'chip-neutral',
  sold:     'chip-neutral',
}

const TYPE_ICONS = {
  apartment: '🏢', house: '🏠', villa: '🏡', plot: '🌳', commercial: '🏬', penthouse: '🏙️'
}

export default function ListingCard({ listing, showStatus = false, actions = null }) {
  const imgUrl = listing.images?.[0]
  const img = imgUrl
    ? (imgUrl.startsWith('http') ? imgUrl : `${BASE_URL}${imgUrl}`)
    : null

  const chipClass = STATUS_CHIP[listing.status] || 'chip-neutral'

  return (
    <Link to={`/listings/${listing.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div className="card-surface" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Image / Header Block */}
        <div style={{ position: 'relative', height: 260, background: 'var(--surface-container)' }}>
          {img ? (
            <img
              src={img}
              alt={listing.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.3 }}>
              {TYPE_ICONS[listing.property_type] || '🏠'}
            </div>
          )}

          {/* Gradient overlay for better text readability */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, transparent 40%, rgba(15,23,42,0.6) 100%)',
            pointerEvents: 'none'
          }} />

          {/* Type Badge */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(255,255,255,0.95)', padding: '6px 14px', borderRadius: 'var(--radius-round)',
            fontSize: '11px', fontWeight: 700, color: 'var(--on-surface)',
            display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            {TYPE_ICONS[listing.property_type]} {listing.property_type}
          </div>

          {/* Status Badge */}
          {(showStatus || listing.status === 'sold') && (
            <div className={`chip ${listing.status === 'sold' ? 'chip-danger' : chipClass}`} style={{
              position: 'absolute', top: 16, right: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              background: listing.status === 'sold' ? 'var(--error)' : undefined,
              color: listing.status === 'sold' ? 'white' : undefined,
              zIndex: 10
            }}>
              {listing.status === 'sold' ? 'SOLD' : listing.status}
            </div>
          )}

          {/* Price Tag */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, color: '#fff', zIndex: 10 }}>
            {listing.status === 'sold' && listing.sold_price ? (
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, opacity: 0.8, marginBottom: -2 }}>Final Sold Price</div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: '#10D9A4' }}>
                  {formatPrice(listing.sold_price)}
                </div>
                <div style={{ fontSize: '11px', textDecoration: 'line-through', opacity: 0.6 }}>List: {formatPrice(listing.price)}</div>
              </div>
            ) : (
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {formatPrice(listing.price)}
              </div>
            )}
          </div>
        </div>

        {/* Data Intel Block */}
        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-container-lowest)' }}>
          
          <h3 style={{
            fontFamily: 'Inter, sans-serif', fontSize: 'var(--text-lg)', fontWeight: 700,
            color: 'var(--on-surface)', marginBottom: '0.5rem', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {listing.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--on-surface-variant)', fontSize: 'var(--text-sm)', marginBottom: '1.25rem' }}>
            <FiMapPin size={14} color="var(--secondary)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {listing.city}, {listing.state}
            </span>
          </div>

          {/* Architectural Specs */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-container)' }}>
            {listing.bedrooms != null && (
              <SpecItem icon={<FaBed size={16} color="var(--secondary)" />} val={`${listing.bedrooms} Beds`} />
            )}
            {listing.bathrooms != null && (
              <SpecItem icon={<FiDroplet size={16} color="var(--secondary)" />} val={`${listing.bathrooms} Baths`} />
            )}
            {listing.area_sqft && (
              <SpecItem icon={<FiMaximize size={16} color="var(--secondary)" />} val={`${listing.area_sqft.toLocaleString()} sqft`} />
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Footer Metrics */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <StatItem icon={<FiEye size={14} />} val={listing.view_count || 0} />
              <StatItem icon={<FiMessageSquare size={14} />} val={listing.inquiry_count || 0} />
            </div>
          </div>

          {/* List/Client Actions */}
          {actions && (
            <div onClick={e => e.preventDefault()} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function SpecItem({ icon, val }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--on-surface-variant)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
      {icon} <span style={{ marginLeft: '2px' }}>{val}</span>
    </div>
  )
}

function StatItem({ icon, val }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--on-surface-variant)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
      {icon}<span>{val}</span>
    </div>
  )
}

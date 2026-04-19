import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiEdit2, FiTrash2, FiEye, FiMessageSquare, FiPlus, FiAlertCircle } from 'react-icons/fi'
import { getMyListings, deleteListing, updateListing, formatPrice, markAsSold } from '../../api/client'
import ListingCard from '../../components/ListingCard'

export default function ManageListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    getMyListings()
      .then(r => setListings(r.data))
      .catch(() => toast.error('Failed to load listings'))
      .finally(() => setLoading(false))
  }, [])

  const handleMarkSold = async (id, title) => {
    const price = prompt(`Enter final sold price for "${title}":`, "")
    if (price === null) return // Cancelled
    
    const soldPrice = parseFloat(price)
    if (isNaN(soldPrice)) {
      toast.error('Invalid price entered')
      return
    }

    try {
      const res = await markAsSold(id, soldPrice)
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'sold', sold_price: soldPrice } : l))
      toast.success('Listing marked as SOLD! 💸')
    } catch {
      toast.error('Failed to mark as sold')
    }
  }

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await deleteListing(id)
      setListings(prev => prev.filter(l => l.id !== id))
      toast.success('Listing deleted')
    } catch {
      toast.error('Failed to delete listing')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const form = new FormData()
      form.append('status', newStatus)
      const res = await updateListing(id, form)
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
      toast.success(`Listing ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filtered = filter === 'all' ? listings : listings.filter(l => l.status === filter)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Manage Listings</h1>
            <p className="page-subtitle">{listings.length} total listings</p>
          </div>
          <Link to="/add-listing" className="btn btn-primary">
            <FiPlus /> Add New Listing
          </Link>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'pending', 'stale', 'sold'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
              {f} {f === 'all' ? `(${listings.length})` : `(${listings.filter(l => l.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🏠</span>
            <h3>No {filter !== 'all' ? filter : ''} listings found</h3>
            <Link to="/add-listing" className="btn btn-primary btn-sm">Add Listing</Link>
          </div>
        ) : (
          <div className="grid-listings">
            {filtered.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                showStatus
                actions={
                  <>
                    <Link to={`/listings/${listing.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      <FiEye size={13} /> View
                    </Link>

                    {listing.status === 'active' && (
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-gold)' }}
                        onClick={() => handleStatusChange(listing.id, 'withdrawn')}>
                        Withdraw
                      </button>
                    )}
                    {listing.status === 'withdrawn' && (
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-green)' }}
                        onClick={() => handleStatusChange(listing.id, 'active')}>
                        Reactivate
                      </button>
                    )}
                    {listing.status === 'sold' ? null : (
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        disabled={deletingId === listing.id}
                        onClick={() => handleDelete(listing.id, listing.title)}
                      >
                        <FiTrash2 size={13} /> {deletingId === listing.id ? '...' : 'Delete'}
                      </button>
                    )}
                    {listing.status === 'active' && (
                      <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', background: 'var(--tertiary)' }}
                        onClick={() => handleMarkSold(listing.id, listing.title)}>
                        Mark Sold
                      </button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

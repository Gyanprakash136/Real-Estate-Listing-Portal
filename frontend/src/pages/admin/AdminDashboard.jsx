import React, { useState, useEffect, useRef } from 'react'
import { getAdminListings, verifyListing, rejectListing, bulkImportListings, exportTrainingData } from '../../api/client'
import toast from 'react-hot-toast'
import { FiCheck, FiX, FiClock, FiUpload, FiDownload, FiFileText } from 'react-icons/fi'
import { formatPrice } from '../../api/client'

export default function AdminDashboard() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef(null)

  const fetchListings = async () => {
    try {
      const res = await getAdminListings()
      setListings(res.data)
    } catch (err) {
      toast.error('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
    // Polling every 10 seconds to catch listings processed by Airflow
    const interval = setInterval(fetchListings, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleVerify = async (id) => {
    try {
      await verifyListing(id)
      toast.success('Listing verified and live!')
      fetchListings()
    } catch (err) {
      toast.error('Verification failed')
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectListing(id)
      toast.success('Listing rejected')
      fetchListings()
    } catch (err) {
      toast.error('Rejection failed')
    }
  }

  const handleBulkImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImporting(true)
    const toastId = toast.loading('Importing listings...')
    
    try {
      const res = await bulkImportListings(file)
      toast.success(res.data.message, { id: toastId, duration: 5000 })
      fetchListings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed', { id: toastId })
    } finally {
      setImporting(false)
      e.target.value = null // reset input
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    const toastId = toast.loading('Generating export...')
    try {
      const response = await exportTrainingData()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'realestate_training_data.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download started!', { id: toastId })
    } catch (err) {
      toast.error('Failed to export data', { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="page"><div className="container"><div className="loading-screen"><div className="spinner" /></div></div></div>

  const pending = listings.filter(l => l.status === 'pending')
  const active = listings.filter(l => l.status === 'active')

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Review and verify property listings.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className={`btn btn-ghost ${loading ? 'loading' : ''}`} onClick={fetchListings} style={{ minWidth: 'auto' }}>
              <FiClock /> Refresh
            </button>
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleBulkImport} 
            />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()} disabled={importing}>
              <FiUpload /> {importing ? 'Importing...' : 'Bulk Import'}
            </button>
            <a href="http://localhost:8000/uploads/listing_template.csv" download className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>
              <FiDownload /> Template
            </a>
            <button 
              className="btn btn-primary" 
              onClick={handleExportData}
              disabled={exporting}
              style={{ background: 'var(--secondary)', color: '#fff' }}
            >
              <FiFileText /> {exporting ? 'Exporting...' : 'Export ML Data'}
            </button>
          </div>
        </div>

        {pending.length > 0 && (
          <div style={{
            background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)',
            borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '2rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{ fontSize: '1.5rem' }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>Action Required: {pending.length} pending listings</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--on-surface-variant)' }}>These properties have passed automated deduplication and are waiting for your final verification.</div>
            </div>
          </div>
        )}

        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiClock color="var(--tertiary)" /> Pending Verification ({pending.length})
        </h2>
        
        {pending.length === 0 ? (
          <div className="card-surface" style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)', marginBottom: '3rem' }}>
            No pending listings.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
            {pending.map(l => (
              <AdminListingRow key={l.id} listing={l} onVerify={() => handleVerify(l.id)} onReject={() => handleReject(l.id)} />
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem', color: 'var(--on-surface)' }}>
          Recently Verified ({active.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {active.slice(0, 10).map(l => (
            <AdminListingRow key={l.id} listing={l} />
          ))}
          {active.length === 0 && <div style={{ color: 'var(--on-surface-variant)', fontSize: 'var(--text-sm)' }}>No active listings yet.</div>}
        </div>

      </div>
    </div>
  )
}

function AdminListingRow({ listing, onVerify, onReject }) {
  return (
    <div className="card-surface" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>{listing.title}</h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>
          {listing.address}, {listing.city}, {listing.state} • {listing.property_type}
        </p>
        <div style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{formatPrice(listing.price)}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>
          Listed by: {listing.client_name || 'Unknown'}
        </div>
      </div>
      
      {listing.status === 'pending' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onReject} style={{ color: 'var(--error)' }}>
            <FiX /> Reject
          </button>
          <button className="btn btn-primary" onClick={onVerify} style={{ background: 'var(--tertiary)', color: '#fff' }}>
            <FiCheck /> Verify & Publish
          </button>
        </div>
      )}
      {listing.status === 'active' && (
        <div className="chip chip-positive">
          Active
        </div>
      )}
    </div>
  )
}

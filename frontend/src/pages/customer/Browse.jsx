import React, { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiMap, FiGrid, FiFilter, FiX } from 'react-icons/fi'
import { searchListings } from '../../api/client'
import ListingCard from '../../components/ListingCard'
import { BrowseMap } from '../../components/MapView'
import toast from 'react-hot-toast'

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'plot', 'commercial', 'penthouse']

export default function Browse() {
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({ q: '', city: '', state: '', property_type: '', min_price: '', max_price: '', min_bedrooms: '', sort_by: 'created_at', sort_dir: 'desc' })

  const limit = 12

  const fetchListings = useCallback(async (currentFilters = filters, currentPage = page) => {
    setLoading(true)
    try {
      const params = { skip: currentPage * limit, limit, ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v !== '')) }
      const res = await searchListings(params)
      setListings(res.data.items)
      setTotal(res.data.total)
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchListings() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
    fetchListings(filters, 0)
  }

  const updateFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }))

  const clearFilters = () => {
    const cleared = { q: '', city: '', state: '', property_type: '', min_price: '', max_price: '', min_bedrooms: '', sort_by: 'created_at', sort_dir: 'desc' }
    setFilters(cleared)
    setPage(0)
    fetchListings(cleared, 0)
  }

  const totalPages = Math.ceil(total / limit)
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => v && k !== 'sort_by' && k !== 'sort_dir')

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title">Browse Properties</h1>
          <p className="page-subtitle">{total.toLocaleString()} listings available across India</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" value={filters.q} onChange={e => updateFilter('q', e.target.value)}
              placeholder="Search by title, city, description..."
              className="form-input" style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <input type="text" value={filters.city} onChange={e => updateFilter('city', e.target.value)} placeholder="City" className="form-input" style={{ width: 140 }} />
          <button type="submit" className="btn btn-primary"><FiSearch /> Search</button>
          <button type="button" className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowFilters(v => !v)}>
            <FiFilter /> Filters {hasActiveFilters && '•'}
          </button>
          <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--bg-secondary)', padding: '0.375rem', borderRadius: 'var(--radius-round)', border: '1px solid var(--border)' }}>
            <button type="button" className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.4rem 0.75rem' }} onClick={() => setViewMode('grid')}><FiGrid /></button>
            <button type="button" className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.4rem 0.75rem' }} onClick={() => setViewMode('map')}><FiMap /></button>
          </div>
        </form>

        {/* Quick Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.25rem', fontWeight: 600 }}>QUICK FILTERS:</span>
          {['apartment', 'house', 'villa', 'plot'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { const val = filters.property_type === t ? '' : t; updateFilter('property_type', val); fetchListings({ ...filters, property_type: val }, 0) }}
              style={{
                padding: '0.375rem 1rem', borderRadius: 20, fontSize: 'var(--text-xs)',
                cursor: 'pointer', transition: 'var(--transition)',
                background: filters.property_type === t ? 'rgba(108,99,255,0.15)' : 'var(--bg-secondary)',
                color: filters.property_type === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${filters.property_type === t ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
                fontWeight: 600
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="card-surface" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <select value={filters.property_type} onChange={e => updateFilter('property_type', e.target.value)} className="form-input form-select">
                <option value="">All Types</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Min Price (₹)</label>
              <input type="number" value={filters.min_price} onChange={e => updateFilter('min_price', e.target.value)} className="form-input" placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Max Price (₹)</label>
              <input type="number" value={filters.max_price} onChange={e => updateFilter('max_price', e.target.value)} className="form-input" placeholder="Any" />
            </div>
            <div className="form-group">
              <label className="form-label">Min Bedrooms</label>
              <input type="number" value={filters.min_bedrooms} onChange={e => updateFilter('min_bedrooms', e.target.value)} className="form-input" placeholder="Any" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input type="text" value={filters.state} onChange={e => updateFilter('state', e.target.value)} className="form-input" placeholder="e.g. Maharashtra" />
            </div>
            <div className="form-group">
              <label className="form-label">Sort By</label>
              <select value={`${filters.sort_by}:${filters.sort_dir}`} onChange={e => { const [b, d] = e.target.value.split(':'); updateFilter('sort_by', b); updateFilter('sort_dir', d) }} className="form-input form-select">
                <option value="created_at:desc">Newest First</option>
                <option value="price:asc">Price: Low to High</option>
                <option value="price:desc">Price: High to Low</option>
                <option value="view_count:desc">Most Popular</option>
                <option value="area_sqft:desc">Largest Area</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSearch}>Apply Filters</button>
              {hasActiveFilters && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters} title="Clear Filters"><FiX /></button>
              )}
            </div>
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="card-surface" style={{ padding: '0.5rem', overflow: 'hidden' }}>
              <BrowseMap listings={listings} onListingClick={(l) => window.open(`/listings/${l.id}`, '_blank')} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 'var(--text-sm)', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
              Showing {listings.filter(l => l.latitude && l.longitude).length} geo-located properties
            </div>
          </div>
        )}

        {/* Grid View */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-surface" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="card-surface" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: 'var(--radius-round)', background: 'var(--surface-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
              color: 'var(--on-surface-variant)'
            }}>
              <FiSearch size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-2xl)', color: 'var(--on-surface)', marginBottom: '0.5rem' }}>No properties found</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 'var(--text-lg)', marginBottom: '2rem' }}>
              We couldn't find any listings matching your exact criteria.
            </p>
            <button className="btn btn-primary btn-lg" onClick={clearFilters}>View All Properties</button>
          </div>
        ) : (
          <>
            <div className="grid-listings" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '4rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); fetchListings(filters, p); window.scrollTo({top: 0, behavior: 'smooth'}) }}>← Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                  <button key={i} className={`btn btn-sm ${page === i ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setPage(i); fetchListings(filters, i); window.scrollTo({top: 0, behavior: 'smooth'}) }}>{i + 1}</button>
                ))}
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => { const p = page + 1; setPage(p); fetchListings(filters, p); window.scrollTo({top: 0, behavior: 'smooth'}) }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

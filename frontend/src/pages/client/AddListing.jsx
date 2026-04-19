import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { FiUpload, FiX, FiMapPin, FiPlus } from 'react-icons/fi'
import { createListing } from '../../api/client'
import { LocationPicker } from '../../components/MapView'

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'plot', 'commercial', 'penthouse']
const AMENITIES_LIST = ['Parking', 'Swimming Pool', 'Gym', 'Security', 'Lift', 'Garden', 'Power Backup', 'Water Supply', 'AC', 'Furnished']

export default function AddListing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [selectedAmenities, setSelectedAmenities] = useState([])

  const { register, handleSubmit, formState: { errors } } = useForm()

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImages(prev => [...prev, ...files])
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...urls])
  }

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleAmenity = (a) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') formData.append(k, v) })
      if (lat) formData.append('latitude', lat)
      if (lng) formData.append('longitude', lng)
      formData.append('amenities', JSON.stringify(selectedAmenities))
      images.forEach(img => formData.append('images', img))

      await createListing(formData)
      toast.success('Listing submitted! It will go live after deduplication (within 15 min). 🚀')
      navigate('/manage-listings')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create listing.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1 className="page-title">Add New Listing</h1>
          <p className="page-subtitle">Fill in the property details below. Your listing will be live after Airflow deduplication.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Basic Info */}
          <Section title="Basic Information">
            <div className="form-group">
              <label className="form-label">Property Title *</label>
              <input {...register('title', { required: true })} className="form-input" placeholder="e.g. Modern 3BHK Apartment in Bandra West" />
              {errors.title && <span className="form-error">Title is required</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea {...register('description')} className="form-input form-textarea" placeholder="Describe the property..." />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input {...register('price', { required: true, min: 1 })} type="number" className="form-input" placeholder="5000000" />
                {errors.price && <span className="form-error">Valid price required</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Property Type *</label>
                <select {...register('property_type', { required: true })} className="form-input form-select">
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Bedrooms</label>
                <input {...register('bedrooms')} type="number" min="0" className="form-input" placeholder="3" />
              </div>
              <div className="form-group">
                <label className="form-label">Bathrooms</label>
                <input {...register('bathrooms')} type="number" min="0" className="form-input" placeholder="2" />
              </div>
              <div className="form-group">
                <label className="form-label">Area (sqft)</label>
                <input {...register('area_sqft')} type="number" min="0" className="form-input" placeholder="1200" />
              </div>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input {...register('address', { required: 'Address is required', setValueAs: v => v?.trim() })} className="form-input" placeholder="123, Street Name, Area" />
                {errors.address && <span className="form-error">{errors.address.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input {...register('zip_code')} className="form-input" placeholder="400001" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input {...register('city', { required: 'City is required', setValueAs: v => v?.trim() })} className="form-input" placeholder="Mumbai" />
                {errors.city && <span className="form-error">{errors.city.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input {...register('state', { required: 'State is required', setValueAs: v => v?.trim() })} className="form-input" placeholder="Maharashtra" />
                {errors.state && <span className="form-error">{errors.state.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <FiMapPin /> Pin Location on Map
              </label>
              <LocationPicker lat={lat} lng={lng} onLocationChange={(la, lo) => { setLat(la); setLng(lo) }} />
              {lat && lng && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)', marginTop: '0.5rem' }}>
                  ✓ Location set: {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
              )}
            </div>
          </Section>

          {/* Images */}
          <Section title="Property Photos">
            <div style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
              padding: '2rem', textAlign: 'center', cursor: 'pointer',
              transition: 'var(--transition)',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => document.getElementById('img-upload').click()}
            >
              <FiUpload size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Click to upload photos</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>JPG, PNG up to 10MB each</div>
              <input id="img-upload" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageChange} />
            </div>

            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 100 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(i)} style={{
                      position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)',
                      color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Amenities */}
          <Section title="Amenities">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {AMENITIES_LIST.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{
                  padding: '0.375rem 1rem', borderRadius: 20, fontSize: 'var(--text-sm)',
                  cursor: 'pointer', transition: 'var(--transition)',
                  background: selectedAmenities.includes(a) ? 'rgba(108,99,255,0.15)' : 'var(--bg-secondary)',
                  color: selectedAmenities.includes(a) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${selectedAmenities.includes(a) ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
                  fontWeight: selectedAmenities.includes(a) ? 600 : 400,
                }}>
                  {selectedAmenities.includes(a) ? '✓ ' : ''}{a}
                </button>
              ))}
            </div>
          </Section>

          {/* Info banner */}
          <div style={{
            background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: 'var(--text-sm)',
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <div>
              <strong style={{ color: 'var(--accent-primary)' }}>Data Pipeline Active</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                Your listing will be published as a <strong>Kafka event</strong> and deduped by Airflow within 15 minutes before going live.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Submitting...' : <><FiPlus /> Submit Listing</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  )
}

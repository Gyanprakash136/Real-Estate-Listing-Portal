import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom purple marker
const purpleIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 14)
    }
  }, [lat, lng, map])
  return null
}

// ─── Single listing map (detail page) ───────────────────────────
export function SingleListingMap({ latitude, longitude, title, address }) {
  if (!latitude || !longitude) {
    return (
      <div style={{
        height: 300, borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem',
      }}>
        <span style={{ fontSize: '2rem' }}>🗺</span>
        <span>Location not available</span>
      </div>
    )
  }

  return (
    <div style={{ height: 300, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={purpleIcon}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>{title}</strong>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>{address}</span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

// ─── Location picker (add listing form) ─────────────────────────
export function LocationPicker({ lat, lng, onLocationChange }) {
  const defaultCenter = [20.5937, 78.9629] // Center of India

  return (
    <div style={{ height: 350, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000,
        background: 'rgba(8,12,30,0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 12px', borderRadius: 8, fontSize: '0.75rem', color: '#8892B0',
      }}>
        📍 Click on the map to set your property location
        {lat && lng && <span style={{ color: '#10D9A4', marginLeft: 8 }}>
          ✓ Selected: {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>}
      </div>
      <MapContainer
        center={lat && lng ? [lat, lng] : defaultCenter}
        zoom={lat && lng ? 14 : 5}
        style={{ height: '100%', width: '100%' }}
        onClick={(e) => onLocationChange(e.latlng.lat, e.latlng.lng)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onLocationChange={onLocationChange} />
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} icon={purpleIcon}>
              <Popup>Property Location</Popup>
            </Marker>
            <RecenterMap lat={lat} lng={lng} />
          </>
        )}
      </MapContainer>
    </div>
  )
}

function ClickHandler({ onLocationChange }) {
  const map = useMap()
  useEffect(() => {
    const handleClick = (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng)
    }
    map.on('click', handleClick)
    return () => map.off('click', handleClick)
  }, [map, onLocationChange])
  return null
}

// ─── Multi-listing browse map ────────────────────────────────────
export function BrowseMap({ listings, onListingClick }) {
  const defaultCenter = [20.5937, 78.9629]
  const validListings = listings.filter(l => l.latitude && l.longitude)

  return (
    <div style={{ height: 500, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer
        center={validListings.length > 0 ? [validListings[0].latitude, validListings[0].longitude] : defaultCenter}
        zoom={validListings.length > 0 ? 10 : 5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validListings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.latitude, listing.longitude]}
            icon={purpleIcon}
            eventHandlers={{ click: () => onListingClick?.(listing) }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                <strong style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>{listing.title}</strong>
                <div style={{ color: '#F5A623', fontWeight: 700, marginBottom: 4 }}>
                  ₹{Number(listing.price).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{listing.city}, {listing.state}</div>
                <button
                  onClick={() => window.location.href = `/listings/${listing.id}`}
                  style={{
                    marginTop: 8, padding: '4px 12px', background: '#6C63FF',
                    color: 'white', border: 'none', borderRadius: 6,
                    cursor: 'pointer', fontSize: '0.75rem', width: '100%',
                  }}
                >
                  View Details →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default SingleListingMap

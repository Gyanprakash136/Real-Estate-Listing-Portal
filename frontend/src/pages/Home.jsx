import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch, FiSliders, FiDatabase, FiLayers, FiActivity, FiArrowRight, FiShield, FiHome, FiTrendingUp } from 'react-icons/fi'

const features = [
  {
    icon: <FiShield size={24} />,
    title: 'Verified Listings',
    desc: 'Every property is strictly vetted by our admin team before hitting the market, ensuring complete transparency and trust.',
  },
  {
    icon: <FiHome size={24} />,
    title: 'Premium Properties',
    desc: 'Discover exclusive, high-end real estate portfolios tailored for discerning buyers and investors.',
  },
  {
    icon: <FiTrendingUp size={24} />,
    title: 'Market Intelligence',
    desc: 'Leverage our real-time analytics to make data-driven decisions in a fast-paced real estate market.',
  }
]

export default function Home() {
  const navigate = useNavigate()

  const handleAnalyze = (e) => {
    e.preventDefault()
    navigate('/browse')
  }

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* ─── Premium Human-Centric Hero Section ───────────────────────────── */}
      <section style={{ padding: '1rem' }}>
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: '#cbd5e1', // Fallback
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: 'var(--ambient-shadow)'
        }}>
          {/* Beautiful Architectural Background Image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0
          }} />

          {/* Elegant Dark Gradient Fade */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.2) 100%)',
            zIndex: 1
          }} />

          <div style={{ position: 'relative', zIndex: 10, padding: '0 4rem', maxWidth: 1200 }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              
              <h1 className="display-txt" style={{
                color: '#ffffff',
                fontSize: 'clamp(3.5rem, 6vw, 6rem)',
                marginBottom: '1.25rem',
                maxWidth: '85%',
                lineHeight: 1.1,
                letterSpacing: '-0.03em'
              }}>
                Find your perfect place.
              </h1>

              <p style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'var(--text-xl)',
                lineHeight: 1.6,
                maxWidth: 600,
                marginBottom: '3rem',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400
              }}>
                Experience real estate redefined. Browse exclusive, verified properties and connect directly with top-tier agents.
              </p>

              {/* Clean, High-Contrast Search Interface */}
              <form onSubmit={handleAnalyze} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.5rem',
                borderRadius: 'var(--radius-round)',
                background: '#ffffff',
                maxWidth: 700,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', color: 'var(--on-surface-variant)' }}>
                  <FiSearch size={22} />
                </div>
                <input 
                  type="text" 
                  placeholder="Enter city, neighborhood, or ZIP..." 
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--on-surface)',
                    fontSize: 'var(--text-lg)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
                <button type="submit" className="btn btn-primary" style={{
                  borderRadius: 'var(--radius-round)',
                  padding: '1rem 2.5rem',
                  fontSize: 'var(--text-base)',
                  boxShadow: 'none'
                }}>
                  Search
                </button>
              </form>

            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Premium Features Section ──────────────── */}
      <section style={{ padding: '8rem 2rem' }}>
        <div className="container" style={{ padding: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 className="display-txt" style={{ fontSize: 'var(--text-4xl)', color: 'var(--on-surface)' }}>
              A new standard in real estate.
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 'var(--text-xl)', marginTop: '1rem', maxWidth: 700, margin: '1rem auto 0' }}>
              We've built a platform that puts human trust first. No stale listings, no unverified properties. Just premium real estate.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }} transition={{ delay: i * 0.15, duration: 0.6 }}
                style={{
                  padding: '3rem 2rem',
                  background: 'var(--surface-container-lowest)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--outline-variant)',
                  boxShadow: 'var(--ambient-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 'var(--radius-round)',
                  background: 'var(--tertiary-container)',
                  color: 'var(--tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '2rem',
                }}>
                  {f.icon}
                </div>
                <h3 className="display-txt" style={{ fontSize: 'var(--text-2xl)', marginBottom: '1rem' }}>
                  {f.title}
                </h3>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Elegant Footer CTA ───────────────────────────────────────────── */}
      <section style={{ padding: '0 2rem 6rem' }}>
        <div className="container" style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          background: 'var(--gradient-primary)',
          borderRadius: 'var(--radius-xl)',
          padding: '6rem 2rem',
          boxShadow: 'var(--ambient-shadow)'
        }}>
          <h2 className="display-txt" style={{ fontSize: 'var(--text-4xl)', color: '#ffffff', marginBottom: '1.5rem' }}>
            Ready to find your dream home?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--text-xl)', marginBottom: '3rem', maxWidth: 600 }}>
            Join thousands of satisfied buyers and sellers on the most trusted real estate platform.
          </p>
          <Link to="/browse" className="btn" style={{
            background: '#ffffff', color: 'var(--primary-container)',
            fontSize: 'var(--text-lg)', padding: '1.25rem 3rem', borderRadius: 'var(--radius-round)',
            fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
          }}>
            Explore Listings
          </Link>
        </div>
      </section>
    </div>
  )
}

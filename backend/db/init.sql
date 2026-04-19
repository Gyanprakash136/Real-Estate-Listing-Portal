-- ==========================================
-- Real Estate Portal - Database Schema
-- ==========================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- For full-text search

-- ─── ENUM Types ──────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE property_type AS ENUM ('apartment', 'house', 'villa', 'plot', 'commercial', 'penthouse');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('pending', 'active', 'stale', 'sold', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE inquiry_status AS ENUM ('new', 'read', 'responded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    avatar_url    TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── Raw Listings (Kafka consumer writes here first) ──────────────
CREATE TABLE IF NOT EXISTS raw_listings (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kafka_topic   VARCHAR(100),
    kafka_offset  BIGINT,
    kafka_partition INT,
    payload       JSONB NOT NULL,
    received_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed     BOOLEAN DEFAULT FALSE,
    processed_at  TIMESTAMP WITH TIME ZONE,
    error_msg     TEXT
);
CREATE INDEX IF NOT EXISTS idx_raw_listings_processed ON raw_listings(processed);
CREATE INDEX IF NOT EXISTS idx_raw_listings_received ON raw_listings(received_at);

-- ─── Clean Listings (Airflow promotes here after deduplication) ───
CREATE TABLE IF NOT EXISTS listings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(500) NOT NULL,
    description      TEXT,
    price            NUMERIC(15, 2) NOT NULL,
    property_type    property_type NOT NULL,
    bedrooms         INTEGER,
    bathrooms        INTEGER,
    area_sqft        NUMERIC(10, 2),
    address          TEXT NOT NULL,
    city             VARCHAR(100) NOT NULL,
    state            VARCHAR(100) NOT NULL,
    zip_code         VARCHAR(20),
    latitude         NUMERIC(10, 7),
    longitude        NUMERIC(10, 7),
    images           JSONB DEFAULT '[]',
    amenities        JSONB DEFAULT '[]',
    status           listing_status DEFAULT 'pending',
    price_per_sqft   NUMERIC(10, 2),        -- Computed by Airflow enrichment DAG
    neighborhood_score NUMERIC(3, 1),       -- Enriched by Airflow
    view_count       INTEGER DEFAULT 0,
    inquiry_count    INTEGER DEFAULT 0,
    fingerprint      TEXT,                  -- Used by dedup DAG (hash of address+price)
    deduped_at       TIMESTAMP WITH TIME ZONE,
    stale_flagged    BOOLEAN DEFAULT FALSE,
    stale_flagged_at TIMESTAMP WITH TIME ZONE,
    raw_listing_id   UUID REFERENCES raw_listings(id),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listings_client ON listings(client_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_fingerprint ON listings(fingerprint);
CREATE INDEX IF NOT EXISTS idx_listings_geo ON listings(latitude, longitude);
-- Full text search index
CREATE INDEX IF NOT EXISTS idx_listings_fts ON listings USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(address,'') || ' ' || coalesce(city,'')));

-- ─── Inquiries ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID REFERENCES listings(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    contact_email   VARCHAR(255) NOT NULL,
    contact_phone   VARCHAR(20),
    status          inquiry_status DEFAULT 'new',
    client_response TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer ON inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- ─── Analytics Events (raw events from Kafka) ─────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type  VARCHAR(100) NOT NULL,
    listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing ON analytics_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- ─── Analytics Daily Rollup (populated by Airflow DAG) ────────────
CREATE TABLE IF NOT EXISTS analytics_daily (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date      DATE NOT NULL,
    listing_id       UUID REFERENCES listings(id) ON DELETE CASCADE,
    views            INTEGER DEFAULT 0,
    inquiries        INTEGER DEFAULT 0,
    unique_visitors  INTEGER DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (report_date, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(report_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_listing ON analytics_daily(listing_id);

-- ─── Trigger: auto-update updated_at ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_inquiries_updated_at
    BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

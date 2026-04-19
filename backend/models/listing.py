import uuid
import enum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Integer, Numeric,
    Text, Enum as SAEnum, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.database import Base


class PropertyType(str, enum.Enum):
    apartment = "apartment"
    house = "house"
    villa = "villa"
    plot = "plot"
    commercial = "commercial"
    penthouse = "penthouse"


class ListingStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    stale = "stale"
    sold = "sold"
    withdrawn = "withdrawn"


class RawListing(Base):
    __tablename__ = "raw_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kafka_topic = Column(String(100), nullable=True)
    kafka_offset = Column(Integer, nullable=True)
    kafka_partition = Column(Integer, nullable=True)
    payload = Column(JSONB, nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_msg = Column(Text, nullable=True)


class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(15, 2), nullable=False)
    property_type = Column(SAEnum(PropertyType, name="property_type", create_type=False), nullable=False)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    area_sqft = Column(Numeric(10, 2), nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    images = Column(JSONB, default=[])
    amenities = Column(JSONB, default=[])
    status = Column(SAEnum(ListingStatus, name="listing_status", create_type=False), default=ListingStatus.pending)
    price_per_sqft = Column(Numeric(10, 2), nullable=True)
    neighborhood_score = Column(Numeric(3, 1), nullable=True)
    view_count = Column(Integer, default=0)
    inquiry_count = Column(Integer, default=0)
    fingerprint = Column(String, nullable=True, index=True)
    deduped_at = Column(DateTime(timezone=True), nullable=True)
    stale_flagged = Column(Boolean, default=False)
    stale_flagged_at = Column(DateTime(timezone=True), nullable=True)
    sold_price = Column(Numeric(15, 2), nullable=True)
    sold_at = Column(DateTime(timezone=True), nullable=True)
    raw_listing_id = Column(UUID(as_uuid=True), ForeignKey("raw_listings.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("User", foreign_keys=[client_id])

    def __repr__(self):
        return f"<Listing {self.title} ({self.status})>"

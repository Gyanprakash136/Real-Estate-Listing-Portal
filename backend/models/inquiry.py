import uuid
import enum
from sqlalchemy import Column, String, DateTime, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.database import Base


class InquiryStatus(str, enum.Enum):
    new = "new"
    read = "read"
    accepted = "accepted"
    responded = "responded"


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    status = Column(SAEnum(InquiryStatus, name="inquiry_status", create_type=False), default=InquiryStatus.new)
    client_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    listing = relationship("Listing", foreign_keys=[listing_id])
    customer = relationship("User", foreign_keys=[customer_id])

    def __repr__(self):
        return f"<Inquiry {self.id} ({self.status})>"


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_metadata = Column("metadata", String, nullable=True)  # stored as JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

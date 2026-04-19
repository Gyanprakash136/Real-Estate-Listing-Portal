from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime

from db.database import get_db
from models.inquiry import Inquiry, InquiryStatus
from models.listing import Listing, ListingStatus
from models.user import User
from routers.auth import get_current_user, require_role, UserRole
from kafka.producer import kafka_producer

router = APIRouter()


# ─── Pydantic Schemas ─────────────────────────────────────────────
class InquiryCreate(BaseModel):
    listing_id: str
    message: str
    contact_email: EmailStr
    contact_phone: Optional[str] = None


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus
    client_response: Optional[str] = None


def inquiry_to_dict(inq: Inquiry) -> dict:
    return {
        "id": str(inq.id),
        "listing_id": str(inq.listing_id),
        "customer_id": str(inq.customer_id),
        "message": inq.message,
        "contact_email": inq.contact_email,
        "contact_phone": inq.contact_phone,
        "status": inq.status.value if inq.status else None,
        "client_response": inq.client_response,
        "created_at": inq.created_at,
        "updated_at": inq.updated_at,
        "listing_title": inq.listing.title if inq.listing else None,
        "customer_name": inq.customer.full_name if inq.customer else None,
    }


# ─── Submit Inquiry (customer) ────────────────────────────────────
@router.post("/", status_code=201)
def submit_inquiry(
    payload: InquiryCreate,
    current_user: User = Depends(require_role(UserRole.customer)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == payload.listing_id,
        Listing.status == ListingStatus.active,
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or not active.")

    # Prevent duplicate inquiries
    existing = db.query(Inquiry).filter(
        Inquiry.listing_id == payload.listing_id,
        Inquiry.customer_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted an inquiry for this listing.")

    inquiry = Inquiry(
        listing_id=payload.listing_id,
        customer_id=current_user.id,
        message=payload.message,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
    )
    db.add(inquiry)

    # Increment inquiry count on listing
    listing.inquiry_count = (listing.inquiry_count or 0) + 1
    db.commit()
    db.refresh(inquiry)

    # Publish Kafka event
    try:
        kafka_producer.publish_inquiry_submitted(inquiry, current_user, listing)
    except Exception as e:
        print(f"[Kafka] Failed to publish inquiry.submitted: {e}")

    return inquiry_to_dict(inquiry)


# ─── Get Customer's Own Inquiries ─────────────────────────────────
@router.get("/my")
def get_my_inquiries(
    current_user: User = Depends(require_role(UserRole.customer)),
    db: Session = Depends(get_db),
):
    inquiries = (
        db.query(Inquiry)
        .filter(Inquiry.customer_id == current_user.id)
        .order_by(Inquiry.created_at.desc())
        .all()
    )
    return [inquiry_to_dict(i) for i in inquiries]


# ─── Get Client's Received Inquiries ──────────────────────────────
@router.get("/received")
def get_received_inquiries(
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    inquiries = (
        db.query(Inquiry)
        .join(Listing, Inquiry.listing_id == Listing.id)
        .filter(Listing.client_id == current_user.id)
        .order_by(Inquiry.created_at.desc())
        .all()
    )
    return [inquiry_to_dict(i) for i in inquiries]


# ─── Update Inquiry Status (client) ──────────────────────────────
@router.put("/{inquiry_id}/status")
def update_inquiry_status(
    inquiry_id: str,
    payload: InquiryStatusUpdate,
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    inquiry = (
        db.query(Inquiry)
        .join(Listing, Inquiry.listing_id == Listing.id)
        .filter(Inquiry.id == inquiry_id, Listing.client_id == current_user.id)
        .first()
    )
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found.")

    inquiry.status = payload.status
    if payload.client_response:
        inquiry.client_response = payload.client_response
    db.commit()
    db.refresh(inquiry)
    return inquiry_to_dict(inquiry)

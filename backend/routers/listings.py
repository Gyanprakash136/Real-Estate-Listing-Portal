import os
import hashlib
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from db.database import get_db
from models.listing import Listing, RawListing, PropertyType, ListingStatus
from models.user import User
from routers.auth import get_current_user, require_role, UserRole
from kafka.producer import kafka_producer
from config import settings

router = APIRouter()


# ─── Response Schemas ─────────────────────────────────────────────
class ListingResponse(BaseModel):
    id: str
    client_id: str
    title: str
    description: Optional[str]
    price: float
    property_type: str
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    address: str
    city: str
    state: str
    zip_code: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    images: list
    amenities: list
    status: str
    price_per_sqft: Optional[float]
    neighborhood_score: Optional[float]
    view_count: int
    inquiry_count: int
    stale_flagged: bool
    created_at: datetime
    updated_at: datetime
    sold_price: Optional[float] = None
    sold_at: Optional[datetime] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


def listing_to_response(listing: Listing, include_client_name: bool = False) -> dict:
    d = {
        "id": str(listing.id),
        "client_id": str(listing.client_id),
        "title": listing.title,
        "description": listing.description,
        "price": float(listing.price) if listing.price else 0,
        "property_type": listing.property_type.value if listing.property_type else None,
        "bedrooms": listing.bedrooms,
        "bathrooms": listing.bathrooms,
        "area_sqft": float(listing.area_sqft) if listing.area_sqft else None,
        "address": listing.address,
        "city": listing.city,
        "state": listing.state,
        "zip_code": listing.zip_code,
        "latitude": float(listing.latitude) if listing.latitude else None,
        "longitude": float(listing.longitude) if listing.longitude else None,
        "images": listing.images or [],
        "amenities": listing.amenities or [],
        "status": listing.status.value if listing.status else None,
        "price_per_sqft": float(listing.price_per_sqft) if listing.price_per_sqft else None,
        "neighborhood_score": float(listing.neighborhood_score) if listing.neighborhood_score else None,
        "view_count": listing.view_count or 0,
        "inquiry_count": listing.inquiry_count or 0,
        "stale_flagged": listing.stale_flagged or False,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
        "sold_price": float(listing.sold_price) if listing.sold_price else None,
        "sold_at": listing.sold_at,
    }
    if include_client_name and listing.client:
        d["client_name"] = listing.client.full_name
        d["client_phone"] = listing.client.phone
        d["client_email"] = listing.client.email
    return d


def compute_fingerprint(address: str, price: float) -> str:
    raw = f"{address.lower().strip()}:{price}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ─── Create Listing ───────────────────────────────────────────────
@router.post("/", status_code=201)
def create_listing(
    title: str = Form(...),
    description: str = Form(None),
    price: float = Form(...),
    property_type: PropertyType = Form(...),
    bedrooms: Optional[int] = Form(None),
    bathrooms: Optional[int] = Form(None),
    area_sqft: Optional[float] = Form(None),
    address: str = Form(...),
    city: str = Form(...),
    state: str = Form(...),
    zip_code: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    amenities: Optional[str] = Form(None),  # JSON string
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    # Save uploaded images
    saved_images = []
    os.makedirs(settings.upload_dir, exist_ok=True)
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
    MAX_SIZE = 10 * 1024 * 1024 # 10MB

    for img in images:
        if img.filename:
            ext = os.path.splitext(img.filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Invalid file type: {img.filename}. Only JPG, PNG, and WebP are allowed.")
            
            # Check size
            img.file.seek(0, os.SEEK_END)
            size = img.file.tell()
            img.file.seek(0)
            if size > MAX_SIZE:
                raise HTTPException(status_code=400, detail=f"File too large: {img.filename}. Max size is 10MB.")

            filename = f"{uuid.uuid4()}{ext}"
            path = os.path.join(settings.upload_dir, filename)
            with open(path, "wb") as f:
                f.write(img.file.read())
            saved_images.append(f"/uploads/{filename}")

    import json
    amenities_list = json.loads(amenities) if amenities else []

    fingerprint = compute_fingerprint(address, price)

    listing = Listing(
        client_id=current_user.id,
        title=title,
        description=description,
        price=price,
        property_type=property_type,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        area_sqft=area_sqft,
        address=address,
        city=city,
        state=state,
        zip_code=zip_code,
        latitude=latitude,
        longitude=longitude,
        images=saved_images,
        amenities=amenities_list,
        status=ListingStatus.pending,
        fingerprint=fingerprint,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    # Publish to Kafka
    try:
        kafka_producer.publish_listing_created(listing, current_user)
    except Exception as e:
        print(f"[Kafka] Failed to publish listing.created: {e}")

    return listing_to_response(listing)


# ─── Get All Active Listings ──────────────────────────────────────
@router.get("/")
def get_listings(
    skip: int = 0,
    limit: int = 20,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Listing).filter(Listing.status == ListingStatus.active)
    if city:
        query = query.filter(Listing.city.ilike(f"%{city}%"))
    total = query.count()
    listings = query.order_by(Listing.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [listing_to_response(l, include_client_name=True) for l in listings],
    }


# ─── Get My Listings (client) ─────────────────────────────────────
@router.get("/my")
def get_my_listings(
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    listings = (
        db.query(Listing)
        .filter(Listing.client_id == current_user.id)
        .order_by(Listing.created_at.desc())
        .all()
    )
    return [listing_to_response(l) for l in listings]


# ─── Get Single Listing ───────────────────────────────────────────
@router.get("/{listing_id}")
def get_listing(
    listing_id: str,
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    # Increment view count
    listing.view_count = (listing.view_count or 0) + 1
    db.commit()

    # Publish pageview event
    try:
        kafka_producer.publish_pageview(listing_id=str(listing.id))
    except Exception as e:
        print(f"[Kafka] Failed to publish pageview: {e}")

    return listing_to_response(listing, include_client_name=True)


# ─── Update Listing ───────────────────────────────────────────────
@router.put("/{listing_id}")
def update_listing(
    listing_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    bedrooms: Optional[int] = Form(None),
    bathrooms: Optional[int] = Form(None),
    area_sqft: Optional[float] = Form(None),
    status: Optional[ListingStatus] = Form(None),
    amenities: Optional[str] = Form(None),
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.client_id == current_user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")

    if title is not None: listing.title = title
    if description is not None: listing.description = description
    if price is not None:
        listing.price = price
        listing.fingerprint = compute_fingerprint(listing.address, price)
    if bedrooms is not None: listing.bedrooms = bedrooms
    if bathrooms is not None: listing.bathrooms = bathrooms
    if area_sqft is not None: listing.area_sqft = area_sqft
    if status is not None: listing.status = status
    if amenities is not None:
        import json
        listing.amenities = json.loads(amenities)

    db.commit()
    db.refresh(listing)

    try:
        kafka_producer.publish_listing_updated(listing)
    except Exception as e:
        print(f"[Kafka] Failed to publish listing.updated: {e}")

    return listing_to_response(listing)


# ─── Delete Listing ───────────────────────────────────────────────
@router.delete("/{listing_id}")
def delete_listing(
    listing_id: str,
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.client_id == current_user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")
    db.delete(listing)
    db.commit()
    return {"message": "Listing deleted successfully."}


# ─── Upload Additional Images ─────────────────────────────────────
@router.post("/{listing_id}/images")
def upload_images(
    listing_id: str,
    images: List[UploadFile] = File(...),
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.client_id == current_user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    existing = listing.images or []
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
    MAX_SIZE = 10 * 1024 * 1024 # 10MB

    for img in images:
        if img.filename:
            ext = os.path.splitext(img.filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Invalid file type: {img.filename}. Only JPG, PNG, and WebP are allowed.")
            
            # Check size
            img.file.seek(0, os.SEEK_END)
            size = img.file.tell()
            img.file.seek(0)
            if size > MAX_SIZE:
                raise HTTPException(status_code=400, detail=f"File too large: {img.filename}. Max size is 10MB.")

            filename = f"{uuid.uuid4()}{ext}"
            path = os.path.join(settings.upload_dir, filename)
            with open(path, "wb") as f:
                f.write(img.file.read())
            existing.append(f"/uploads/{filename}")

    listing.images = existing
    db.commit()
    return {"images": existing}


# ─── Mark as Sold ────────────────────────────────────────────────
class MarkSoldRequest(BaseModel):
    sold_price: float

@router.post("/{listing_id}/sold")
def mark_as_sold(
    listing_id: str,
    payload: MarkSoldRequest,
    current_user: User = Depends(require_role(UserRole.client)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.client_id == current_user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or access denied.")
    
    listing.status = ListingStatus.sold
    listing.sold_price = payload.sold_price
    listing.sold_at = datetime.utcnow()
    db.commit()
    db.refresh(listing)
    
    # Optional: Publish event to Kafka for training pipeline
    try:
        kafka_producer.publish_listing_updated(listing)
    except Exception as e:
        print(f"[Kafka] Failed to publish listing.sold: {e}")
        
    return listing_to_response(listing)

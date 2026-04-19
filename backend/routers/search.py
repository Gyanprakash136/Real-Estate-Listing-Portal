from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text

from db.database import get_db
from models.listing import Listing, PropertyType, ListingStatus
from routers.listings import listing_to_response

router = APIRouter()


@router.get("/")
def search_listings(
    q: Optional[str] = Query(None, description="Full-text search query"),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    property_type: Optional[PropertyType] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_bedrooms: Optional[int] = Query(None),
    max_bedrooms: Optional[int] = Query(None),
    min_area: Optional[float] = Query(None),
    max_area: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", regex="^(price|created_at|area_sqft|view_count)$"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    query = db.query(Listing).filter(Listing.status == ListingStatus.active)

    # Full-text search
    if q:
        fts = text(
            "to_tsvector('english', coalesce(listings.title,'') || ' ' || "
            "coalesce(listings.description,'') || ' ' || coalesce(listings.address,'') || ' ' || "
            "coalesce(listings.city,'')) @@ plainto_tsquery('english', :q)"
        )
        query = query.filter(fts.bindparams(q=q))

    if city:
        query = query.filter(Listing.city.ilike(f"%{city}%"))
    if state:
        query = query.filter(Listing.state.ilike(f"%{state}%"))
    if property_type:
        query = query.filter(Listing.property_type == property_type)
    if min_price is not None:
        query = query.filter(Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(Listing.price <= max_price)
    if min_bedrooms is not None:
        query = query.filter(Listing.bedrooms >= min_bedrooms)
    if max_bedrooms is not None:
        query = query.filter(Listing.bedrooms <= max_bedrooms)
    if min_area is not None:
        query = query.filter(Listing.area_sqft >= min_area)
    if max_area is not None:
        query = query.filter(Listing.area_sqft <= max_area)

    total = query.count()

    # Sorting
    sort_col = getattr(Listing, sort_by, Listing.created_at)
    if sort_dir == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    listings = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [listing_to_response(l, include_client_name=True) for l in listings],
    }

import csv
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from db.database import get_db
from models.listing import Listing, ListingStatus, PropertyType
from models.user import User
from routers.auth import require_role, UserRole
from routers.listings import listing_to_response, compute_fingerprint
from kafka.producer import kafka_producer

router = APIRouter()

@router.get("/listings")
def get_admin_listings(
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    # Fetch pending and active listings for admin to review
    listings = db.query(Listing).filter(Listing.status.in_([ListingStatus.pending, ListingStatus.active])).order_by(Listing.created_at.desc()).all()
    return [listing_to_response(l, include_client_name=True) for l in listings]

@router.post("/bulk-import")
async def bulk_import(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    content = await file.read()
    stream = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(stream)
    
    imported_count = 0
    errors = []
    
    for row in reader:
        try:
            # Basic validation/parsing
            title = row.get('title')
            price = float(row.get('price', 0))
            address = row.get('address')
            
            if not title or not price or not address:
                continue
                
            fingerprint = compute_fingerprint(address, price)
            
            listing = Listing(
                client_id=current_user.id,
                title=title,
                description=row.get('description'),
                price=price,
                property_type=PropertyType(row.get('property_type', 'apartment')),
                bedrooms=int(row.get('bedrooms')) if row.get('bedrooms') else None,
                bathrooms=int(row.get('bathrooms')) if row.get('bathrooms') else None,
                area_sqft=float(row.get('area_sqft')) if row.get('area_sqft') else None,
                address=address,
                city=row.get('city', 'Unknown'),
                state=row.get('state', 'Unknown'),
                zip_code=row.get('zip_code'),
                status=ListingStatus.pending,
                fingerprint=fingerprint,
                images=[],
                amenities=[]
            )
            db.add(listing)
            db.flush() # Get the ID before commit
            
            # Publish to Kafka
            try:
                kafka_producer.publish_listing_created(listing, current_user)
            except Exception as ke:
                print(f"[BulkImport] Kafka error: {ke}")
                
            imported_count += 1
        except Exception as e:
            errors.append(f"Row {reader.line_num}: {str(e)}")
            
    db.commit()
    return {
        "message": f"Bulk import complete. {imported_count} listings queued for processing.",
        "imported_count": imported_count,
        "errors": errors
    }

@router.put("/listings/{listing_id}/verify")
def verify_listing(
    listing_id: str,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    listing.status = ListingStatus.active
    db.commit()
    return {"message": "Listing verified successfully", "status": listing.status}

@router.put("/listings/{listing_id}/reject")
def reject_listing(
    listing_id: str,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    listing.status = ListingStatus.withdrawn
    db.commit()
    return {"message": "Listing rejected successfully", "status": listing.status}


@router.get("/export-training-data")
def export_training_data(
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Export sold listings as CSV for ML model training."""
    from fastapi.responses import StreamingResponse
    import io
    import csv

    # Fetch all sold listings
    listings = db.query(Listing).filter(Listing.status == ListingStatus.sold).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "id", "property_type", "bedrooms", "bathrooms", "area_sqft", 
        "city", "state", "list_price", "sold_price", "sold_at"
    ])

    for l in listings:
        writer.writerow([
            str(l.id),
            l.property_type.value if l.property_type else "",
            l.bedrooms,
            l.bathrooms,
            float(l.area_sqft) if l.area_sqft else 0,
            l.city,
            l.state,
            float(l.price) if l.price else 0,
            float(l.sold_price) if l.sold_price else 0,
            l.sold_at.isoformat() if l.sold_at else ""
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=realestate_training_data.csv"}
    )

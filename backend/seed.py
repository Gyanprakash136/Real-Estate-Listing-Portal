import sys
sys.path.insert(0, "/app")
import uuid
import datetime
from sqlalchemy.orm import Session
from db.database import SessionLocal
from models.user import User
from models.listing import Listing, ListingStatus, PropertyType

def seed_db():
    db = SessionLocal()
    
    client = db.query(User).filter(User.email == "test_client@example.com").first()
    if not client:
        client = User(
            id=uuid.uuid4(),
            email="test_client@example.com",
            # dummy hash for "password123"
            password_hash="$2b$12$N9Zc5dZ/vM.yWdC4ZJj4I.V0x/ZXZIqZzP/M2g/1o2O/e7s3tXJ1O",
            role="client",
            full_name="John Agent",
            phone="123-456-7890",
            is_active=True
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        print("Created test client: test_client@example.com")
        
    count = db.query(Listing).filter(Listing.status == ListingStatus.active).count()
    if count == 0:
        l1 = Listing(
            client_id=client.id,
            title="Sunny 2BR Apartment in Downtown",
            description="Beautiful apartment with city views.",
            price=450000.00,
            property_type=PropertyType.apartment,
            bedrooms=2,
            bathrooms=2,
            area_sqft=1200,
            address="123 Main St",
            city="New York",
            state="NY",
            zip_code="10001",
            status=ListingStatus.active,
            images=["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800"],
            amenities=["Gym", "Pool"]
        )
        
        l2 = Listing(
            client_id=client.id,
            title="Luxury Villa near Beach",
            description="Premium villa overlooking the ocean.",
            price=1500000.00,
            property_type=PropertyType.villa,
            bedrooms=4,
            bathrooms=3,
            area_sqft=3500,
            address="456 Ocean Dr",
            city="Miami",
            state="FL",
            zip_code="33139",
            status=ListingStatus.active,
            images=["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800"],
            amenities=["Private Beach", "Pool"]
        )
        
        db.add_all([l1, l2])
        db.commit()
        print("Seeded database with 2 active listings!")
    else:
        print(f"Database already has {count} active listings.")
        
    db.close()

if __name__ == "__main__":
    seed_db()

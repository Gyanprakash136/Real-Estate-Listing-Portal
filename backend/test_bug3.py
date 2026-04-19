import sys
sys.path.append('.')
from db.database import SessionLocal
from models.user import UserRole
from routers.auth import register, RegisterRequest

payload = RegisterRequest(
    email="anothertest@test.com",
    password="mypassword",
    full_name="John Doe",
    role=UserRole.customer
)

db = SessionLocal()
try:
    response = register(payload, db)
    print("REGISTER SUCCESS:", response)
except Exception as e:
    print("REGISTER ERROR:")
    import traceback
    traceback.print_exc()

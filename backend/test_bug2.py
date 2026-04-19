import sys
sys.path.append('.')
from db.database import SessionLocal
from models.user import User, UserRole
from routers.auth import create_access_token
import uuid

try:
    print(create_access_token({"sub": str(uuid.uuid4()), "role": UserRole.customer.value}))
    print("TOKEN SUCCESS")
except Exception as e:
    print("TOKEN ERROR:")
    import traceback
    traceback.print_exc()


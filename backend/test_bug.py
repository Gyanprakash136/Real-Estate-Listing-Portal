import sys
sys.path.append('.')
from db.database import SessionLocal
from models.user import User, UserRole
from routers.auth import hash_password

try:
    print(hash_password('test'))
except Exception as e:
    print("HASH ERROR:")
    import traceback
    traceback.print_exc()

db = SessionLocal()
try:
    u = User(email='test5@test.com', password_hash='xx', role=UserRole.customer, full_name='test')
    db.add(u)
    db.commit()
    print("DB SUCCESS")
except Exception as e:
    print("DB ERROR:")
    import traceback
    traceback.print_exc()

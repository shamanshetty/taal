from app.db import SessionLocal
from app.services import user_service

session = SessionLocal()
try:
    user = user_service.sync_user_profile(session, user_id='test-id', email='test@example.com', full_name='Test User')
    print('synced', user.id)
finally:
    session.close()

import os
from sqlalchemy import create_engine, text
from app.config import settings
from app.db import SessionLocal

session = SessionLocal()
try:
    rows = session.execute(text('SELECT id, email FROM users')).fetchall()
    for row in rows:
        print(row.id, row.email)
finally:
    session.close()

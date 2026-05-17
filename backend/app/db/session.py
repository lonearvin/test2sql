from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config.settings import settings
from app.models.database import Base

engine = create_engine(settings.admin_db_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
# database.py - FINAL WORKING VERSION

import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set!\n"
        "Set it in your .env file (local) or Railway Variables (production)"
    )

# Convert mysql:// to mysql+pymysql://
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)
    print("Converted database URL to use pymysql driver")

# Log connection info (hide password)
try:
    db_host = DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'localhost'
    print(f"Connecting to database at: {db_host}")
except:
    print(f"Connecting to database...")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10,
    echo=False,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Database session dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database and create all tables"""
    print("📊 Initializing database...")
    try:
        # Import all models
        import models
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        # Test connection with proper SQLAlchemy 2.0 syntax
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        print("Database connection verified!")
        
    except Exception as e:
        print(f"Database initialization failed: {e}")
        raise


def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        return True
    except Exception as e:
        print(f"Database connection test failed: {e}")
        return False
# app/auth_models.py - Multi-Tenant Authentication Models

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import secrets
import bcrypt

# Use bcrypt directly instead of passlib to avoid version issues
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


class Tenant(Base):
    """
    Multi-tenant organization table
    Each shopkeeper gets their own tenant (business)
    """
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Business Information
    business_name = Column(String(200), nullable=False)
    business_type = Column(String(100), default="cloth_shop")
    
    # Contact Details
    owner_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Location
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="Pakistan")
    
    # Subscription Details
    subscription_plan = Column(String(50), default="free_trial")  # free_trial, basic, premium
    subscription_status = Column(String(50), default="active")  # active, suspended, cancelled
    trial_start_date = Column(Date, nullable=False)
    trial_end_date = Column(Date, nullable=False)
    subscription_start_date = Column(Date, nullable=True)
    
    # Tenant Settings
    is_active = Column(Boolean, default=True)
    max_users = Column(Integer, default=3)  # Limit users per tenant
    
    # Unique tenant identifier for data isolation
    tenant_key = Column(String(100), unique=True, index=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tenant {self.business_name} ({self.email})>"


class User(Base):
    """
    User accounts (shopkeepers and their employees)
    Each user belongs to ONE tenant
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Tenant Association (Multi-tenancy)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # User Details
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Authentication
    hashed_password = Column(String(255), nullable=True)  # Null for OAuth users
    is_email_verified = Column(Boolean, default=False)
    
    # OAuth Provider Info (for Google/Facebook login)
    oauth_provider = Column(String(50), nullable=True)  # google, facebook, etc.
    oauth_provider_id = Column(String(255), nullable=True)  # Google ID, FB ID, etc.
    
    # User Role & Permissions
    role = Column(String(50), default="user")  # owner, manager, user
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Security
    last_login = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    
    def verify_password(self, password: str) -> bool:
        """Verify user password"""
        if not self.hashed_password:
            return False
        return verify_password(password, self.hashed_password)
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return hash_password(password)
    
    def __repr__(self):
        return f"<User {self.email} (Tenant: {self.tenant_id})>"


class UserSession(Base):
    """
    Track active user sessions for security
    """
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Session Details
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    refresh_token = Column(String(255), unique=True, nullable=True)
    
    # Device/Browser Info
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Session Status
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    last_activity = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<Session {self.session_token[:20]}... for User {self.user_id}>"


class EmailVerificationToken(Base):
    """
    Email verification tokens for new user registration
    """
    __tablename__ = "email_verification_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)


class PasswordResetToken(Base):
    """
    Password reset tokens
    """
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
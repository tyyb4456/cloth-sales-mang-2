# app/auth_schemas.py - Authentication Pydantic Schemas

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, date


# ==================== TENANT SCHEMAS ====================

class TenantCreate(BaseModel):
    """Schema for creating a new tenant (business registration)"""
    business_name: str = Field(..., min_length=2, max_length=200)
    business_type: str = Field(default="cloth_shop")
    
    owner_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8)
    
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = Field(default="Pakistan")
    
    @field_validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        # Removed strict uppercase/lowercase/digit requirements
        # Now just needs to be 8+ characters
        return v


class TenantResponse(BaseModel):
    id: int
    business_name: str
    business_type: str
    owner_name: str
    email: str
    phone: Optional[str]
    
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: str
    
    subscription_plan: str
    subscription_status: str
    trial_start_date: date
    trial_end_date: date
    subscription_start_date: Optional[date]
    
    is_active: bool
    max_users: int
    tenant_key: str
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TenantUpdate(BaseModel):
    """Schema for updating tenant information"""
    business_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


# ==================== USER SCHEMAS ====================

class UserCreate(BaseModel):
    """Schema for creating a new user (email/password)"""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8)
    role: str = Field(default="user")


class UserResponse(BaseModel):
    id: int
    tenant_id: int
    full_name: str
    email: str
    phone: Optional[str]
    
    role: str
    is_active: bool
    is_email_verified: bool
    
    oauth_provider: Optional[str]
    last_login: Optional[datetime]
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None


# ==================== AUTHENTICATION SCHEMAS ====================

class LoginRequest(BaseModel):
    """Schema for email/password login"""
    email: EmailStr
    password: str


class GoogleOAuthRequest(BaseModel):
    """Schema for Google OAuth login"""
    id_token: str  # Google ID token from frontend


class AuthResponse(BaseModel):
    """Response after successful authentication"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    
    user: UserResponse
    tenant: TenantResponse


class TokenRefreshRequest(BaseModel):
    """Schema for refreshing access token"""
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Response after token refresh"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ==================== PASSWORD MANAGEMENT ====================

class PasswordChangeRequest(BaseModel):
    """Schema for changing password (when logged in)"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class PasswordResetRequest(BaseModel):
    """Schema for requesting password reset (forgot password)"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset with token"""
    token: str
    new_password: str = Field(..., min_length=8)


# ==================== EMAIL VERIFICATION ====================

class EmailVerificationRequest(BaseModel):
    """Schema for verifying email with token"""
    token: str


class ResendVerificationRequest(BaseModel):
    """Schema for resending verification email"""
    email: EmailStr


# ==================== SUBSCRIPTION MANAGEMENT ====================

class SubscriptionUpgrade(BaseModel):
    """Schema for upgrading subscription"""
    plan: str = Field(..., pattern="^(basic|premium)$")
    payment_method: str
    payment_details: Optional[dict] = None


class SubscriptionResponse(BaseModel):
    """Response for subscription details"""
    tenant_id: int
    subscription_plan: str
    subscription_status: str
    trial_start_date: date
    trial_end_date: date
    subscription_start_date: Optional[date]
    days_remaining: int
    is_trial: bool
    can_upgrade: bool


# ==================== UTILITY SCHEMAS ====================

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    error_code: Optional[str] = None
# app/routes/auth_routes.py - Authentication API Routes (UPDATED WITH EMAIL)

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from auth_models import User, Tenant, UserSession
from auth_schemas import (
    TenantCreate, TenantResponse, UserResponse, 
    LoginRequest, AuthResponse, MessageResponse,
    PasswordChangeRequest, PasswordResetRequest, PasswordResetConfirm,
    EmailVerificationRequest, TokenRefreshRequest, TokenRefreshResponse,
    SubscriptionResponse
)
from auth_service import AuthService
from email_service import EmailService  # 🆕 NEW

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


# ==================== DEPENDENCY: Get Current User ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token
    Use this in protected routes: user: User = Depends(get_current_user)
    """
    token = credentials.credentials
    
    # Verify token
    payload = AuthService.verify_token(token)
    user_id = int(payload.get("sub"))
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_tenant(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Tenant:
    """
    Dependency to get current user's tenant
    Use this for multi-tenant data isolation
    """
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant account is suspended"
        )
    
    return tenant


# ==================== REGISTRATION ====================

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_business(
    tenant_data: TenantCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register a new business (tenant) with owner account
    Includes 7-day free trial
    🆕 SENDS VERIFICATION EMAIL
    """
    try:
        # Create tenant and owner user
        tenant, owner_user = AuthService.create_tenant(tenant_data, db)
        
        # Generate tokens
        access_token = AuthService.create_access_token(owner_user.id, tenant.id)
        refresh_token = AuthService.create_refresh_token(owner_user.id, tenant.id)
        
        # Create session
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        AuthService.create_user_session(
            owner_user.id, access_token, refresh_token,
            ip_address, user_agent, db
        )
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 60,  # 1 hour
            user=UserResponse.from_orm(owner_user),
            tenant=TenantResponse.from_orm(tenant)
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


# ==================== LOGIN ====================

@router.post("/login", response_model=AuthResponse)
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Login with email and password
    Returns access token and refresh token
    """
    try:
        # Authenticate user
        user, tenant = AuthService.authenticate_user(credentials, db)
        
        # Generate tokens
        access_token = AuthService.create_access_token(user.id, tenant.id)
        refresh_token = AuthService.create_refresh_token(user.id, tenant.id)
        
        # Create session
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        AuthService.create_user_session(
            user.id, access_token, refresh_token,
            ip_address, user_agent, db
        )
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 60,  # 1 hour
            user=UserResponse.from_orm(user),
            tenant=TenantResponse.from_orm(tenant)
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


# ==================== LOGOUT ====================

@router.post("/logout", response_model=MessageResponse)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Logout current user (invalidate session)
    """
    token = credentials.credentials
    AuthService.invalidate_session(token, db)
    
    return MessageResponse(
        message="Logged out successfully",
        success=True
    )


# ==================== TOKEN REFRESH ====================

@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(
    refresh_request: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    # Verify refresh token
    payload = AuthService.verify_token(refresh_request.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = int(payload.get("sub"))
    tenant_id = payload.get("tenant_id")
    
    # Generate new access token
    new_access_token = AuthService.create_access_token(user_id, tenant_id)
    
    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=60 * 60
    )


# ==================== GET CURRENT USER ====================

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    """
    Get current authenticated user details
    """
    return UserResponse.from_orm(user)


@router.get("/me/tenant", response_model=TenantResponse)
def get_my_tenant(tenant: Tenant = Depends(get_current_tenant)):
    """
    Get current user's tenant (business) details
    """
    return TenantResponse.from_orm(tenant)


# ==================== EMAIL VERIFICATION ====================

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(
    verification: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Verify user email with token
    🆕 SENDS WELCOME EMAIL
    """
    try:
        user = AuthService.verify_email(verification.token, db)
        
        # 🆕 SEND WELCOME EMAIL
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            EmailService.send_welcome_email(
                email=user.email,
                full_name=user.full_name,
                business_name=tenant.business_name
            )
        
        return MessageResponse(
            message="Email verified successfully",
            success=True
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend email verification token
    🆕 SENDS VERIFICATION EMAIL
    """
    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    verification_token = AuthService.create_verification_token(user.id, db)
    
    # 🆕 SEND VERIFICATION EMAIL
    EmailService.send_verification_email(
        email=user.email,
        full_name=user.full_name,
        verification_token=verification_token.token
    )
    
    return MessageResponse(
        message="Verification email sent",
        success=True
    )


# ==================== PASSWORD MANAGEMENT ====================

# 🆕 NEW ENDPOINT - Forgot Password
@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset (send email with reset link)
    🆕 SENDS PASSWORD RESET EMAIL
    """
    try:
        AuthService.create_password_reset_token(request.email, db)
        
        return MessageResponse(
            message="If this email exists, a password reset link has been sent",
            success=True
        )
    except Exception as e:
        # Always return success to not reveal if email exists
        return MessageResponse(
            message="If this email exists, a password reset link has been sent",
            success=True
        )


# 🆕 NEW ENDPOINT - Reset Password
@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Reset password using token from email
    """
    try:
        AuthService.reset_password(reset_data.token, reset_data.new_password, db)
        
        return MessageResponse(
            message="Password reset successfully",
            success=True
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    password_data: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password (when logged in)
    """
    # Verify current password
    if not user.verify_password(password_data.current_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    user.hashed_password = User.hash_password(password_data.new_password)
    db.commit()
    
    return MessageResponse(
        message="Password changed successfully",
        success=True
    )


# ==================== SUBSCRIPTION STATUS ====================

@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription_status(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Get current subscription status
    """
    status_info = AuthService.check_subscription_status(tenant)
    
    return SubscriptionResponse(
        tenant_id=tenant.id,
        subscription_plan=status_info["plan"],
        subscription_status=status_info["status"],
        trial_start_date=tenant.trial_start_date,
        trial_end_date=tenant.trial_end_date,
        subscription_start_date=tenant.subscription_start_date,
        days_remaining=status_info["days_remaining"] or 0,
        is_trial=status_info["plan"] == "free_trial",
        can_upgrade=status_info["can_upgrade"]
    )


# ==================== HEALTH CHECK ====================

@router.get("/health")
def auth_health_check():
    """Check if authentication system is running"""
    return {
        "status": "healthy",
        "service": "authentication",
        "features": [
            "Multi-tenant support",
            "Email/Password authentication",
            "JWT tokens",
            "7-day free trial",
            "Email verification",
            "Password reset",
            "Session management"
        ]
    }
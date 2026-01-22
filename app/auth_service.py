# app/auth_service.py - Authentication Business Logic (UPDATED WITH EMAIL)

from datetime import datetime, timedelta, date
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import secrets
import jwt
from auth_models import Tenant, User, UserSession, EmailVerificationToken, PasswordResetToken
from auth_schemas import TenantCreate, UserCreate, LoginRequest
import os


# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days
FREE_TRIAL_DAYS = 7


class AuthService:
    """Authentication service for multi-tenant system"""
    
    @staticmethod
    def generate_tenant_key() -> str:
        """Generate unique tenant key"""
        return f"tenant_{secrets.token_urlsafe(16)}"
    
    @staticmethod
    def create_tenant(tenant_data: TenantCreate, db: Session) -> Tuple[Tenant, User]:
        """
        Create a new tenant (business) and owner user
        Returns: (tenant, owner_user)
        """
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == tenant_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Calculate trial period
        trial_start = date.today()
        trial_end = trial_start + timedelta(days=FREE_TRIAL_DAYS)
        
        # Create tenant
        tenant = Tenant(
            business_name=tenant_data.business_name,
            business_type=tenant_data.business_type,
            owner_name=tenant_data.owner_name,
            email=tenant_data.email,
            phone=tenant_data.phone,
            address=tenant_data.address,
            city=tenant_data.city,
            state=tenant_data.state,
            country=tenant_data.country,
            tenant_key=AuthService.generate_tenant_key(),
            subscription_plan="free_trial",
            subscription_status="active",
            trial_start_date=trial_start,
            trial_end_date=trial_end,
            is_active=True,
            max_users=3
        )
        
        db.add(tenant)
        db.flush()  # Get tenant ID
        
        # Create owner user
        owner_user = User(
            tenant_id=tenant.id,
            full_name=tenant_data.owner_name,
            email=tenant_data.email,
            phone=tenant_data.phone,
            hashed_password=User.hash_password(tenant_data.password),
            role="owner",
            is_active=True,
            is_email_verified=False  # Require email verification
        )
        
        db.add(owner_user)
        db.commit()
        db.refresh(tenant)
        db.refresh(owner_user)
        
        # Generate email verification token
        verification_token = AuthService.create_verification_token(owner_user.id, db)
        
        # SEND VERIFICATION EMAIL
        from email_service import EmailService
        EmailService.send_verification_email(
            email=owner_user.email,
            full_name=owner_user.full_name,
            verification_token=verification_token.token
        )
        
        return tenant, owner_user
    
    @staticmethod
    def authenticate_user(credentials: LoginRequest, db: Session) -> Tuple[User, Tenant]:
        """
        Authenticate user with email and password
        Returns: (user, tenant)
        """
        # Find user by email
        user = db.query(User).filter(User.email == credentials.email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if account is locked
        if user.account_locked_until and user.account_locked_until > datetime.now():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked until {user.account_locked_until}"
            )
        
        # Verify password
        if not user.verify_password(credentials.password):
            # Increment failed login attempts
            user.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.account_locked_until = datetime.now() + timedelta(minutes=30)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account locked due to multiple failed login attempts"
                )
            
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login = datetime.now()
        
        # Get tenant
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check if tenant is active
        if not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your business account has been suspended"
            )
        
        # Check subscription status
        if tenant.subscription_plan == "free_trial":
            if date.today() > tenant.trial_end_date:
                tenant.subscription_status = "expired"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Free trial expired. Please upgrade to continue."
                )
        
        db.commit()
        return user, tenant
    
    @staticmethod
    def create_access_token(user_id: int, tenant_id: int) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": str(user_id),
            "tenant_id": tenant_id,
            "exp": expire,
            "type": "access"
        }
        
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def create_refresh_token(user_id: int, tenant_id: int) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": str(user_id),
            "tenant_id": tenant_id,
            "exp": expire,
            "type": "refresh"
        }
        
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    
    @staticmethod
    def create_user_session(user_id: int, access_token: str, refresh_token: str, 
                           ip_address: Optional[str], user_agent: Optional[str], 
                           db: Session) -> UserSession:
        """Create a new user session"""
        expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        session = UserSession(
            user_id=user_id,
            session_token=access_token,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
            expires_at=expires_at
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return session
    
    @staticmethod
    def invalidate_session(session_token: str, db: Session):
        """Invalidate a user session (logout)"""
        session = db.query(UserSession).filter(
            UserSession.session_token == session_token,
            UserSession.is_active == True
        ).first()
        
        if session:
            session.is_active = False
            db.commit()
    
    @staticmethod
    def create_verification_token(user_id: int, db: Session) -> EmailVerificationToken:
        """Create email verification token"""
        token = EmailVerificationToken.generate_token()
        expires_at = datetime.now() + timedelta(hours=24)
        
        verification_token = EmailVerificationToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(verification_token)
        db.commit()
        db.refresh(verification_token)
        
        return verification_token
    
    @staticmethod
    def verify_email(token: str, db: Session) -> User:
        """Verify user email with token"""
        verification = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.token == token,
            EmailVerificationToken.is_used == False
        ).first()
        
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        if verification.expires_at < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired"
            )
        
        # Mark token as used
        verification.is_used = True
        
        # Mark user as verified
        user = db.query(User).filter(User.id == verification.user_id).first()
        user.is_email_verified = True
        
        db.commit()
        db.refresh(user)
        
        return user
    
    # 🆕 NEW METHOD - Password Reset Token
    @staticmethod
    def create_password_reset_token(email: str, db: Session) -> PasswordResetToken:
        """Create password reset token and send email"""
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Don't reveal if email exists or not (security)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="If this email exists, a reset link has been sent"
            )
        
        # Invalidate old tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})
        
        token = PasswordResetToken.generate_token()
        expires_at = datetime.now() + timedelta(hours=1)  # 1 hour expiry
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(reset_token)
        db.commit()
        db.refresh(reset_token)
        
        # Send email
        from email_service import EmailService
        EmailService.send_password_reset_email(
            email=user.email,
            full_name=user.full_name,
            reset_token=token
        )
        
        return reset_token
    
    # 🆕 NEW METHOD - Reset Password
    @staticmethod
    def reset_password(token: str, new_password: str, db: Session) -> User:
        """Reset user password with token"""
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.is_used == False
        ).first()
        
        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        if reset_token.expires_at < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )
        
        # Mark token as used
        reset_token.is_used = True
        
        # Update password
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        user.hashed_password = User.hash_password(new_password)
        user.failed_login_attempts = 0  # Reset failed attempts
        user.account_locked_until = None  # Unlock account if locked
        
        db.commit()
        db.refresh(user)
        
        return user
    
    @staticmethod
    def check_subscription_status(tenant: Tenant) -> dict:
        """Check and return subscription status"""
        today = date.today()
        
        if tenant.subscription_plan == "free_trial":
            days_remaining = (tenant.trial_end_date - today).days
            
            return {
                "plan": "free_trial",
                "status": "active" if days_remaining > 0 else "expired",
                "days_remaining": max(0, days_remaining),
                "trial_end_date": tenant.trial_end_date,
                "can_upgrade": True
            }
        else:
            return {
                "plan": tenant.subscription_plan,
                "status": tenant.subscription_status,
                "days_remaining": None,
                "subscription_start_date": tenant.subscription_start_date,
                "can_upgrade": tenant.subscription_plan == "basic"
            }
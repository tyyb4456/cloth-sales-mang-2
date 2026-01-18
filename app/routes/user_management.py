# app/routes/user_management.py - User Management Routes (Owner Only)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth_models import User, Tenant
from auth_schemas import UserCreate, UserResponse, UserUpdate, MessageResponse
from routes.auth_routes import get_current_user, get_current_tenant
from rbac import (
    require_owner, 
    check_user_limit, 
    get_remaining_user_slots,
    can_manage_user,
    get_user_permissions_dict,
    UserRole
)

router = APIRouter(prefix="/users", tags=["User Management"])

# ==================== GET USER'S PERMISSIONS ====================

@router.get("/me/permissions")
def get_my_permissions(
    user: User = Depends(get_current_user)
):
    """
    Get current user's permissions
    (Available to all authenticated users)
    """
    return get_user_permissions_dict(user)


# ==================== LIST USERS (Owner Only) ====================

@router.get("/", response_model=List[UserResponse])
def list_team_members(
    user: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    List all users in the tenant (Owner only)
    """
    users = db.query(User).filter(
        User.tenant_id == tenant.id
    ).order_by(User.created_at.desc()).all()
    
    return users


# ==================== ADD USER (Owner Only) ====================

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def add_team_member(
    user_data: UserCreate,
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Add a new team member (Owner only)
    Checks subscription limits
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check user limit based on subscription
    if not check_user_limit(tenant, db):
        remaining = get_remaining_user_slots(tenant, db)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"User limit reached ({tenant.max_users} users). Upgrade your plan to add more users. Remaining slots: {remaining}"
        )
    
    # Validate role
    if user_data.role not in [UserRole.OWNER, UserRole.SALESPERSON]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'owner' or 'salesperson'"
        )
    
    # Create new user
    new_user = User(
        tenant_id=tenant.id,
        full_name=user_data.full_name,
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=User.hash_password(user_data.password),
        role=user_data.role,
        is_active=True,
        is_email_verified=False  # Can verify later
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


# ==================== UPDATE USER (Owner Only) ====================

@router.put("/{user_id}", response_model=UserResponse)
def update_team_member(
    user_id: int,
    user_update: UserUpdate,
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Update a team member (Owner only)
    Cannot change owner's own role
    """
    # Get target user
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent owner from changing their own role
    if target_user.id == owner.id and user_update.role and user_update.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(target_user, field, value)
    
    db.commit()
    db.refresh(target_user)
    
    return target_user


# ==================== DEACTIVATE USER (Owner Only) ====================

@router.post("/{user_id}/deactivate", response_model=MessageResponse)
def deactivate_team_member(
    user_id: int,
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Deactivate a team member (Owner only)
    Cannot deactivate self
    """
    # Get target user
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent owner from deactivating themselves
    if target_user.id == owner.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )
    
    target_user.is_active = False
    db.commit()
    
    return MessageResponse(
        message=f"User {target_user.full_name} deactivated successfully",
        success=True
    )


# ==================== REACTIVATE USER (Owner Only) ====================

@router.post("/{user_id}/reactivate", response_model=MessageResponse)
def reactivate_team_member(
    user_id: int,
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Reactivate a deactivated team member (Owner only)
    Checks subscription limits
    """
    # Get target user
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check user limit
    if not check_user_limit(tenant, db):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"User limit reached ({tenant.max_users} users). Upgrade your plan to reactivate users."
        )
    
    target_user.is_active = True
    db.commit()
    
    return MessageResponse(
        message=f"User {target_user.full_name} reactivated successfully",
        success=True
    )


# ==================== DELETE USER (Owner Only) ====================

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_member(
    user_id: int,
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Permanently delete a team member (Owner only)
    Cannot delete self
    """
    # Get target user
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent owner from deleting themselves
    if target_user.id == owner.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    db.delete(target_user)
    db.commit()
    
    return None


# ==================== RESET USER PASSWORD (Owner Only) ====================

@router.post("/{user_id}/reset-password", response_model=MessageResponse)
def reset_user_password(
    user_id: int,
    new_password: str,
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Reset a team member's password (Owner only)
    """
    # Get target user
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Update password
    target_user.hashed_password = User.hash_password(new_password)
    target_user.failed_login_attempts = 0
    target_user.account_locked_until = None
    
    db.commit()
    
    return MessageResponse(
        message=f"Password reset successfully for {target_user.full_name}",
        success=True
    )


# ==================== GET TEAM STATS (Owner Only) ====================

@router.get("/stats/team-summary")
def get_team_summary(
    owner: User = Depends(require_owner),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Get team summary statistics (Owner only)
    """
    total_users = db.query(User).filter(
        User.tenant_id == tenant.id
    ).count()
    
    active_users = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.is_active == True
    ).count()
    
    owners = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.role == UserRole.OWNER
    ).count()
    
    salespersons = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.role == UserRole.SALESPERSON
    ).count()
    
    remaining_slots = get_remaining_user_slots(tenant, db)
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "owners": owners,
        "salespersons": salespersons,
        "max_users": tenant.max_users,
        "remaining_slots": remaining_slots,
        "can_add_users": remaining_slots > 0
    }
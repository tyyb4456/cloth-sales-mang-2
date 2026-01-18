# app/rbac.py - Role-Based Access Control System

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth_models import User, Tenant
from routes.auth_routes import get_current_user, get_current_tenant
from enum import Enum
from typing import List, Optional

# Define Roles
class UserRole(str, Enum):
    OWNER = "owner"
    SALESPERSON = "salesperson"
    # Future roles can be added here
    # MANAGER = "manager"
    # ACCOUNTANT = "accountant"

# Define Permissions
class Permission(str, Enum):
    # Core Business Data
    VIEW_VARIETIES = "view_varieties"
    MANAGE_VARIETIES = "manage_varieties"
    
    VIEW_INVENTORY = "view_inventory"
    ADD_INVENTORY = "add_inventory"
    DELETE_INVENTORY = "delete_inventory"
    
    VIEW_SALES = "view_sales"
    ADD_SALES = "add_sales"
    DELETE_SALES = "delete_sales"
    
    VIEW_RETURNS = "view_returns"
    ADD_RETURNS = "add_returns"
    DELETE_RETURNS = "delete_returns"
    
    # Shopkeeper Stock
    VIEW_SHOPKEEPER_STOCK = "view_shopkeeper_stock"
    MANAGE_SHOPKEEPER_STOCK = "manage_shopkeeper_stock"
    
    # Financial & Analytics
    VIEW_REPORTS = "view_reports"
    VIEW_ANALYTICS = "view_analytics"
    VIEW_EXPENSES = "view_expenses"
    MANAGE_EXPENSES = "manage_expenses"
    VIEW_LOANS = "view_loans"
    MANAGE_LOANS = "manage_loans"
    
    # Advanced Features
    USE_AI_CHATBOT = "use_ai_chatbot"
    USE_PREDICTIONS = "use_predictions"
    USE_VOICE_SALES = "use_voice_sales"
    
    # Administration (Owner Only)
    MANAGE_USERS = "manage_users"
    VIEW_SUBSCRIPTION = "view_subscription"
    MANAGE_SUBSCRIPTION = "manage_subscription"
    VIEW_SETTINGS = "view_settings"
    MANAGE_SETTINGS = "manage_settings"

# Role-Permission Mapping
ROLE_PERMISSIONS = {
    UserRole.OWNER: [
        # Has ALL permissions
        Permission.VIEW_VARIETIES,
        Permission.MANAGE_VARIETIES,
        Permission.VIEW_INVENTORY,
        Permission.ADD_INVENTORY,
        Permission.DELETE_INVENTORY,
        Permission.VIEW_SALES,
        Permission.ADD_SALES,
        Permission.DELETE_SALES,
        Permission.VIEW_RETURNS,
        Permission.ADD_RETURNS,
        Permission.DELETE_RETURNS,
        Permission.VIEW_SHOPKEEPER_STOCK,
        Permission.MANAGE_SHOPKEEPER_STOCK,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_EXPENSES,
        Permission.MANAGE_EXPENSES,
        Permission.VIEW_LOANS,
        Permission.MANAGE_LOANS,
        Permission.USE_AI_CHATBOT,
        Permission.USE_PREDICTIONS,
        Permission.USE_VOICE_SALES,
        Permission.MANAGE_USERS,
        Permission.VIEW_SUBSCRIPTION,
        Permission.MANAGE_SUBSCRIPTION,
        Permission.VIEW_SETTINGS,
        Permission.MANAGE_SETTINGS,
    ],
    
    UserRole.SALESPERSON: [
        # Limited permissions for salespersons
        Permission.VIEW_VARIETIES,          # Can view varieties
        Permission.VIEW_INVENTORY,          # Can view inventory
        Permission.ADD_INVENTORY,           # Can add new inventory
        Permission.VIEW_SALES,              # Can view sales
        Permission.ADD_SALES,               # Can add new sales
        Permission.VIEW_SHOPKEEPER_STOCK,   # Can view shopkeeper stock
        Permission.MANAGE_SHOPKEEPER_STOCK, # Can issue/manage shopkeeper stock
        Permission.USE_VOICE_SALES,         # Can use voice sales feature
        # NO access to:
        # - Delete operations
        # - Financial reports/analytics
        # - Expenses
        # - Loans
        # - AI features (except voice sales)
        # - User/subscription management
    ]
}

# Helper Functions
def get_user_permissions(user: User) -> List[Permission]:
    """Get all permissions for a user based on their role"""
    return ROLE_PERMISSIONS.get(user.role, [])

def user_has_permission(user: User, permission: Permission) -> bool:
    """Check if user has a specific permission"""
    user_permissions = get_user_permissions(user)
    return permission in user_permissions

# Permission Checker Dependency
def require_permission(permission: Permission):
    """
    Dependency to check if current user has required permission
    Usage: @router.get("/", dependencies=[Depends(require_permission(Permission.VIEW_SALES))])
    """
    async def permission_checker(
        user: User = Depends(get_current_user)
    ):
        if not user_has_permission(user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have permission to perform this action. Required: {permission.value}"
            )
        return user
    return permission_checker

# Owner-Only Dependency
async def require_owner(
    user: User = Depends(get_current_user)
):
    """Dependency to ensure user is an owner"""
    if user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires owner privileges"
        )
    return user

# Salesperson or Owner Dependency
async def require_salesperson_or_owner(
    user: User = Depends(get_current_user)
):
    """Dependency to ensure user is either salesperson or owner"""
    if user.role not in [UserRole.OWNER, UserRole.SALESPERSON]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires salesperson or owner privileges"
        )
    return user

# Check Subscription Limits
def check_user_limit(tenant: Tenant, db: Session) -> bool:
    """
    Check if tenant can add more users based on subscription
    Returns True if under limit, False otherwise
    """
    current_users = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.is_active == True
    ).count()
    
    return current_users < tenant.max_users

def get_remaining_user_slots(tenant: Tenant, db: Session) -> int:
    """Get number of remaining user slots for tenant"""
    current_users = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.is_active == True
    ).count()
    
    return max(0, tenant.max_users - current_users)

# User Management Helper
def can_manage_user(current_user: User, target_user: User) -> bool:
    """
    Check if current user can manage target user
    - Owners can manage anyone in their tenant
    - Salespersons cannot manage anyone
    """
    if current_user.role == UserRole.OWNER:
        return current_user.tenant_id == target_user.tenant_id
    return False

# Audit Log Helper (for future use)
def log_action(
    user: User,
    action: str,
    resource: str,
    resource_id: Optional[int] = None,
    db: Session = None
):
    """
    Log user actions for audit trail
    (Implementation can be added later with AuditLog model)
    """
    # For now, just print to console
    print(f"[AUDIT] User {user.email} ({user.role}) performed '{action}' on {resource} (ID: {resource_id})")
    # TODO: Save to database AuditLog table

# Permission Checker for Frontend (API endpoint)
def get_user_permissions_dict(user: User) -> dict:
    """
    Return user permissions as a dictionary for frontend
    """
    permissions = get_user_permissions(user)
    
    return {
        "role": user.role,
        "permissions": [p.value for p in permissions],
        "can_manage_users": user.role == UserRole.OWNER,
        "can_view_analytics": Permission.VIEW_ANALYTICS in permissions,
        "can_manage_expenses": Permission.MANAGE_EXPENSES in permissions,
        "can_delete_records": Permission.DELETE_SALES in permissions,
    }
# app/routes/varieties.py - UPDATED WITH MULTI-TENANCY AND RBAC

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ClothVariety, MeasurementUnit
from schemas import ClothVarietyCreate, ClothVarietyResponse, ClothVarietyUpdate
from routes.auth_routes import get_current_tenant
from auth_models import Tenant, User  # 🆕 ADDED User
from rbac import require_permission, Permission  # 🆕 NEW RBAC

router = APIRouter(prefix="/varieties", tags=["Cloth Varieties"])


@router.post("/", response_model=ClothVarietyResponse, status_code=status.HTTP_201_CREATED)
def create_variety(
    variety: ClothVarietyCreate,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.MANAGE_VARIETIES)),  # 🆕 RBAC - OWNER ONLY
    db: Session = Depends(get_db)
):
    """Create a new cloth variety (tenant-isolated, requires MANAGE_VARIETIES permission - OWNER only)"""
    
    # Check if variety already exists FOR THIS TENANT
    existing = db.query(ClothVariety).filter(
        ClothVariety.name == variety.name,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cloth variety '{variety.name}' already exists in your business"
        )
    
    db_variety = ClothVariety(**variety.model_dump())
    db_variety.tenant_id = tenant.id
    
    db.add(db_variety)
    db.commit()
    db.refresh(db_variety)
    
    return db_variety


@router.get("/", response_model=List[ClothVarietyResponse])
def get_all_varieties(
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_VARIETIES)),  # 🆕 RBAC - OWNER & SALESPERSON
    db: Session = Depends(get_db)
):
    """Get all cloth varieties (only for current tenant, requires VIEW_VARIETIES - OWNER & SALESPERSON)"""
    
    varieties = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant.id
    ).all()
    
    return varieties


@router.get("/{variety_id}", response_model=ClothVarietyResponse)
def get_variety(
    variety_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_VARIETIES)),  # 🆕 RBAC - OWNER & SALESPERSON
    db: Session = Depends(get_db)
):
    """Get a specific cloth variety by ID (tenant-isolated, requires VIEW_VARIETIES - OWNER & SALESPERSON)"""
    
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloth variety with ID {variety_id} not found in your business"
        )
    
    return variety


@router.delete("/{variety_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variety(
    variety_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.MANAGE_VARIETIES)),  # 🆕 RBAC - OWNER ONLY
    db: Session = Depends(get_db)
):
    """Delete a cloth variety (tenant-isolated, requires MANAGE_VARIETIES permission - OWNER only)"""
    
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloth variety with ID {variety_id} not found in your business"
        )
    
    db.delete(variety)
    db.commit()
    
    return None


@router.put("/{variety_id}", response_model=ClothVarietyResponse)
def update_variety(
    variety_id: int,
    variety_update: ClothVarietyUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.MANAGE_VARIETIES)),  # 🆕 RBAC - OWNER ONLY
    db: Session = Depends(get_db),
):
    """Update an existing cloth variety (tenant-isolated, requires MANAGE_VARIETIES permission - OWNER only)"""

    db_variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()

    if not db_variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloth variety with ID {variety_id} not found in your business"
        )

    update_data = variety_update.model_dump(exclude_unset=True)

    if "name" in update_data:
        # Check name uniqueness WITHIN TENANT
        existing = db.query(ClothVariety).filter(
            ClothVariety.name == update_data["name"],
            ClothVariety.id != variety_id,
            ClothVariety.tenant_id == tenant.id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Another variety with this name already exists in your business"
            )

    # Business rule: standard_length allowed only for meters/yards
    if "measurement_unit" in update_data:
        if update_data["measurement_unit"] == MeasurementUnit.PIECES:
            update_data["standard_length"] = None

    for field, value in update_data.items():
        setattr(db_variety, field, value)

    db.commit()
    db.refresh(db_variety)

    return db_variety
# app/routes/inventory.py - UPDATED WITH MULTI-TENANCY AND RBAC

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal
from database import get_db
from models import ClothVariety, SupplierInventory, Sale, SupplierReturn, InventoryMovement
from schemas import InventoryStatusResponse, InventoryMovementResponse
from routes.auth_routes import get_current_tenant
from auth_models import Tenant, User
from rbac import require_permission, Permission  # 🆕 RBAC IMPORTS

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])


@router.get("/status", response_model=List[InventoryStatusResponse])
def get_inventory_status(
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """
    Get current inventory status for all varieties with stock information (tenant-isolated, requires VIEW_INVENTORY permission)
    """
    # Filter varieties by tenant
    varieties = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant.id
    ).all()
    
    inventory_status = []
    
    for variety in varieties:
        # Calculate total supplied (TENANT FILTERED)
        total_supplied = db.query(
            func.sum(SupplierInventory.quantity)
        ).filter(
            SupplierInventory.variety_id == variety.id,
            SupplierInventory.tenant_id == tenant.id
        ).scalar() or Decimal('0')
        
        # Calculate total sold from new stock (TENANT FILTERED)
        total_sold = db.query(
            func.sum(Sale.quantity)
        ).filter(
            Sale.variety_id == variety.id,
            Sale.stock_type == 'new_stock',
            Sale.tenant_id == tenant.id
        ).scalar() or Decimal('0')
        
        # Calculate total returned (TENANT FILTERED)
        total_returned = db.query(
            func.sum(SupplierReturn.quantity)
        ).filter(
            SupplierReturn.variety_id == variety.id,
            SupplierReturn.tenant_id == tenant.id
        ).scalar() or Decimal('0')
        
        # Check if low stock
        is_low_stock = False
        if variety.min_stock_level:
            is_low_stock = variety.current_stock <= variety.min_stock_level
        
        inventory_status.append(
            InventoryStatusResponse(
                variety_id=variety.id,
                variety_name=variety.name,
                current_stock=variety.current_stock,
                min_stock_level=variety.min_stock_level,
                is_low_stock=is_low_stock,
                total_supplied=total_supplied,
                total_sold=total_sold,
                total_returned=total_returned,
                measurement_unit=variety.measurement_unit.value
            )
        )
    
    return inventory_status


@router.get("/status/{variety_id}", response_model=InventoryStatusResponse)
def get_variety_inventory_status(
    variety_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """
    Get current inventory status for a specific variety (tenant-isolated, requires VIEW_INVENTORY permission)
    """
    # Get variety WITH TENANT FILTER
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variety with ID {variety_id} not found in your business"
        )
    
    # Calculate totals (TENANT FILTERED)
    total_supplied = db.query(
        func.sum(SupplierInventory.quantity)
    ).filter(
        SupplierInventory.variety_id == variety_id,
        SupplierInventory.tenant_id == tenant.id
    ).scalar() or Decimal('0')
    
    total_sold = db.query(
        func.sum(Sale.quantity)
    ).filter(
        Sale.variety_id == variety_id,
        Sale.stock_type == 'new_stock',
        Sale.tenant_id == tenant.id
    ).scalar() or Decimal('0')
    
    total_returned = db.query(
        func.sum(SupplierReturn.quantity)
    ).filter(
        SupplierReturn.variety_id == variety_id,
        SupplierReturn.tenant_id == tenant.id
    ).scalar() or Decimal('0')
    
    is_low_stock = False
    if variety.min_stock_level:
        is_low_stock = variety.current_stock <= variety.min_stock_level
    
    return InventoryStatusResponse(
        variety_id=variety.id,
        variety_name=variety.name,
        current_stock=variety.current_stock,
        min_stock_level=variety.min_stock_level,
        is_low_stock=is_low_stock,
        total_supplied=total_supplied,
        total_sold=total_sold,
        total_returned=total_returned,
        measurement_unit=variety.measurement_unit.value
    )


@router.get("/movements/{variety_id}", response_model=List[InventoryMovementResponse])
def get_inventory_movements(
    variety_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get inventory movement history for a specific variety (tenant-isolated, requires VIEW_INVENTORY permission)
    """
    # Verify variety exists FOR THIS TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variety with ID {variety_id} not found in your business"
        )
    
    # Get movements WITH TENANT FILTER
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.variety_id == variety_id,
        InventoryMovement.tenant_id == tenant.id
    ).order_by(
        InventoryMovement.created_at.desc()
    ).limit(limit).all()
    
    return movements


@router.get("/low-stock", response_model=List[InventoryStatusResponse])
def get_low_stock_items(
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """
    Get all varieties that are below their minimum stock level (tenant-isolated, requires VIEW_INVENTORY permission)
    """
    # Filter varieties WITH TENANT
    varieties = db.query(ClothVariety).filter(
        ClothVariety.min_stock_level.isnot(None),
        ClothVariety.current_stock <= ClothVariety.min_stock_level,
        ClothVariety.tenant_id == tenant.id
    ).all()
    
    low_stock_items = []
    
    for variety in varieties:
        # All calculations TENANT FILTERED
        total_supplied = db.query(
            func.sum(SupplierInventory.quantity)
        ).filter(
            SupplierInventory.variety_id == variety.id,
            SupplierInventory.tenant_id == tenant.id
        ).scalar() or Decimal('0')
        
        total_sold = db.query(
            func.sum(Sale.quantity)
        ).filter(
            Sale.variety_id == variety.id,
            Sale.stock_type == 'new_stock',
            Sale.tenant_id == tenant.id
        ).scalar() or Decimal('0')
        
        total_returned = db.query(
            func.sum(SupplierReturn.quantity)
        ).filter(
            SupplierReturn.variety_id == variety.id,
            SupplierReturn.tenant_id == tenant.id
        ).scalar() or Decimal('0')
        
        low_stock_items.append(
            InventoryStatusResponse(
                variety_id=variety.id,
                variety_name=variety.name,
                current_stock=variety.current_stock,
                min_stock_level=variety.min_stock_level,
                is_low_stock=True,
                total_supplied=total_supplied,
                total_sold=total_sold,
                total_returned=total_returned,
                measurement_unit=variety.measurement_unit.value
            )
        )
    
    return low_stock_items


@router.post("/adjust/{variety_id}")
def adjust_inventory(
    variety_id: int,
    quantity: float,
    notes: str,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.DELETE_INVENTORY)),  # 🆕 RBAC CHECK (Owner only)
    db: Session = Depends(get_db)
):
    """
    Manually adjust inventory (tenant-isolated, requires DELETE_INVENTORY permission - Owner only)
    For corrections, damaged goods, etc.
    Positive quantity = add stock, Negative quantity = remove stock
    """
    # Get variety WITH TENANT FILTER
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variety with ID {variety_id} not found in your business"
        )
    
    quantity_decimal = Decimal(str(quantity))
    
    # Update stock
    variety.current_stock += quantity_decimal
    
    if variety.current_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment would result in negative stock"
        )
    
    # Log the adjustment WITH TENANT
    inventory_movement = InventoryMovement(
        tenant_id=tenant.id,
        variety_id=variety_id,
        movement_type='manual_adjustment',
        quantity=quantity_decimal,
        reference_type='manual',
        notes=notes,
        movement_date=date.today(),
        stock_after=variety.current_stock
    )
    
    db.add(inventory_movement)
    db.commit()
    
    return {
        "success": True,
        "variety_id": variety_id,
        "variety_name": variety.name,
        "adjustment": float(quantity_decimal),
        "new_stock_level": float(variety.current_stock)
    }
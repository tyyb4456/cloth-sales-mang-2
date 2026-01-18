# app/routes/supplier.py - UPDATED WITH MULTI-TENANCY AND RBAC

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal
from database import get_db
from models import SupplierInventory, SupplierReturn, ClothVariety, InventoryMovement
from schemas import (
    SupplierInventoryCreate, SupplierInventoryResponse,
    SupplierReturnCreate, SupplierReturnResponse,
    DailySupplierSummary
)
from routes.auth_routes import get_current_tenant
from auth_models import Tenant, User
from rbac import require_permission, Permission  # 🆕 RBAC IMPORTS

router = APIRouter(prefix="/supplier", tags=["Supplier Management"])


# ==================== SUPPLIER INVENTORY ====================

@router.post("/inventory", response_model=SupplierInventoryResponse, status_code=status.HTTP_201_CREATED)
def add_supplier_inventory(
    inventory: SupplierInventoryCreate,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.ADD_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Record daily supply from supplier (tenant-isolated, requires ADD_INVENTORY permission)"""
    
    # Check if variety exists FOR THIS TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == inventory.variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloth variety with ID {inventory.variety_id} not found in your business"
        )
    
    quantity_decimal = Decimal(str(inventory.quantity))
    total_amount = quantity_decimal * inventory.price_per_item
    
    db_inventory = SupplierInventory(
        tenant_id=tenant.id,
        supplier_name=inventory.supplier_name,
        variety_id=inventory.variety_id,
        quantity=quantity_decimal,
        price_per_item=inventory.price_per_item,
        total_amount=total_amount,
        supply_date=inventory.supply_date,
        quantity_used=Decimal('0'),
        quantity_remaining=quantity_decimal,
        quantity_returned=Decimal('0')
    )
    
    db.add(db_inventory)
    db.flush()
    
    # Update variety current stock
    variety.current_stock += quantity_decimal
    
    # Log inventory movement
    inventory_movement = InventoryMovement(
        tenant_id=tenant.id,
        variety_id=inventory.variety_id,
        movement_type='supply',
        quantity=quantity_decimal,
        reference_id=db_inventory.id,
        reference_type='supplier_inventory',
        notes=f'Supply from {inventory.supplier_name}',
        movement_date=inventory.supply_date,
        stock_after=variety.current_stock
    )
    
    db.add(inventory_movement)
    db.commit()
    db.refresh(db_inventory)
    
    return db_inventory


@router.get("/inventory", response_model=List[SupplierInventoryResponse])
def get_all_inventory(
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Get all supplier inventory records (tenant-isolated, requires VIEW_INVENTORY permission)"""
    
    inventories = db.query(SupplierInventory).filter(
        SupplierInventory.tenant_id == tenant.id
    ).all()
    
    return inventories


@router.get("/inventory/date/{supply_date}", response_model=List[SupplierInventoryResponse])
def get_inventory_by_date(
    supply_date: date,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Get supplier inventory for a specific date (tenant-isolated, requires VIEW_INVENTORY permission)"""
    
    inventories = db.query(SupplierInventory).filter(
        SupplierInventory.supply_date == supply_date,
        SupplierInventory.tenant_id == tenant.id
    ).all()
    
    return inventories


@router.delete("/inventory/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(
    inventory_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.DELETE_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Delete a supplier inventory record (tenant-isolated, requires DELETE_INVENTORY permission)"""
    
    inventory = db.query(SupplierInventory).filter(
        SupplierInventory.id == inventory_id,
        SupplierInventory.tenant_id == tenant.id
    ).first()
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found in your business"
        )
    
    # Check if any quantity has been used or returned
    if inventory.quantity_used > 0 or inventory.quantity_returned > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete inventory that has been used or returned"
        )
    
    # Restore variety stock
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == inventory.variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if variety:
        variety.current_stock -= inventory.quantity
        
        inventory_movement = InventoryMovement(
            tenant_id=tenant.id,
            variety_id=inventory.variety_id,
            movement_type='supply_reversal',
            quantity=-inventory.quantity,
            reference_id=inventory_id,
            reference_type='inventory_deleted',
            notes='Supplier inventory deleted',
            movement_date=date.today(),
            stock_after=variety.current_stock
        )
        db.add(inventory_movement)
    
    db.delete(inventory)
    db.commit()
    
    return None


# ==================== SUPPLIER RETURNS ====================

@router.post("/returns", response_model=SupplierReturnResponse, status_code=status.HTTP_201_CREATED)
def add_supplier_return(
    return_item: SupplierReturnCreate,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.ADD_RETURNS)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Record returns to supplier (tenant-isolated, requires ADD_RETURNS permission)"""
    
    # Check if variety exists FOR THIS TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == return_item.variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloth variety not found in your business"
        )
    
    quantity_decimal = Decimal(str(return_item.quantity))
    
    # Check if enough stock to return
    if variety.current_stock < quantity_decimal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock! Available: {variety.current_stock}"
        )
    
    # Find supplier inventory to return from (FIFO - TENANT FILTERED)
    supplier_inventory = db.query(SupplierInventory).filter(
        SupplierInventory.variety_id == return_item.variety_id,
        SupplierInventory.supplier_name == return_item.supplier_name,
        SupplierInventory.quantity_remaining > 0,
        SupplierInventory.tenant_id == tenant.id
    ).order_by(SupplierInventory.supply_date.asc()).first()
    
    if not supplier_inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No available inventory from supplier '{return_item.supplier_name}'"
        )
    
    if supplier_inventory.quantity_remaining < quantity_decimal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough remaining from this supplier"
        )
    
    total_amount = quantity_decimal * return_item.price_per_item
    
    db_return = SupplierReturn(
        tenant_id=tenant.id,
        supplier_name=return_item.supplier_name,
        variety_id=return_item.variety_id,
        quantity=quantity_decimal,
        price_per_item=return_item.price_per_item,
        total_amount=total_amount,
        return_date=return_item.return_date,
        reason=return_item.reason,
        supplier_inventory_id=supplier_inventory.id
    )
    
    db.add(db_return)
    db.flush()
    
    # Update supplier inventory
    supplier_inventory.quantity_returned += quantity_decimal
    supplier_inventory.quantity_remaining -= quantity_decimal
    
    # Deduct from variety stock
    variety.current_stock -= quantity_decimal
    
    # Log inventory movement
    inventory_movement = InventoryMovement(
        tenant_id=tenant.id,
        variety_id=return_item.variety_id,
        movement_type='return',
        quantity=-quantity_decimal,
        reference_id=db_return.id,
        reference_type='supplier_return',
        notes=f'Return to {return_item.supplier_name}: {return_item.reason or "No reason"}',
        movement_date=return_item.return_date,
        stock_after=variety.current_stock
    )
    
    db.add(inventory_movement)
    db.commit()
    db.refresh(db_return)
    
    return db_return


@router.get("/returns", response_model=List[SupplierReturnResponse])
def get_all_returns(
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_RETURNS)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Get all supplier return records (tenant-isolated, requires VIEW_RETURNS permission)"""
    
    returns = db.query(SupplierReturn).filter(
        SupplierReturn.tenant_id == tenant.id
    ).all()
    
    return returns


@router.get("/returns/date/{return_date}", response_model=List[SupplierReturnResponse])
def get_returns_by_date(
    return_date: date,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_RETURNS)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Get supplier returns for a specific date (tenant-isolated, requires VIEW_RETURNS permission)"""
    
    returns = db.query(SupplierReturn).filter(
        SupplierReturn.return_date == return_date,
        SupplierReturn.tenant_id == tenant.id
    ).all()
    
    return returns


@router.delete("/returns/{return_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_return(
    return_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.DELETE_RETURNS)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Delete a supplier return record (tenant-isolated, requires DELETE_RETURNS permission)"""
    
    return_record = db.query(SupplierReturn).filter(
        SupplierReturn.id == return_id,
        SupplierReturn.tenant_id == tenant.id
    ).first()
    
    if not return_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Return record not found in your business"
        )
    
    # Restore supplier inventory
    if return_record.supplier_inventory_id:
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.id == return_record.supplier_inventory_id,
            SupplierInventory.tenant_id == tenant.id
        ).first()
        
        if supplier_inventory:
            supplier_inventory.quantity_returned -= return_record.quantity
            supplier_inventory.quantity_remaining += return_record.quantity
    
    # Restore variety stock
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == return_record.variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if variety:
        variety.current_stock += return_record.quantity
        
        inventory_movement = InventoryMovement(
            tenant_id=tenant.id,
            variety_id=return_record.variety_id,
            movement_type='return_reversal',
            quantity=return_record.quantity,
            reference_id=return_id,
            reference_type='return_deleted',
            notes='Supplier return deleted',
            movement_date=date.today(),
            stock_after=variety.current_stock
        )
        db.add(inventory_movement)
    
    db.delete(return_record)
    db.commit()
    
    return None


# ==================== SUMMARIES ====================

@router.get("/daily-summary/{summary_date}", response_model=DailySupplierSummary)
def get_daily_supplier_summary(
    summary_date: date,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Get supplier summary for a specific date (tenant-isolated, requires VIEW_INVENTORY permission)"""
    
    # TENANT FILTERED
    supply_result = db.query(
        func.sum(SupplierInventory.total_amount).label('total'),
        func.count(SupplierInventory.id).label('count')
    ).filter(
        SupplierInventory.supply_date == summary_date,
        SupplierInventory.tenant_id == tenant.id
    ).first()
    
    total_supply = supply_result.total if supply_result.total else Decimal('0.00')
    supply_count = supply_result.count if supply_result.count else 0
    
    # TENANT FILTERED
    return_result = db.query(
        func.sum(SupplierReturn.total_amount).label('total'),
        func.count(SupplierReturn.id).label('count')
    ).filter(
        SupplierReturn.return_date == summary_date,
        SupplierReturn.tenant_id == tenant.id
    ).first()
    
    total_returns = return_result.total if return_result.total else Decimal('0.00')
    return_count = return_result.count if return_result.count else 0
    
    net_amount = total_supply - total_returns
    
    return DailySupplierSummary(
        date=summary_date,
        total_supply=total_supply,
        total_returns=total_returns,
        net_amount=net_amount,
        supply_count=supply_count,
        return_count=return_count
    )


@router.get("/supplier-summary/{summary_date}")
def get_supplier_wise_summary(
    summary_date: date,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_INVENTORY)),  # 🆕 RBAC CHECK
    db: Session = Depends(get_db)
):
    """Get summary grouped by supplier for a specific date (tenant-isolated, requires VIEW_INVENTORY permission)"""
    
    # TENANT FILTERED
    supplies = db.query(
        SupplierInventory.supplier_name,
        func.sum(SupplierInventory.total_amount).label('total_supply'),
        func.sum(SupplierInventory.quantity).label('total_quantity'),
        func.count(SupplierInventory.id).label('record_count')
    ).filter(
        SupplierInventory.supply_date == summary_date,
        SupplierInventory.tenant_id == tenant.id
    ).group_by(SupplierInventory.supplier_name).all()
    
    # TENANT FILTERED
    returns = db.query(
        SupplierReturn.supplier_name,
        func.sum(SupplierReturn.total_amount).label('total_returns'),
        func.sum(SupplierReturn.quantity).label('total_quantity'),
        func.count(SupplierReturn.id).label('record_count')
    ).filter(
        SupplierReturn.return_date == summary_date,
        SupplierReturn.tenant_id == tenant.id
    ).group_by(SupplierReturn.supplier_name).all()
    
    supplier_data = {}
    
    for supply in supplies:
        supplier_data[supply.supplier_name] = {
            'supplier_name': supply.supplier_name,
            'total_supply': float(supply.total_supply),
            'supply_quantity': supply.total_quantity,
            'supply_records': supply.record_count,
            'total_returns': 0,
            'return_quantity': 0,
            'return_records': 0,
            'net_amount': float(supply.total_supply)
        }
    
    for return_item in returns:
        if return_item.supplier_name in supplier_data:
            supplier_data[return_item.supplier_name]['total_returns'] = float(return_item.total_returns)
            supplier_data[return_item.supplier_name]['return_quantity'] = return_item.total_quantity
            supplier_data[return_item.supplier_name]['return_records'] = return_item.record_count
            supplier_data[return_item.supplier_name]['net_amount'] -= float(return_item.total_returns)
        else:
            supplier_data[return_item.supplier_name] = {
                'supplier_name': return_item.supplier_name,
                'total_supply': 0,
                'supply_quantity': 0,
                'supply_records': 0,
                'total_returns': float(return_item.total_returns),
                'return_quantity': return_item.total_quantity,
                'return_records': return_item.record_count,
                'net_amount': -float(return_item.total_returns)
            }
    
    return {
        'date': summary_date,
        'suppliers': list(supplier_data.values())
    }
# app/routes/shopkeeper_stock.py - FULLY UPDATED WITH MULTI-TENANCY

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import ShopkeeperStock, ShopkeeperSales, ShopkeeperReturn, ClothVariety, InventoryMovement, SupplierInventory
from schemas import (
    ShopkeeperStockCreate,
    ShopkeeperStockResponse,
    ShopkeeperSalesCreate,
    ShopkeeperReturnCreate,
    ShopkeeperStockSummary
)
from routes.auth_routes import get_current_tenant  # 🆕 NEW IMPORT
from auth_models import Tenant  # 🆕 NEW IMPORT

router = APIRouter(prefix="/shopkeeper-stock", tags=["Shopkeeper Stock Management"])


@router.post("/issue", response_model=ShopkeeperStockResponse, status_code=status.HTTP_201_CREATED)
def issue_stock_to_shopkeeper(
    stock: ShopkeeperStockCreate,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 MULTI-TENANT
    db: Session = Depends(get_db)
):
    """
    Issue stock to a shopkeeper (consignment/stock-on-credit) - tenant-isolated
    """
    # 🆕 Verify variety exists FOR THIS TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == stock.variety_id,
        ClothVariety.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variety with ID {stock.variety_id} not found in your business"
        )
    
    quantity_decimal = Decimal(str(stock.quantity_issued))
    
    # Check stock if deducted_from_inventory is True
    if stock.deducted_from_inventory:
        if variety.current_stock < quantity_decimal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock! Available: {variety.current_stock}, Requested: {quantity_decimal}"
            )
    
    # Find supplier inventory to deduct from (FIFO) - TENANT FILTERED
    supplier_inventory_id = None
    
    if stock.deducted_from_inventory:
        # 🆕 Find oldest supplier inventory WITH TENANT FILTER
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.variety_id == stock.variety_id,
            SupplierInventory.quantity_remaining > 0,
            SupplierInventory.tenant_id == tenant.id  # 🆕 TENANT FILTER
        ).order_by(SupplierInventory.supply_date.asc()).first()
        
        if not supplier_inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No supplier inventory found with remaining stock in your business"
            )
        
        # Check if enough remaining from this supplier
        if supplier_inventory.quantity_remaining < quantity_decimal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough remaining from oldest supplier inventory. Available: {supplier_inventory.quantity_remaining}, Requested: {quantity_decimal}"
            )
        
        # UPDATE SUPPLIER INVENTORY
        supplier_inventory.quantity_used += quantity_decimal
        supplier_inventory.quantity_remaining -= quantity_decimal
        supplier_inventory_id = supplier_inventory.id
    
    # Create shopkeeper stock record
    db_stock = ShopkeeperStock(
        tenant_id=tenant.id,  # 🆕 SET TENANT
        shopkeeper_name=stock.shopkeeper_name,
        shopkeeper_phone=stock.shopkeeper_phone,
        variety_id=stock.variety_id,
        quantity_issued=quantity_decimal,
        quantity_sold=Decimal('0'),
        quantity_returned=Decimal('0'),
        quantity_remaining=quantity_decimal,
        issue_date=stock.issue_date,
        notes=stock.notes,
        deducted_from_inventory=stock.deducted_from_inventory,
        supplier_inventory_id=supplier_inventory_id
    )
    
    db.add(db_stock)
    db.flush()  # Get the ID
    
    # ONLY deduct from variety stock if flag is True
    if stock.deducted_from_inventory:
        variety.current_stock -= quantity_decimal
        
        # Log inventory movement
        inventory_movement = InventoryMovement(
            tenant_id=tenant.id,  # 🆕 SET TENANT
            variety_id=stock.variety_id,
            movement_type='shopkeeper_issue',
            quantity=-quantity_decimal,
            reference_id=db_stock.id,
            reference_type='shopkeeper_stock',
            notes=f'Issued to shopkeeper: {stock.shopkeeper_name}',
            movement_date=stock.issue_date,
            stock_after=variety.current_stock
        )
        db.add(inventory_movement)
    
    db.commit()
    db.refresh(db_stock)
    
    return db_stock


@router.get("/", response_model=List[ShopkeeperStockResponse])
def get_all_shopkeeper_stock(
    shopkeeper_name: Optional[str] = None,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 MULTI-TENANT
    db: Session = Depends(get_db)
):
    """Get all shopkeeper stock records (tenant-isolated), optionally filtered by shopkeeper name"""
    
    # 🆕 Start with tenant filter
    query = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.tenant_id == tenant.id  # 🆕 TENANT FILTER
    )
    
    if shopkeeper_name:
        query = query.filter(
            func.lower(ShopkeeperStock.shopkeeper_name).like(f"%{shopkeeper_name.lower()}%")
        )
    
    stocks = query.order_by(ShopkeeperStock.issue_date.desc()).all()
    return stocks


@router.get("/{stock_id}", response_model=ShopkeeperStockResponse)
def get_shopkeeper_stock(
    stock_id: int,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 MULTI-TENANT
    db: Session = Depends(get_db)
):
    """Get a specific shopkeeper stock record (tenant-isolated)"""
    
    # 🆕 Get stock WITH TENANT FILTER
    stock = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.id == stock_id,
        ShopkeeperStock.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock record with ID {stock_id} not found in your business"
        )
    
    return stock


@router.post("/{stock_id}/sales", response_model=ShopkeeperStockResponse)
def record_shopkeeper_sales(
    stock_id: int,
    sales: ShopkeeperSalesCreate,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 MULTI-TENANT
    db: Session = Depends(get_db)
):
    """
    Record sales made by shopkeeper (tenant-isolated)
    Updates quantity_sold and quantity_remaining
    """
    
    # 🆕 Get stock WITH TENANT FILTER
    stock = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.id == stock_id,
        ShopkeeperStock.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock record with ID {stock_id} not found in your business"
        )
    
    quantity_decimal = Decimal(str(sales.quantity_sold))
    
    # Validate quantity
    if quantity_decimal > stock.quantity_remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot sell more than remaining quantity! Remaining: {stock.quantity_remaining}"
        )
    
    # Create sales record
    db_sales = ShopkeeperSales(
        shopkeeper_stock_id=stock_id,
        quantity_sold=quantity_decimal,
        sale_date=sales.sale_date,
        notes=sales.notes
    )
    
    db.add(db_sales)
    
    # Update stock record
    stock.quantity_sold += quantity_decimal
    stock.quantity_remaining -= quantity_decimal
    
    db.commit()
    db.refresh(stock)
    
    return stock


@router.post("/{stock_id}/return", response_model=ShopkeeperStockResponse)
def record_shopkeeper_return(
    stock_id: int,
    return_item: ShopkeeperReturnCreate,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 MULTI-TENANT
    db: Session = Depends(get_db)
):
    """
    Record return from shopkeeper (tenant-isolated)
    Restores supplier inventory ONLY if stock was originally deducted
    """
    
    # 🆕 Get stock WITH TENANT FILTER
    stock = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.id == stock_id,
        ShopkeeperStock.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock record with ID {stock_id} not found in your business"
        )
    
    quantity_decimal = Decimal(str(return_item.quantity_returned))
    
    # Validate quantity
    if quantity_decimal > stock.quantity_remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot return more than remaining quantity! Remaining: {stock.quantity_remaining}"
        )
    
    # Create return record
    db_return = ShopkeeperReturn(
        shopkeeper_stock_id=stock_id,
        quantity_returned=quantity_decimal,
        return_date=return_item.return_date,
        notes=return_item.notes
    )
    
    db.add(db_return)
    
    # Update stock record
    stock.quantity_returned += quantity_decimal
    stock.quantity_remaining -= quantity_decimal
    
    # Restore supplier inventory if it was deducted (WITH TENANT CHECK)
    if stock.deducted_from_inventory and stock.supplier_inventory_id:
        # 🆕 Verify supplier inventory belongs to same tenant
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.id == stock.supplier_inventory_id,
            SupplierInventory.tenant_id == tenant.id  # 🆕 TENANT FILTER
        ).first()
        
        if supplier_inventory:
            supplier_inventory.quantity_used -= quantity_decimal
            supplier_inventory.quantity_remaining += quantity_decimal
    
    # Restore variety stock if it was deducted
    if stock.deducted_from_inventory:
        # 🆕 Verify variety belongs to same tenant
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == stock.variety_id,
            ClothVariety.tenant_id == tenant.id  # 🆕 TENANT FILTER
        ).first()
        
        if variety:
            variety.current_stock += quantity_decimal
            
            # Log inventory movement
            inventory_movement = InventoryMovement(
                tenant_id=tenant.id,  # 🆕 SET TENANT
                variety_id=stock.variety_id,
                movement_type='shopkeeper_return',
                quantity=quantity_decimal,
                reference_id=stock_id,
                reference_type='shopkeeper_return',
                notes=f'Returned by shopkeeper: {stock.shopkeeper_name}',
                movement_date=return_item.return_date,
                stock_after=variety.current_stock
            )
            db.add(inventory_movement)
    
    db.commit()
    db.refresh(stock)
    
    return stock


@router.get("/summary/by-shopkeeper")
def get_shopkeeper_summary(
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 MULTI-TENANT
    db: Session = Depends(get_db)
):
    """Get summary statistics grouped by shopkeeper (tenant-isolated)"""
    
    # 🆕 Aggregate WITH TENANT FILTER
    result = db.query(
        ShopkeeperStock.shopkeeper_name,
        func.count(ShopkeeperStock.id).label('total_records'),
        func.sum(ShopkeeperStock.quantity_issued).label('total_issued'),
        func.sum(ShopkeeperStock.quantity_sold).label('total_sold'),
        func.sum(ShopkeeperStock.quantity_returned).label('total_returned'),
        func.sum(ShopkeeperStock.quantity_remaining).label('total_remaining')
    ).filter(
        ShopkeeperStock.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).group_by(ShopkeeperStock.shopkeeper_name).all()
    
    summaries = []
    for row in result:
        summaries.append({
            "shopkeeper_name": row.shopkeeper_name,
            "total_records": row.total_records,
            "total_issued": float(row.total_issued or 0),
            "total_sold": float(row.total_sold or 0),
            "total_returned": float(row.total_returned or 0),
            "total_remaining": float(row.total_remaining or 0)
        })
    
    return summaries


@router.delete("/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shopkeeper_stock(
    stock_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Delete a shopkeeper stock record (tenant-isolated)
    ✅ FIXED: Restores FULL quantity_issued (not just remaining)
    """
    
    stock = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.id == stock_id,
        ShopkeeperStock.tenant_id == tenant.id
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock record with ID {stock_id} not found in your business"
        )
    
    # ✅ CRITICAL FIX: Calculate net quantity to restore
    # quantity_issued - quantity_returned (returns were already added back!)
    # Example: Issued 50, Sold 20, Returned 30
    # - Return already added 30 back to inventory
    # - So we only need to restore: 50 - 30 = 20
    restore_quantity = stock.quantity_issued - stock.quantity_returned
    
    # Restore supplier inventory if applicable (WITH TENANT CHECK)
    if stock.deducted_from_inventory and stock.supplier_inventory_id and restore_quantity > 0:
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.id == stock.supplier_inventory_id,
            SupplierInventory.tenant_id == tenant.id
        ).first()
        
        if supplier_inventory:
            # ✅ Restore full issued quantity
            supplier_inventory.quantity_used -= restore_quantity
            supplier_inventory.quantity_remaining += restore_quantity
    
    # Restore variety stock if applicable
    if stock.deducted_from_inventory and restore_quantity > 0:
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == stock.variety_id,
            ClothVariety.tenant_id == tenant.id
        ).first()
        
        if variety:
            # ✅ Restore full issued quantity
            variety.current_stock += restore_quantity
            
            # Log inventory movement
            inventory_movement = InventoryMovement(
                tenant_id=tenant.id,
                variety_id=stock.variety_id,
                movement_type='shopkeeper_issue_reversal',
                quantity=restore_quantity,  # Full quantity
                reference_id=stock_id,
                reference_type='shopkeeper_stock_deleted',
                notes=f'Shopkeeper transaction deleted - restored FULL {restore_quantity} units (was issued, sold: {stock.quantity_sold}, returned: {stock.quantity_returned})',
                movement_date=date.today(),
                stock_after=variety.current_stock
            )
            db.add(inventory_movement)
    
    db.delete(stock)
    db.commit()
    
    return None


# 🆕 NEW ENDPOINT: Get shopkeeper stock by variety (tenant-isolated)
@router.get("/by-variety/{variety_id}", response_model=List[ShopkeeperStockResponse])
def get_shopkeeper_stock_by_variety(
    variety_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get all shopkeeper stock for a specific variety (tenant-isolated)"""
    
    # Verify variety exists for this tenant
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variety not found in your business"
        )
    
    stocks = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.variety_id == variety_id,
        ShopkeeperStock.tenant_id == tenant.id
    ).order_by(ShopkeeperStock.issue_date.desc()).all()
    
    return stocks


# 🆕 NEW ENDPOINT: Get shopkeeper detailed summary (tenant-isolated)
@router.get("/shopkeeper/{shopkeeper_name}/summary")
def get_shopkeeper_detailed_summary(
    shopkeeper_name: str,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get detailed summary for a specific shopkeeper (tenant-isolated)"""
    
    # Get all stocks for this shopkeeper (tenant-filtered)
    stocks = db.query(ShopkeeperStock).filter(
        func.lower(ShopkeeperStock.shopkeeper_name) == shopkeeper_name.lower(),
        ShopkeeperStock.tenant_id == tenant.id
    ).all()
    
    if not stocks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No records found for shopkeeper '{shopkeeper_name}' in your business"
        )
    
    # Calculate totals
    total_issued = sum(float(s.quantity_issued) for s in stocks)
    total_sold = sum(float(s.quantity_sold) for s in stocks)
    total_returned = sum(float(s.quantity_returned) for s in stocks)
    total_remaining = sum(float(s.quantity_remaining) for s in stocks)
    
    # Get variety breakdown
    variety_breakdown = {}
    for stock in stocks:
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == stock.variety_id,
            ClothVariety.tenant_id == tenant.id
        ).first()
        
        if variety:
            variety_name = variety.name
            if variety_name not in variety_breakdown:
                variety_breakdown[variety_name] = {
                    "issued": 0,
                    "sold": 0,
                    "returned": 0,
                    "remaining": 0
                }
            
            variety_breakdown[variety_name]["issued"] += float(stock.quantity_issued)
            variety_breakdown[variety_name]["sold"] += float(stock.quantity_sold)
            variety_breakdown[variety_name]["returned"] += float(stock.quantity_returned)
            variety_breakdown[variety_name]["remaining"] += float(stock.quantity_remaining)
    
    return {
        "shopkeeper_name": shopkeeper_name,
        "total_records": len(stocks),
        "summary": {
            "total_issued": total_issued,
            "total_sold": total_sold,
            "total_returned": total_returned,
            "total_remaining": total_remaining,
            "sales_rate": round((total_sold / total_issued * 100), 2) if total_issued > 0 else 0
        },
        "variety_breakdown": variety_breakdown,
        "latest_issue_date": max(s.issue_date for s in stocks) if stocks else None
    }


# 🆕 NEW ENDPOINT: Get outstanding stock by shopkeeper (tenant-isolated)
@router.get("/outstanding/list")
def get_outstanding_stock(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get all outstanding (unsold/unreturned) stock by shopkeeper (tenant-isolated)"""
    
    stocks = db.query(ShopkeeperStock).filter(
        ShopkeeperStock.quantity_remaining > 0,
        ShopkeeperStock.tenant_id == tenant.id
    ).order_by(ShopkeeperStock.issue_date.asc()).all()
    
    # Group by shopkeeper
    shopkeeper_outstanding = {}
    for stock in stocks:
        name = stock.shopkeeper_name
        if name not in shopkeeper_outstanding:
            shopkeeper_outstanding[name] = {
                "shopkeeper_name": name,
                "total_remaining": 0,
                "records_count": 0,
                "oldest_issue_date": stock.issue_date
            }
        
        shopkeeper_outstanding[name]["total_remaining"] += float(stock.quantity_remaining)
        shopkeeper_outstanding[name]["records_count"] += 1
    
    return {
        "total_shopkeepers_with_outstanding": len(shopkeeper_outstanding),
        "shopkeepers": list(shopkeeper_outstanding.values())
    }
# app/routes/sales.py - UPDATED WITH AUTO-CREATION FEATURE

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal
from database import get_db
from models import Sale, ClothVariety, SupplierInventory, InventoryMovement, StockType, MeasurementUnit
from schemas import SaleCreate, SaleResponse, DailySalesSummary, SalespersonSummary
from routes.auth_routes import get_current_tenant
from auth_models import Tenant, User
from routes.auth_routes import get_current_user
from rbac import require_permission, Permission
# Add this import at the top
from pydantic import BaseModel
from typing import Optional



router = APIRouter(prefix="/sales", tags=["Sales Management"])

# Add this schema after SaleCreate
class SaleUpdate(BaseModel):
    """Schema for updating sale (mainly for cost updates)"""
    cost_price: Optional[Decimal] = None
    profit: Optional[Decimal] = None


# ==================== CREATE SALE WITH AUTO-CREATION ====================
@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale: SaleCreate,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.ADD_SALES)),
    db: Session = Depends(get_db)
):
    """
    Record a new sale (tenant-isolated) with AUTO-CREATION feature
    
    NEW FEATURES:
    - Auto-creates variety if it doesn't exist
    - Auto-creates inventory record for both Old and New stock
    - Uses sale data for default values
    
    Required Permission: ADD_SALES
    Allowed Roles: Owner, Salesperson
    """
    
    # ========== STEP 1: Handle Variety (Auto-create if needed) ==========
    variety = None
    
    # Check if variety_id was provided and exists
    if sale.variety_id:
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == sale.variety_id,
            ClothVariety.tenant_id == tenant.id
        ).first()
    
    # If variety doesn't exist and variety_name is provided, create it
    if not variety and sale.variety_name:
        variety_name = sale.variety_name.strip()
        
        print(f"📦 Auto-creating variety: {variety_name}")
        
        # Calculate cost per unit
        cost_per_unit_calc = Decimal(str(sale.cost_price)) / Decimal(str(sale.quantity))
        
        variety = ClothVariety(
            tenant_id=tenant.id,
            name=variety_name,
            measurement_unit=MeasurementUnit.PIECES,  # Default to pieces
            description=None,  # Empty description
            default_cost_price=cost_per_unit_calc,  # Cost per unit
            current_stock=Decimal('0'),  # Will be updated by inventory
            min_stock_level=None
        )
        
        db.add(variety)
        db.flush()  # Get the ID
        print(f"✅ Variety created with ID: {variety.id}")
    
    # If still no variety, raise error
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variety not found. Please provide variety_id or variety_name"
        )
    
    # ========== STEP 2: Calculate Sale Values ==========
    quantity = Decimal(str(sale.quantity))
    total_cost = Decimal(str(sale.cost_price))
    total_selling = Decimal(str(sale.selling_price))
    
    cost_per_unit = total_cost / quantity
    selling_per_unit = total_selling / quantity
    profit_per_unit = selling_per_unit - cost_per_unit
    total_profit = profit_per_unit * quantity
    
    # ========== STEP 3: Handle Inventory (Auto-create if needed) ==========
    supplier_inventory_id = None

    # Always auto-create inventory if needed (no stock_type check)
    # Check if there's existing inventory with remaining stock
    existing_inventory = db.query(SupplierInventory).filter(
        SupplierInventory.variety_id == variety.id,
        SupplierInventory.quantity_remaining >= quantity,
        SupplierInventory.tenant_id == tenant.id
    ).order_by(SupplierInventory.supply_date.asc()).first()

    if existing_inventory:
        # Use existing inventory (FIFO)
        supplier_inventory = existing_inventory
        print(f"✅ Using existing inventory ID: {supplier_inventory.id}")
    else:
        # Auto-create inventory record
        print(f"📦 Auto-creating inventory")
        
        supplier_inventory = SupplierInventory(
            tenant_id=tenant.id,
            supplier_name="To Be Updated",  # Placeholder
            variety_id=variety.id,
            quantity=quantity,  # Use sale quantity
            price_per_item=cost_per_unit,  # Use cost from sale
            total_amount=total_cost,  # Total cost
            supply_date=sale.sale_date,  # Use sale date
            quantity_used=Decimal('0'),
            quantity_remaining=quantity,
            quantity_returned=Decimal('0')
        )
        
        db.add(supplier_inventory)
        db.flush()
        print(f"✅ Inventory created with ID: {supplier_inventory.id}")
        
    # Deduct from inventory
    supplier_inventory.quantity_used += quantity
    supplier_inventory.quantity_remaining -= quantity
    supplier_inventory_id = supplier_inventory.id

    # Update variety stock
    variety.current_stock += quantity  # First add the new stock
    variety.current_stock -= quantity  # Then deduct the sale

    # Log inventory movement
    inventory_movement = InventoryMovement(
        tenant_id=tenant.id,
        variety_id=variety.id,
        movement_type='sale',
        quantity=-quantity,
        reference_type='sale',
        notes=f'Sale by {sale.salesperson_name} (auto-inventory)',
        movement_date=sale.sale_date,
        stock_after=variety.current_stock
    )
    db.add(inventory_movement)
    
    # ========== STEP 4: Create Sale Record ==========
    db_sale = Sale(
        tenant_id=tenant.id,
        salesperson_name=sale.salesperson_name,
        variety_id=variety.id,
        quantity=quantity,
        selling_price=selling_per_unit,
        cost_price=cost_per_unit,
        profit=total_profit,
        sale_date=sale.sale_date,
        supplier_inventory_id=supplier_inventory_id,
        payment_status=sale.payment_status,
        customer_name=sale.customer_name
    )

    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)

    # Update inventory movement reference
    inventory_movement.reference_id = db_sale.id
    db.commit()
    
    print(f"✅ Sale recorded successfully with ID: {db_sale.id}")
    
    return db_sale


# ==================== GET ALL SALES ====================
@router.get("/", response_model=List[SaleResponse])
def get_all_sales(
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_SALES)),
    db: Session = Depends(get_db)
):
    """Get all sales records (tenant-isolated)"""
    sales = db.query(Sale).filter(Sale.tenant_id == tenant.id).all()
    return sales


# ==================== GET SALES BY DATE ====================
@router.get("/date/{sale_date}", response_model=List[SaleResponse])
def get_sales_by_date(
    sale_date: date,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_SALES)),
    db: Session = Depends(get_db)
):
    """Get all sales for a specific date (tenant-isolated)"""
    sales = db.query(Sale).filter(
        Sale.sale_date == sale_date,
        Sale.tenant_id == tenant.id
    ).all()
    return sales


# ==================== DELETE SALE ====================
@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.DELETE_SALES)),
    db: Session = Depends(get_db)
):
    """Delete a sale record (tenant-isolated) - OWNER ONLY"""
    
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant.id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sale not found in your business"
        )
    
    # Restore inventory
    if sale.supplier_inventory_id:
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.id == sale.supplier_inventory_id,
            SupplierInventory.tenant_id == tenant.id
        ).first()
        
        if supplier_inventory:
            supplier_inventory.quantity_used -= sale.quantity
            supplier_inventory.quantity_remaining += sale.quantity
        
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == sale.variety_id,
            ClothVariety.tenant_id == tenant.id
        ).first()
        
        if variety:
            variety.current_stock += sale.quantity
            
            inventory_movement = InventoryMovement(
                tenant_id=tenant.id,
                variety_id=sale.variety_id,
                movement_type='sale_reversal',
                quantity=sale.quantity,
                reference_id=sale_id,
                reference_type='sale_deleted',
                notes='Sale deleted - stock restored',
                movement_date=date.today(),
                stock_after=variety.current_stock
            )
            db.add(inventory_movement)
    
    db.delete(sale)
    db.commit()
    
    return None


# ==================== GET DAILY SALES SUMMARY ====================
@router.get("/daily-summary/{sale_date}", response_model=DailySalesSummary)
def get_daily_sales_summary(
    sale_date: date,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.VIEW_SALES)),
    db: Session = Depends(get_db)
):
    """Get sales summary for a specific date (tenant-isolated)"""
    
    result = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('total_sales'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity).label('total_quantity'),
        func.count(Sale.id).label('sales_count')
    ).filter(
        Sale.sale_date == sale_date,
        Sale.tenant_id == tenant.id
    ).first()
    
    total_sales = result.total_sales if result.total_sales else Decimal('0.00')
    total_profit = result.total_profit if result.total_profit else Decimal('0.00')
    total_quantity = result.total_quantity if result.total_quantity else 0
    sales_count = result.sales_count if result.sales_count else 0
    
    return DailySalesSummary(
        date=sale_date,
        total_sales_amount=total_sales,
        total_profit=total_profit,
        total_quantity_sold=total_quantity,
        sales_count=sales_count
    )

@router.put("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    sale_update: SaleUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.ADD_SALES)),  # Owner or Salesperson can update
    db: Session = Depends(get_db)
):
    """
    Update a sale record (mainly for updating cost price)
    
    Required Permission: ADD_SALES
    Allowed Roles: Owner, Salesperson
    """
    
    # Get the sale
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant.id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sale not found in your business"
        )
    
    # Update cost_price if provided
    if sale_update.cost_price is not None:
        # Recalculate profit
        quantity = Decimal(str(sale.quantity))
        new_cost_per_unit = Decimal(str(sale_update.cost_price))
        selling_per_unit = Decimal(str(sale.selling_price))
        
        profit_per_unit = selling_per_unit - new_cost_per_unit
        total_profit = profit_per_unit * quantity
        
        sale.cost_price = new_cost_per_unit
        sale.profit = total_profit
    
    # Update profit directly if provided (alternative method)
    elif sale_update.profit is not None:
        sale.profit = Decimal(str(sale_update.profit))
    
    db.commit()
    db.refresh(sale)
    
    return sale
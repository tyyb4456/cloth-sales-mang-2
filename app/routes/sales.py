# app/routes/sales.py - UPDATED WITH AUTO-CREATION FEATURE

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal
from database import get_db
from models import Sale, ClothVariety, SupplierInventory, InventoryMovement, StockType, MeasurementUnit, PaymentStatus
from schemas import SaleCreate, SaleResponse, DailySalesSummary, SalespersonSummary, SaleUpdate
from routes.auth_routes import get_current_tenant
from auth_models import Tenant, User
from routes.auth_routes import get_current_user
from rbac import require_permission, Permission
# Add this import at the top
from pydantic import BaseModel
from typing import Optional



router = APIRouter(prefix="/sales", tags=["Sales Management"])


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
    user: User = Depends(require_permission(Permission.ADD_SALES)),
    db: Session = Depends(get_db)
):
    """
    Update a sale record - FULL FLEXIBILITY + INVENTORY SYNC
    
    ✨ NEW: Updates inventory cost price when sale cost is changed
    
    Can update: Salesperson, Variety, Quantity, Prices, Payment, Date
    Required Permission: ADD_SALES (Owner or Salesperson)
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
    
    # Track changes
    recalculate_profit = False
    old_cost_price = sale.cost_price
    old_quantity = sale.quantity
    variety_changed = False
    quantity_changed = False
    
    # Update salesperson_name
    if sale_update.salesperson_name is not None:
        sale.salesperson_name = sale_update.salesperson_name
    
    # Update variety_id
    if sale_update.variety_id is not None:
        if sale_update.variety_id != sale.variety_id:
            variety = db.query(ClothVariety).filter(
                ClothVariety.id == sale_update.variety_id,
                ClothVariety.tenant_id == tenant.id
            ).first()
            
            if not variety:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Variety not found in your business"
                )
            
            # 🔄 If variety changes, we need to handle inventory differently
            variety_changed = True
            sale.variety_id = sale_update.variety_id
    
    # Update quantity
    if sale_update.quantity is not None:
        if sale_update.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0"
            )
        
        if sale_update.quantity != float(sale.quantity):
            quantity_changed = True
            old_quantity = sale.quantity
        
        sale.quantity = Decimal(str(sale_update.quantity))
        recalculate_profit = True
    
    # 🆕 UPDATE COST PRICE + SYNC WITH INVENTORY
    if sale_update.cost_price is not None:
        new_cost_price = Decimal(str(sale_update.cost_price))
        
        # Only update inventory if cost actually changed
        if new_cost_price != old_cost_price:
            sale.cost_price = new_cost_price
            recalculate_profit = True
            
            # 🔄 UPDATE SUPPLIER INVENTORY PRICE (if linked)
            if sale.supplier_inventory_id:
                supplier_inventory = db.query(SupplierInventory).filter(
                    SupplierInventory.id == sale.supplier_inventory_id,
                    SupplierInventory.tenant_id == tenant.id
                ).first()
                
                if supplier_inventory:
                    # Calculate new price per item from total cost
                    quantity = Decimal(str(sale.quantity))
                    new_price_per_item = new_cost_price
                    
                    # Update inventory price
                    supplier_inventory.price_per_item = new_price_per_item
                    supplier_inventory.total_amount = new_price_per_item * supplier_inventory.quantity
                    
                    print(f"✅ Updated inventory #{sale.supplier_inventory_id} price: ₹{old_cost_price} → ₹{new_price_per_item}")
            
            # 🔄 UPDATE VARIETY DEFAULT COST (optional but helpful)
            variety = db.query(ClothVariety).filter(
                ClothVariety.id == sale.variety_id,
                ClothVariety.tenant_id == tenant.id
            ).first()
            
            if variety:
                # Update variety default cost to the new price
                variety.default_cost_price = new_cost_price
                print(f"✅ Updated variety '{variety.name}' default cost: ₹{new_cost_price}")
    
    # Update selling_price
    if sale_update.selling_price is not None:
        if sale_update.selling_price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selling price must be greater than 0"
            )
        sale.selling_price = Decimal(str(sale_update.selling_price))
        recalculate_profit = True
    
    # Update payment_status
    if sale_update.payment_status is not None:
        sale.payment_status = sale_update.payment_status
        
        # If changing to paid, clear customer_name
        if sale_update.payment_status == PaymentStatus.PAID:
            sale.customer_name = None
    
    # Update customer_name
    if sale_update.customer_name is not None:
        if sale.payment_status == PaymentStatus.LOAN and not sale_update.customer_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer name required for loan sales"
            )
        sale.customer_name = sale_update.customer_name if sale.payment_status == PaymentStatus.LOAN else None
    
    # Update sale_date
    if sale_update.sale_date is not None:
        sale.sale_date = sale_update.sale_date
    
    # 🧮 Recalculate profit if needed
    if recalculate_profit:
        quantity = Decimal(str(sale.quantity))
        cost_per_unit = Decimal(str(sale.cost_price))
        selling_per_unit = Decimal(str(sale.selling_price))
        
        profit_per_unit = selling_per_unit - cost_per_unit
        total_profit = profit_per_unit * quantity
        
        sale.profit = total_profit
    
    # Manual profit override (if provided directly)
    if sale_update.profit is not None:
        sale.profit = Decimal(str(sale_update.profit))
    
    # 🔄 Handle quantity changes in inventory
    if quantity_changed and sale.supplier_inventory_id:
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.id == sale.supplier_inventory_id,
            SupplierInventory.tenant_id == tenant.id
        ).first()
        
        if supplier_inventory:
            # Calculate difference
            quantity_diff = sale.quantity - old_quantity
            
            # Update inventory quantities
            supplier_inventory.quantity_used += quantity_diff
            supplier_inventory.quantity_remaining -= quantity_diff
            
            # Update variety stock
            variety = db.query(ClothVariety).filter(
                ClothVariety.id == sale.variety_id,
                ClothVariety.tenant_id == tenant.id
            ).first()
            
            if variety:
                variety.current_stock -= quantity_diff
                
                # Log inventory movement
                inventory_movement = InventoryMovement(
                    tenant_id=tenant.id,
                    variety_id=sale.variety_id,
                    movement_type='sale_adjustment',
                    quantity=-quantity_diff,
                    reference_id=sale.id,
                    reference_type='sale_updated',
                    notes=f'Sale quantity adjusted by {float(quantity_diff)} (Sale ID: {sale.id})',
                    movement_date=date.today(),
                    stock_after=variety.current_stock
                )
                db.add(inventory_movement)
    
    db.commit()
    db.refresh(sale)
    
    return sale
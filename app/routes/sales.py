# app/routes/sales.py - UPDATED WITH MULTI-TENANCY

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal
from database import get_db
from models import Sale, ClothVariety, SupplierInventory, InventoryMovement, StockType
from schemas import SaleCreate, SaleResponse, DailySalesSummary, SalespersonSummary
from routes.auth_routes import get_current_tenant  # 🆕 NEW
from auth_models import Tenant  # 🆕 NEW

router = APIRouter(prefix="/sales", tags=["Sales Management"])


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale: SaleCreate,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Record a new sale (tenant-isolated)"""
    
    # 🆕 Check if variety exists FOR THIS TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == sale.variety_id,
        ClothVariety.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloth variety not found in your business"
        )
    
    quantity = Decimal(str(sale.quantity))
    total_cost = Decimal(str(sale.cost_price))
    total_selling = Decimal(str(sale.selling_price))
    
    cost_per_unit = total_cost / quantity
    selling_per_unit = total_selling / quantity
    profit_per_unit = selling_per_unit - cost_per_unit
    total_profit = profit_per_unit * quantity
    
    supplier_inventory_id = None
    
    # Handle NEW STOCK sales
    if sale.stock_type == StockType.NEW_STOCK:
        if variety.current_stock < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock! Available: {variety.current_stock}"
            )
        
        # 🆕 Find supplier inventory (TENANT FILTERED)
        if hasattr(sale, 'supplier_inventory_id') and sale.supplier_inventory_id:
            supplier_inventory = db.query(SupplierInventory).filter(
                SupplierInventory.id == sale.supplier_inventory_id,
                SupplierInventory.variety_id == sale.variety_id,
                SupplierInventory.quantity_remaining >= quantity,
                SupplierInventory.tenant_id == tenant.id  # 🆕 TENANT FILTER
            ).first()
            
            if not supplier_inventory:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected supplier inventory not found in your business"
                )
        else:
            # 🆕 FIFO with TENANT FILTER
            supplier_inventory = db.query(SupplierInventory).filter(
                SupplierInventory.variety_id == sale.variety_id,
                SupplierInventory.quantity_remaining > 0,
                SupplierInventory.tenant_id == tenant.id  # 🆕 TENANT FILTER
            ).order_by(SupplierInventory.supply_date.asc()).first()
            
            if not supplier_inventory:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No supplier inventory found in your business"
                )
        
        # Deduct from supplier inventory
        supplier_inventory.quantity_used += quantity
        supplier_inventory.quantity_remaining -= quantity
        supplier_inventory_id = supplier_inventory.id
        
        # Update variety stock
        variety.current_stock -= quantity
        
        # Log inventory movement
        inventory_movement = InventoryMovement(
            tenant_id=tenant.id,  # 🆕 SET TENANT
            variety_id=sale.variety_id,
            movement_type='sale',
            quantity=-quantity,
            reference_type='sale',
            notes=f'Sale by {sale.salesperson_name}',
            movement_date=sale.sale_date,
            stock_after=variety.current_stock
        )
        db.add(inventory_movement)
    
    # Create sale record
    db_sale = Sale(
        tenant_id=tenant.id,  # 🆕 SET TENANT
        salesperson_name=sale.salesperson_name,
        variety_id=sale.variety_id,
        quantity=quantity,
        selling_price=selling_per_unit,
        cost_price=cost_per_unit,
        profit=total_profit,
        sale_date=sale.sale_date,
        stock_type=sale.stock_type,
        supplier_inventory_id=supplier_inventory_id,
        payment_status=sale.payment_status,
        customer_name=sale.customer_name
    )
    
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    # Update inventory movement reference
    if sale.stock_type == StockType.NEW_STOCK:
        inventory_movement.reference_id = db_sale.id
        db.commit()
    
    return db_sale


@router.get("/", response_model=List[SaleResponse])
def get_all_sales(
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Get all sales records (tenant-isolated)"""
    
    sales = db.query(Sale).filter(
        Sale.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).all()
    
    return sales


@router.get("/date/{sale_date}", response_model=List[SaleResponse])
def get_sales_by_date(
    sale_date: date,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Get all sales for a specific date (tenant-isolated)"""
    
    sales = db.query(Sale).filter(
        Sale.sale_date == sale_date,
        Sale.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).all()
    
    return sales


@router.get("/salesperson/{salesperson_name}", response_model=List[SaleResponse])
def get_sales_by_salesperson(
    salesperson_name: str,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Get all sales by a specific salesperson (tenant-isolated)"""
    
    sales = db.query(Sale).filter(
        Sale.salesperson_name == salesperson_name,
        Sale.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).all()
    
    return sales


@router.get("/daily-summary/{sale_date}", response_model=DailySalesSummary)
def get_daily_sales_summary(
    sale_date: date,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Get sales summary for a specific date (tenant-isolated)"""
    
    # 🆕 TENANT FILTERED
    result = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('total_sales'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity).label('total_quantity'),
        func.count(Sale.id).label('sales_count')
    ).filter(
        Sale.sale_date == sale_date,
        Sale.tenant_id == tenant.id  # 🆕 TENANT FILTER
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


@router.get("/salesperson-summary/{salesperson_name}/{sale_date}", response_model=SalespersonSummary)
def get_salesperson_summary(
    salesperson_name: str,
    sale_date: date,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Get sales summary for a specific salesperson (tenant-isolated)"""
    
    # 🆕 TENANT FILTERED
    result = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('total_sales'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity).label('total_items'),
        func.count(Sale.id).label('sales_count')
    ).filter(
        Sale.salesperson_name == salesperson_name,
        Sale.sale_date == sale_date,
        Sale.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    total_sales = result.total_sales if result.total_sales else Decimal('0.00')
    total_profit = result.total_profit if result.total_profit else Decimal('0.00')
    total_items = result.total_items if result.total_items else 0
    sales_count = result.sales_count if result.sales_count else 0
    
    return SalespersonSummary(
        salesperson_name=salesperson_name,
        date=sale_date,
        total_sales=total_sales,
        total_profit=total_profit,
        total_items_sold=total_items,
        sales_count=sales_count
    )


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: int,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Delete a sale record (tenant-isolated)"""
    
    # 🆕 TENANT FILTERED
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sale not found in your business"
        )
    
    # Restore inventory if from new stock
    if sale.stock_type == StockType.NEW_STOCK and sale.supplier_inventory_id:
        # 🆕 TENANT FILTERED
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.id == sale.supplier_inventory_id,
            SupplierInventory.tenant_id == tenant.id  # 🆕 TENANT FILTER
        ).first()
        
        if supplier_inventory:
            supplier_inventory.quantity_used -= sale.quantity
            supplier_inventory.quantity_remaining += sale.quantity
        
        # 🆕 TENANT FILTERED
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == sale.variety_id,
            ClothVariety.tenant_id == tenant.id  # 🆕 TENANT FILTER
        ).first()
        
        if variety:
            variety.current_stock += sale.quantity
            
            inventory_movement = InventoryMovement(
                tenant_id=tenant.id,  # 🆕 SET TENANT
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


@router.get("/price-options/{variety_id}")
def get_price_options(
    variety_id: int,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    db: Session = Depends(get_db)
):
    """Get available price options for a variety (tenant-isolated)"""
    
    # 🆕 TENANT FILTERED
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variety not found in your business"
        )
    
    # 🆕 TENANT FILTERED
    price_options = db.query(SupplierInventory).filter(
        SupplierInventory.variety_id == variety_id,
        SupplierInventory.quantity_remaining > 0,
        SupplierInventory.tenant_id == tenant.id  # 🆕 TENANT FILTER
    ).order_by(SupplierInventory.supply_date.desc()).all()
    
    return [
        {
            "id": inv.id,
            "supplier_name": inv.supplier_name,
            "price_per_item": float(inv.price_per_item),
            "quantity_remaining": float(inv.quantity_remaining),
            "supply_date": inv.supply_date.isoformat(),
            "variety_id": inv.variety_id
        }
        for inv in price_options
    ]
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from decimal import Decimal
from database import get_db
from models import SupplierInventory, SupplierReturn, Sale
from schemas import DailyReport, DailySupplierSummary, DailySalesSummary

from routes.auth_routes import get_current_tenant
from auth_models import Tenant, User
from rbac import require_permission, Permission


router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/daily/{report_date}", response_model=DailyReport)
def get_daily_report(
    report_date: date,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 NEW
    user: User = Depends(require_permission(Permission.VIEW_REPORTS)),  # 🆕 RBAC
    db: Session = Depends(get_db)
):
    """Get complete daily report including supplier and sales data"""
    
    # Supplier Summary
    supply_result = db.query(
        func.sum(SupplierInventory.total_amount).label('total'),
        func.count(SupplierInventory.id).label('count')
    ).filter(SupplierInventory.supply_date == report_date, SupplierInventory.tenant_id == tenant.id ).first()
    
    total_supply = supply_result.total if supply_result.total else Decimal('0.00')
    supply_count = supply_result.count if supply_result.count else 0
    
    return_result = db.query(
        func.sum(SupplierReturn.total_amount).label('total'),
        func.count(SupplierReturn.id).label('count')
    ).filter(SupplierReturn.return_date == report_date, SupplierReturn.tenant_id == tenant.id).first()
    
    total_returns = return_result.total if return_result.total else Decimal('0.00')
    return_count = return_result.count if return_result.count else 0
    
    net_amount = total_supply - total_returns
    
    supplier_summary = DailySupplierSummary(
        date=report_date,
        total_supply=total_supply,
        total_returns=total_returns,
        net_amount=net_amount,
        supply_count=supply_count,
        return_count=return_count
    )
    
    # Sales Summary
    sales_result = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('total_sales'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity).label('total_quantity'),
        func.count(Sale.id).label('sales_count')
    ).filter(Sale.sale_date == report_date, Sale.tenant_id == tenant.id ).first()
    
    total_sales = sales_result.total_sales if sales_result.total_sales else Decimal('0.00')
    total_profit = sales_result.total_profit if sales_result.total_profit else Decimal('0.00')
    total_quantity = sales_result.total_quantity if sales_result.total_quantity else 0
    sales_count = sales_result.sales_count if sales_result.sales_count else 0
    
    sales_summary = DailySalesSummary(
        date=report_date,
        total_sales_amount=total_sales,
        total_profit=total_profit,
        total_quantity_sold=total_quantity,
        sales_count=sales_count
    )
    
    return DailyReport(
        date=report_date,
        supplier_summary=supplier_summary,
        sales_summary=sales_summary,
        net_inventory_value=net_amount
    )

@router.get("/profit/{report_date}")
def get_profit_report(
        report_date: date, 
        tenant: Tenant = Depends(get_current_tenant),
        user: User = Depends(require_permission(Permission.VIEW_REPORTS)),  # 🆕 RBAC
        db: Session = Depends(get_db)):
    """Get detailed profit breakdown for a specific date"""
    
    # Get profit by variety
    profit_by_variety = db.query(
        Sale.variety_id,
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity).label('total_quantity')
    ).filter(Sale.sale_date == report_date, Sale.tenant_id == tenant.id).group_by(Sale.variety_id).all()
    
    # Get profit by salesperson
    profit_by_salesperson = db.query(
        Sale.salesperson_name,
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity).label('total_quantity')
    ).filter(Sale.sale_date == report_date, Sale.tenant_id ==tenant.id ).group_by(Sale.salesperson_name).all()
    
    # Calculate total profit
    total_profit_result = db.query(
        func.sum(Sale.profit).label('total_profit')
    ).filter(Sale.sale_date == report_date, Sale.tenant_id ==tenant.id).first()
    
    total_profit = total_profit_result.total_profit if total_profit_result.total_profit else Decimal('0.00')
    
    return {
        "date": report_date,
        "total_profit": total_profit,
        "profit_by_variety": [
            {
                "variety_id": item.variety_id,
                "total_profit": item.total_profit,
                "total_quantity": item.total_quantity
            }
            for item in profit_by_variety
        ],
        "profit_by_salesperson": [
            {
                "salesperson_name": item.salesperson_name,
                "total_profit": item.total_profit,
                "total_quantity": item.total_quantity
            }
            for item in profit_by_salesperson
        ]
    }

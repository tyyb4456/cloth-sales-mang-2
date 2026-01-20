# app/routes/whatsapp_routes.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Sale, CustomerLoan, ClothVariety
from routes.auth_routes import get_current_user, get_current_tenant
from auth_models import User, Tenant
from whatsapp_service import whatsapp_service
from datetime import date, timedelta
from sqlalchemy import func

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Integration"])


@router.post("/send-invoice/{sale_id}")
async def send_invoice_whatsapp(
    sale_id: int,
    customer_phone: str,
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Send invoice via WhatsApp"""
    
    # Get sale
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.tenant_id == tenant.id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Get variety
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == sale.variety_id
    ).first()
    
    # Format invoice
    invoice_data = {
        'invoice_number': f"{tenant.id}-{sale.id}",
        'date': sale.sale_date.strftime("%d %b %Y"),
        'customer_name': sale.customer_name or "Customer",
        'items': [
            {
                'name': variety.name,
                'quantity': float(sale.quantity),
                'price': float(sale.selling_price)
            }
        ],
        'subtotal': float(sale.selling_price * sale.quantity),
        'discount': 0,
        'total': float(sale.selling_price * sale.quantity),
        'business_name': tenant.business_name,
        'business_phone': tenant.phone
    }
    
    # Send WhatsApp
    success = await whatsapp_service.send_invoice(customer_phone, invoice_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")
    
    return {"success": True, "message": "Invoice sent via WhatsApp"}


@router.post("/payment-reminder/{loan_id}")
async def send_payment_reminder(
    loan_id: int,
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Send payment reminder for loan"""
    
    loan = db.query(CustomerLoan).filter(
        CustomerLoan.id == loan_id,
        CustomerLoan.tenant_id == tenant.id
    ).first()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if not loan.customer_phone:
        raise HTTPException(status_code=400, detail="Customer phone not available")
    
    success = await whatsapp_service.send_payment_reminder(
        to=loan.customer_phone,
        customer_name=loan.customer_name,
        amount_due=float(loan.amount_remaining),
        due_date=loan.due_date.strftime("%d %b %Y") if loan.due_date else "ASAP"
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reminder")
    
    return {"success": True, "message": "Reminder sent"}


@router.post("/daily-summary")
async def send_daily_summary(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Send daily summary (can be triggered manually or via cron)"""
    
    today = date.today()
    
    # Calculate today's stats
    sales_result = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('total_sales'),
        func.count(Sale.id).label('transaction_count'),
        func.sum(Sale.profit).label('profit')
    ).filter(
        Sale.sale_date == today,
        Sale.tenant_id == tenant.id
    ).first()
    
    pending_loans = db.query(
        func.sum(CustomerLoan.amount_remaining)
    ).filter(
        CustomerLoan.tenant_id == tenant.id,
        CustomerLoan.loan_status != 'paid'
    ).scalar() or 0
    
    # Get top product
    top_product = db.query(
        ClothVariety.name,
        func.sum(Sale.quantity).label('total_qty')
    ).join(Sale).filter(
        Sale.sale_date == today,
        Sale.tenant_id == tenant.id
    ).group_by(ClothVariety.name).order_by(
        func.sum(Sale.quantity).desc()
    ).first()
    
    summary_data = {
        'date': today.strftime("%d %b %Y"),
        'total_sales': float(sales_result.total_sales or 0),
        'transaction_count': sales_result.transaction_count or 0,
        'profit': float(sales_result.profit or 0),
        'pending_loans': float(pending_loans),
        'top_product': top_product.name if top_product else "N/A"
    }
    
    # Send to owner
    owner_phone = tenant.phone
    if not owner_phone:
        raise HTTPException(status_code=400, detail="Owner phone not set")
    
    success = await whatsapp_service.send_daily_summary(owner_phone, summary_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send summary")
    
    return {"success": True, "message": "Daily summary sent"}


@router.get("/test")
async def test_whatsapp(
    phone: str,
    user: User = Depends(get_current_user)
):
    """Test WhatsApp connection"""
    
    success = await whatsapp_service.send_message(
        to=phone,
        message="🎉 Your WhatsApp integration is working! This is a test message from your Cloth Shop Management System."
    )
    
    return {
        "success": success,
        "message": "Test message sent" if success else "Failed to send test message"
    }
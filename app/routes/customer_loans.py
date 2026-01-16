# app/routes/customer_loans.py
# Customer Loan Management API Routes - FIXED with Multi-Tenancy

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import CustomerLoan, LoanPayment, Sale, LoanStatus, PaymentStatus
from schemas import (
    CustomerLoanCreate, CustomerLoanResponse, 
    LoanPaymentCreate, LoanPaymentResponse,
    CustomerLoanSummary
)
from routes.auth_routes import get_current_tenant
from auth_models import Tenant

router = APIRouter(prefix="/loans", tags=["Customer Loans"])


@router.post("/", response_model=CustomerLoanResponse)
def create_customer_loan(
    loan: CustomerLoanCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new customer loan record (tenant-isolated)"""
    
    # 🔒 Verify sale exists FOR THIS TENANT
    sale = db.query(Sale).filter(
        Sale.id == loan.sale_id,
        Sale.tenant_id == tenant.id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sale not found in your business"
        )
    
    # 🔒 Check if loan already exists FOR THIS TENANT
    existing_loan = db.query(CustomerLoan).filter(
        CustomerLoan.sale_id == loan.sale_id,
        CustomerLoan.tenant_id == tenant.id
    ).first()
    
    if existing_loan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loan already exists for this sale"
        )
    
    # Create loan
    db_loan = CustomerLoan(
        tenant_id=tenant.id,  # 🔒 SET TENANT
        customer_name=loan.customer_name,
        customer_phone=loan.customer_phone,
        sale_id=loan.sale_id,
        total_loan_amount=loan.total_loan_amount,
        amount_paid=Decimal('0.00'),
        amount_remaining=loan.total_loan_amount,
        loan_status=LoanStatus.PENDING,
        loan_date=sale.sale_date,
        due_date=loan.due_date,
        notes=loan.notes
    )
    
    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)
    
    return db_loan


@router.get("/", response_model=List[CustomerLoanResponse])
def get_all_loans(
    status: Optional[str] = None,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Get all customer loans (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    query = db.query(CustomerLoan).filter(CustomerLoan.tenant_id == tenant.id)
    
    if status:
        if status not in ['pending', 'partial', 'paid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be 'pending', 'partial', or 'paid'"
            )
        query = query.filter(CustomerLoan.loan_status == status)
    
    loans = query.order_by(CustomerLoan.loan_date.desc()).all()
    return loans


@router.get("/customer/{customer_name}", response_model=List[CustomerLoanResponse])
def get_loans_by_customer(
    customer_name: str,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Get all loans for a specific customer (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    loans = db.query(CustomerLoan).filter(
        CustomerLoan.tenant_id == tenant.id,
        func.lower(CustomerLoan.customer_name).like(f"%{customer_name.lower()}%")
    ).order_by(CustomerLoan.loan_date.desc()).all()
    
    if not loans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No loans found for customer '{customer_name}'"
        )
    
    return loans


@router.get("/search/{search_term}", response_model=List[CustomerLoanResponse])
def search_loans(
    search_term: str,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Search loans by customer name or phone (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    loans = db.query(CustomerLoan).filter(
        CustomerLoan.tenant_id == tenant.id,
        or_(
            func.lower(CustomerLoan.customer_name).like(f"%{search_term.lower()}%"),
            CustomerLoan.customer_phone.like(f"%{search_term}%")
        )
    ).order_by(CustomerLoan.loan_date.desc()).all()
    
    return loans


@router.get("/{loan_id}", response_model=CustomerLoanResponse)
def get_loan_details(
    loan_id: int,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific loan (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    loan = db.query(CustomerLoan).filter(
        CustomerLoan.id == loan_id,
        CustomerLoan.tenant_id == tenant.id
    ).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan not found in your business"
        )
    
    return loan


@router.post("/{loan_id}/payments", response_model=CustomerLoanResponse)
def record_payment(
    loan_id: int,
    payment: LoanPaymentCreate,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Record a payment for a loan (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    loan = db.query(CustomerLoan).filter(
        CustomerLoan.id == loan_id,
        CustomerLoan.tenant_id == tenant.id
    ).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan not found in your business"
        )
    
    if loan.loan_status == LoanStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This loan has already been fully paid"
        )
    
    # Validate payment amount
    if payment.payment_amount > loan.amount_remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (₹{payment.payment_amount}) exceeds remaining balance (₹{loan.amount_remaining})"
        )
    
    # Create payment record
    db_payment = LoanPayment(
        loan_id=loan_id,
        payment_amount=payment.payment_amount,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        notes=payment.notes
    )
    
    db.add(db_payment)
    
    # Update loan
    loan.amount_paid += payment.payment_amount
    loan.amount_remaining -= payment.payment_amount
    
    # Update loan status
    if loan.amount_remaining == 0:
        loan.loan_status = LoanStatus.PAID
    elif loan.amount_paid > 0:
        loan.loan_status = LoanStatus.PARTIAL
    
    db.commit()
    db.refresh(loan)
    
    return loan


@router.get("/{loan_id}/payments", response_model=List[LoanPaymentResponse])
def get_loan_payments(
    loan_id: int,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Get all payments for a specific loan (tenant-isolated)"""
    
    # 🔒 Verify loan belongs to tenant
    loan = db.query(CustomerLoan).filter(
        CustomerLoan.id == loan_id,
        CustomerLoan.tenant_id == tenant.id
    ).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan not found in your business"
        )
    
    payments = db.query(LoanPayment).filter(
        LoanPayment.loan_id == loan_id
    ).order_by(LoanPayment.payment_date.desc()).all()
    
    return payments


@router.get("/summary/customers", response_model=List[CustomerLoanSummary])
def get_customer_loan_summary(
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Get summary of loans for each customer (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    result = db.query(
        CustomerLoan.customer_name,
        func.count(CustomerLoan.id).label('total_loans'),
        func.sum(CustomerLoan.total_loan_amount).label('total_loan_amount'),
        func.sum(CustomerLoan.amount_paid).label('total_paid'),
        func.sum(CustomerLoan.amount_remaining).label('total_remaining'),
        func.min(CustomerLoan.loan_date).label('oldest_loan_date'),
        func.max(CustomerLoan.loan_date).label('newest_loan_date')
    ).filter(
        CustomerLoan.tenant_id == tenant.id  # 🔒 TENANT FILTER
    ).group_by(CustomerLoan.customer_name).all()
    
    summaries = []
    for row in result:
        summaries.append(CustomerLoanSummary(
            customer_name=row.customer_name,
            total_loans=row.total_loans,
            total_loan_amount=row.total_loan_amount or Decimal('0.00'),
            total_paid=row.total_paid or Decimal('0.00'),
            total_remaining=row.total_remaining or Decimal('0.00'),
            oldest_loan_date=row.oldest_loan_date,
            newest_loan_date=row.newest_loan_date
        ))
    
    return summaries


@router.get("/summary/status")
def get_loan_status_summary(
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Get overall loan statistics (tenant-isolated)"""
    
    # 🔒 Total loans by status FOR THIS TENANT
    status_counts = db.query(
        CustomerLoan.loan_status,
        func.count(CustomerLoan.id).label('count'),
        func.sum(CustomerLoan.total_loan_amount).label('total_amount'),
        func.sum(CustomerLoan.amount_remaining).label('total_remaining')
    ).filter(
        CustomerLoan.tenant_id == tenant.id  # 🔒 TENANT FILTER
    ).group_by(CustomerLoan.loan_status).all()
    
    # 🔒 Overall totals FOR THIS TENANT
    totals = db.query(
        func.count(CustomerLoan.id).label('total_loans'),
        func.sum(CustomerLoan.total_loan_amount).label('total_loan_amount'),
        func.sum(CustomerLoan.amount_paid).label('total_paid'),
        func.sum(CustomerLoan.amount_remaining).label('total_outstanding')
    ).filter(
        CustomerLoan.tenant_id == tenant.id  # 🔒 TENANT FILTER
    ).first()
    
    return {
        "by_status": [
            {
                "status": row.loan_status,
                "count": row.count,
                "total_amount": float(row.total_amount or 0),
                "total_remaining": float(row.total_remaining or 0)
            }
            for row in status_counts
        ],
        "overall": {
            "total_loans": totals.total_loans or 0,
            "total_loan_amount": float(totals.total_loan_amount or 0),
            "total_paid": float(totals.total_paid or 0),
            "total_outstanding": float(totals.total_outstanding or 0)
        }
    }


@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan(
    loan_id: int,
    tenant: Tenant = Depends(get_current_tenant),  # 🔒 ADD TENANT
    db: Session = Depends(get_db)
):
    """Delete a loan record (tenant-isolated)"""
    
    # 🔒 Filter by tenant
    loan = db.query(CustomerLoan).filter(
        CustomerLoan.id == loan_id,
        CustomerLoan.tenant_id == tenant.id
    ).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan not found in your business"
        )
    
    # Also update the associated sale
    sale = db.query(Sale).filter(
        Sale.id == loan.sale_id,
        Sale.tenant_id == tenant.id  # 🔒 TENANT FILTER
    ).first()
    
    if sale:
        sale.payment_status = PaymentStatus.PAID
        sale.customer_name = None
    
    db.delete(loan)
    db.commit()
    
    return None
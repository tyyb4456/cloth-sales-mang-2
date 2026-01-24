# app/schemas.py - UPDATED WITH CUSTOMER LOAN SCHEMAS

from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict
from models import MeasurementUnit, StockType, PaymentStatus, LoanStatus

# Cloth Variety Schemas
class ClothVarietyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    measurement_unit: MeasurementUnit = MeasurementUnit.PIECES
    standard_length: Optional[Decimal] = None
    default_cost_price: Optional[Decimal] = None
    min_stock_level: Optional[Decimal] = None

class ClothVarietyCreate(ClothVarietyBase):
    pass

class ClothVarietyResponse(ClothVarietyBase):
    id: int
    current_stock: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True

class ClothVarietyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    measurement_unit: Optional[MeasurementUnit] = None
    standard_length: Optional[Decimal] = None
    default_cost_price: Optional[Decimal] = None
    min_stock_level: Optional[Decimal] = None


# Supplier Inventory Schemas
class SupplierInventoryBase(BaseModel):
    supplier_name: str = Field(..., min_length=1, max_length=100)
    variety_id: int
    quantity: float = Field(..., gt=0)
    price_per_item: Decimal = Field(..., gt=0, decimal_places=2)
    supply_date: date

class SupplierInventoryCreate(SupplierInventoryBase):
    pass

class SupplierInventoryResponse(SupplierInventoryBase):
    id: int
    total_amount: Decimal
    quantity_used: Decimal
    quantity_remaining: Decimal
    quantity_returned: Decimal
    created_at: datetime
    variety: ClothVarietyResponse
    
    class Config:
        from_attributes = True


# Supplier Return Schemas
class SupplierReturnBase(BaseModel):
    supplier_name: str = Field(..., min_length=1, max_length=100)
    variety_id: int
    quantity: float = Field(..., gt=0)
    price_per_item: Decimal = Field(..., gt=0, decimal_places=2)
    return_date: date
    reason: Optional[str] = None

class SupplierReturnCreate(SupplierReturnBase):
    pass

class SupplierReturnResponse(SupplierReturnBase):
    id: int
    total_amount: Decimal
    created_at: datetime
    variety: ClothVarietyResponse
    
    class Config:
        from_attributes = True


# Customer Loan Schemas
class LoanPaymentCreate(BaseModel):
    payment_amount: Decimal = Field(..., gt=0)
    payment_date: date = Field(default_factory=date.today)
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class LoanPaymentResponse(BaseModel):
    id: int
    loan_id: int
    payment_amount: Decimal
    payment_date: date
    payment_method: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CustomerLoanCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_phone: Optional[str] = None
    sale_id: int
    total_loan_amount: Decimal = Field(..., gt=0)
    due_date: Optional[date] = None
    notes: Optional[str] = None

class CustomerLoanResponse(BaseModel):
    id: int
    customer_name: str
    customer_phone: Optional[str]
    sale_id: int
    total_loan_amount: Decimal
    amount_paid: Decimal
    amount_remaining: Decimal
    loan_status: LoanStatus
    loan_date: date
    due_date: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    payments: List[LoanPaymentResponse] = []
    
    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    salesperson_name: str = Field(..., min_length=1, max_length=100)
    variety_id: Optional[int] = None
    variety_name: Optional[str] = Field(None, min_length=1, max_length=100)
    quantity: float = Field(..., gt=0)
    selling_price: Decimal = Field(..., gt=0, decimal_places=2)
    cost_price: Decimal = Field(..., gt=0, decimal_places=2)
    sale_date: date
    supplier_inventory_id: Optional[int] = None
    
    payment_status: PaymentStatus = PaymentStatus.PAID
    customer_name: Optional[str] = None
    
    @field_validator('variety_id')
    @classmethod
    def validate_variety_id(cls, v, info):
        variety_name = info.data.get('variety_name')
        if not v and not variety_name:
            raise ValueError('Either variety_id or variety_name must be provided')
        return v
    
    @field_validator('selling_price')
    @classmethod
    def validate_selling_price(cls, v, info):
        cost_price = info.data.get('cost_price')
        if cost_price and v < cost_price:
            raise ValueError('Selling price should not be less than cost price')
        return v
    
    @field_validator('customer_name')
    @classmethod
    def validate_customer_name(cls, v, info):
        payment_status = info.data.get('payment_status')
        if payment_status == PaymentStatus.LOAN:
            if not v or not v.strip():
                raise ValueError('Customer name is required for loan sales')
        return v

class SaleCreate(SaleBase):
    pass

class SaleResponse(SaleBase):
    id: int
    profit: Decimal
    sale_timestamp: datetime
    supplier_inventory_id: Optional[int] = None
    variety: 'ClothVarietyResponse'  # Forward reference
    customer_loan: Optional['CustomerLoanResponse'] = None
    
    class Config:
        from_attributes = True


# Summary Schemas
class DailySupplierSummary(BaseModel):
    date: date
    total_supply: Decimal
    total_returns: Decimal
    net_amount: Decimal
    supply_count: int
    return_count: int

class DailySalesSummary(BaseModel):
    date: date
    total_sales_amount: Decimal
    total_profit: Decimal
    total_quantity_sold: Decimal
    sales_count: int

class DailyReport(BaseModel):
    date: date
    supplier_summary: DailySupplierSummary
    sales_summary: DailySalesSummary
    net_inventory_value: Decimal

class SalespersonSummary(BaseModel):
    salesperson_name: str
    date: date
    total_sales: Decimal
    total_profit: Decimal
    total_items_sold: int
    sales_count: int

# Expense Schemas
class ExpenseBase(BaseModel):
    category: str
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    expense_date: date
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExpenseSummary(BaseModel):
    total_expenses: Decimal
    category_breakdown: Dict[str, Decimal]
    expense_count: int
    
class FinancialReport(BaseModel):
    date: date
    total_revenue: Decimal
    total_profit: Decimal
    total_expenses: Decimal
    net_income: Decimal
    profit_margin: float
    expense_ratio: float


# Inventory Schemas
class InventoryMovementResponse(BaseModel):
    id: int
    variety_id: int
    movement_type: str
    quantity: Decimal
    reference_id: Optional[int]
    reference_type: Optional[str]
    notes: Optional[str]
    movement_date: date
    stock_after: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


class InventoryStatusResponse(BaseModel):
    variety_id: int
    variety_name: str
    current_stock: Decimal
    min_stock_level: Optional[Decimal]
    is_low_stock: bool
    total_supplied: Decimal
    total_sold: Decimal
    total_returned: Decimal
    measurement_unit: str

# Loan Summary Schemas
class CustomerLoanSummary(BaseModel):
    customer_name: str
    total_loans: int
    total_loan_amount: Decimal
    total_paid: Decimal
    total_remaining: Decimal
    oldest_loan_date: Optional[date]
    newest_loan_date: Optional[date]

# Add these schemas to your app/schemas.py file

from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List


# Shopkeeper Stock Schemas
class ShopkeeperStockBase(BaseModel):
    shopkeeper_name: str = Field(..., min_length=1, max_length=100)
    shopkeeper_phone: Optional[str] = None
    variety_id: int
    quantity_issued: float = Field(..., gt=0)
    issue_date: date
    notes: Optional[str] = None
    deducted_from_inventory: bool # NEW: Default True for backward compatibility


class ShopkeeperStockCreate(ShopkeeperStockBase):
    pass


class ShopkeeperSalesCreate(BaseModel):
    quantity_sold: float = Field(..., gt=0)
    sale_date: date
    notes: Optional[str] = None


class ShopkeeperSalesResponse(BaseModel):
    id: int
    shopkeeper_stock_id: int
    quantity_sold: Decimal
    sale_date: date
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ShopkeeperReturnCreate(BaseModel):
    quantity_returned: float = Field(..., gt=0)
    return_date: date
    notes: Optional[str] = None


class ShopkeeperReturnResponse(BaseModel):
    id: int
    shopkeeper_stock_id: int
    quantity_returned: Decimal
    return_date: date
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ShopkeeperStockResponse(ShopkeeperStockBase):
    id: int
    quantity_sold: Decimal
    quantity_returned: Decimal
    quantity_remaining: Decimal
    supplier_inventory_id: Optional[int] = None  # ADD THIS
    created_at: datetime
    updated_at: datetime
    variety: ClothVarietyResponse
    sales_transactions: List[ShopkeeperSalesResponse] = []
    return_transactions: List[ShopkeeperReturnResponse] = []
    
    class Config:
        from_attributes = True

class ShopkeeperStockSummary(BaseModel):
    shopkeeper_name: str
    total_records: int
    total_issued: Decimal
    total_sold: Decimal
    total_returned: Decimal
    total_remaining: Decimal
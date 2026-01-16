# app/models.py - UPDATED WITH MULTI-TENANCY

from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Date, Text, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

# Import Tenant from auth_models for relationships
from auth_models import Tenant  # 🆕 NEW IMPORT


class MeasurementUnit(str, enum.Enum):
    PIECES = "pieces"
    METERS = "meters"
    YARDS = "yards"


class StockType(str, enum.Enum):
    OLD_STOCK = "old_stock"
    NEW_STOCK = "new_stock"


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    LOAN = "loan"


class LoanStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"


class ClothVariety(Base):
    __tablename__ = "cloth_varieties"

    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    measurement_unit = Column(
        SQLEnum(MeasurementUnit, values_callable=lambda enum: [e.value for e in enum], native_enum=False),
        nullable=False,
        default=MeasurementUnit.PIECES
    )
    
    standard_length = Column(DECIMAL(10, 2), nullable=True) 
    description = Column(Text)
    default_cost_price = Column(DECIMAL(10, 2), nullable=True)
    current_stock = Column(DECIMAL(10, 2), nullable=False, default=0)
    min_stock_level = Column(DECIMAL(10, 2), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 🆕 Relationships
    tenant = relationship("Tenant")
    supplier_inventories = relationship("SupplierInventory", back_populates="variety", cascade="all, delete-orphan", passive_deletes=True)
    supplier_returns = relationship("SupplierReturn", back_populates="variety", cascade="all, delete-orphan", passive_deletes=True)
    sales = relationship("Sale", back_populates="variety", cascade="all, delete-orphan", passive_deletes=True)


class SupplierInventory(Base):
    __tablename__ = "supplier_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    supplier_name = Column(String(100), nullable=False, index=True)
    variety_id = Column(Integer, ForeignKey("cloth_varieties.id", ondelete="CASCADE"), nullable=False)

    quantity = Column(DECIMAL(10, 2), nullable=False) 
    price_per_item = Column(DECIMAL(10, 2), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    supply_date = Column(Date, nullable=False, index=True)
    quantity_used = Column(DECIMAL(10, 2), nullable=False, default=0)
    quantity_remaining = Column(DECIMAL(10, 2), nullable=False, default=0)
    quantity_returned = Column(DECIMAL(10, 2), nullable=False, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    
    # 🆕 Relationships
    tenant = relationship("Tenant")
    variety = relationship("ClothVariety", back_populates="supplier_inventories")


class SupplierReturn(Base):
    __tablename__ = "supplier_returns"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    supplier_name = Column(String(100), nullable=False, index=True)
    variety_id = Column(Integer, ForeignKey("cloth_varieties.id", ondelete="CASCADE"), nullable=False)

    quantity = Column(DECIMAL(10, 2), nullable=False) 
    price_per_item = Column(DECIMAL(10, 2), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    return_date = Column(Date, nullable=False, index=True)
    reason = Column(Text)
    supplier_inventory_id = Column(Integer, ForeignKey("supplier_inventory.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    # 🆕 Relationships
    tenant = relationship("Tenant")
    variety = relationship("ClothVariety", back_populates="supplier_returns")


class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    salesperson_name = Column(String(100), nullable=False, index=True)
    variety_id = Column(Integer, ForeignKey("cloth_varieties.id", ondelete="CASCADE"), nullable=False)

    quantity = Column(DECIMAL(10, 2), nullable=False)
    selling_price = Column(DECIMAL(10, 2), nullable=False)
    cost_price = Column(DECIMAL(10, 2), nullable=False)
    profit = Column(DECIMAL(10, 2), nullable=False)
    sale_date = Column(Date, nullable=False, index=True)
    sale_timestamp = Column(DateTime, server_default=func.now())
    
    stock_type = Column(
        SQLEnum(StockType, values_callable=lambda enum: [e.value for e in enum], native_enum=False),
        nullable=False,
        default=StockType.OLD_STOCK
    )
    
    supplier_inventory_id = Column(Integer, ForeignKey("supplier_inventory.id", ondelete="SET NULL"), nullable=True)
    
    payment_status = Column(
        SQLEnum(PaymentStatus, values_callable=lambda enum: [e.value for e in enum], native_enum=False),
        nullable=False,
        default=PaymentStatus.PAID
    )
    
    customer_name = Column(String(100), nullable=True, index=True)
    
    # 🆕 Relationships
    tenant = relationship("Tenant")
    variety = relationship("ClothVariety", back_populates="sales")
    customer_loan = relationship("CustomerLoan", back_populates="sale", uselist=False)


class CustomerLoan(Base):
    __tablename__ = "customer_loans"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    customer_name = Column(String(100), nullable=False, index=True)
    customer_phone = Column(String(20), nullable=True)
    
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    total_loan_amount = Column(DECIMAL(10, 2), nullable=False)
    amount_paid = Column(DECIMAL(10, 2), nullable=False, default=0)
    amount_remaining = Column(DECIMAL(10, 2), nullable=False)
    
    loan_status = Column(
        SQLEnum(LoanStatus, values_callable=lambda enum: [e.value for e in enum], native_enum=False),
        nullable=False,
        default=LoanStatus.PENDING
    )
    
    loan_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 🆕 Relationships
    tenant = relationship("Tenant")
    sale = relationship("Sale", back_populates="customer_loan")
    payments = relationship("LoanPayment", back_populates="loan", cascade="all, delete-orphan")


class LoanPayment(Base):
    __tablename__ = "loan_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("customer_loans.id", ondelete="CASCADE"), nullable=False)
    
    payment_amount = Column(DECIMAL(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    loan = relationship("CustomerLoan", back_populates="payments")


class ExpenseCategory(str, enum.Enum):
    RENT = "rent"
    UTILITIES = "utilities"
    SALARIES = "salaries"
    MARKETING = "marketing"
    TRANSPORTATION = "transportation"
    OFFICE_SUPPLIES = "office_supplies"
    MAINTENANCE = "maintenance"
    INSURANCE = "insurance"
    TAXES = "taxes"
    OTHER = "other"


class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    category = Column(
        SQLEnum(ExpenseCategory, values_callable=lambda enum: [e.value for e in enum], native_enum=False),
        nullable=False
    )
    amount = Column(DECIMAL(10, 2), nullable=False)
    expense_date = Column(Date, nullable=False, index=True)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # 🆕 Relationship
    tenant = relationship("Tenant")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    variety_id = Column(Integer, ForeignKey("cloth_varieties.id", ondelete="CASCADE"), nullable=False)
    movement_type = Column(String(50), nullable=False)
    quantity = Column(DECIMAL(10, 2), nullable=False)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    movement_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    stock_after = Column(DECIMAL(10, 2), nullable=False)
    
    # 🆕 Relationship
    tenant = relationship("Tenant")


class ShopkeeperStock(Base):
    __tablename__ = "shopkeeper_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 🆕 MULTI-TENANT FIELD
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    shopkeeper_name = Column(String(100), nullable=False, index=True)
    shopkeeper_phone = Column(String(20), nullable=True)
    
    variety_id = Column(Integer, ForeignKey("cloth_varieties.id", ondelete="CASCADE"), nullable=False)
    
    quantity_issued = Column(DECIMAL(10, 2), nullable=False)
    quantity_sold = Column(DECIMAL(10, 2), nullable=False, default=0)
    quantity_returned = Column(DECIMAL(10, 2), nullable=False, default=0)
    quantity_remaining = Column(DECIMAL(10, 2), nullable=False)
    
    issue_date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    
    deducted_from_inventory = Column(Boolean, nullable=False, default=False)
    supplier_inventory_id = Column(Integer, ForeignKey("supplier_inventory.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 🆕 Relationships
    tenant = relationship("Tenant")
    variety = relationship("ClothVariety", backref="shopkeeper_stocks")
    sales_transactions = relationship("ShopkeeperSales", back_populates="stock_record", cascade="all, delete-orphan")
    return_transactions = relationship("ShopkeeperReturn", back_populates="stock_record", cascade="all, delete-orphan")


class ShopkeeperSales(Base):
    __tablename__ = "shopkeeper_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    shopkeeper_stock_id = Column(Integer, ForeignKey("shopkeeper_stock.id", ondelete="CASCADE"), nullable=False)
    
    quantity_sold = Column(DECIMAL(10, 2), nullable=False)
    sale_date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    stock_record = relationship("ShopkeeperStock", back_populates="sales_transactions")


class ShopkeeperReturn(Base):
    __tablename__ = "shopkeeper_returns"
    
    id = Column(Integer, primary_key=True, index=True)
    shopkeeper_stock_id = Column(Integer, ForeignKey("shopkeeper_stock.id", ondelete="CASCADE"), nullable=False)
    
    quantity_returned = Column(DECIMAL(10, 2), nullable=False)
    return_date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    stock_record = relationship("ShopkeeperStock", back_populates="return_transactions")
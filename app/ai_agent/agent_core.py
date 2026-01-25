# app/ai_agent/agent_core.py - CORRECTED & SIMPLIFIED VERSION

from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
import json

# Import your models and database
from models import (
    ClothVariety, SupplierInventory, Sale, CustomerLoan,
    Expense, InventoryMovement
)
from sqlalchemy import func


@tool
def get_business_summary(db: Session, tenant_id: int) -> Dict[str, Any]:
    """Get overall business summary including sales, inventory, and financial metrics"""
    
    # Get date ranges
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Today's sales
    today_sales = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.count(Sale.id).label('count')
    ).filter(
        Sale.sale_date == today,
        Sale.tenant_id == tenant_id
    ).first()
    
    # This week's sales
    week_sales = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
        func.sum(Sale.profit).label('profit')
    ).filter(
        Sale.sale_date >= week_ago,
        Sale.tenant_id == tenant_id
    ).first()
    
    # This month's sales
    month_sales = db.query(
        func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
        func.sum(Sale.profit).label('profit')
    ).filter(
        Sale.sale_date >= month_ago,
        Sale.tenant_id == tenant_id
    ).first()
    
    # Low stock items
    low_stock = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant_id,
        ClothVariety.min_stock_level.isnot(None),
        ClothVariety.current_stock <= ClothVariety.min_stock_level
    ).count()
    
    # Outstanding loans
    outstanding_loans = db.query(
        func.sum(CustomerLoan.amount_remaining).label('total')
    ).filter(
        CustomerLoan.tenant_id == tenant_id,
        CustomerLoan.loan_status.in_(['pending', 'partial'])
    ).scalar() or 0
    
    # Total varieties
    total_varieties = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant_id
    ).count()
    
    return {
        "today": {
            "revenue": float(today_sales.revenue or 0),
            "profit": float(today_sales.profit or 0),
            "transactions": today_sales.count or 0
        },
        "this_week": {
            "revenue": float(week_sales.revenue or 0),
            "profit": float(week_sales.profit or 0)
        },
        "this_month": {
            "revenue": float(month_sales.revenue or 0),
            "profit": float(month_sales.profit or 0)
        },
        "inventory": {
            "total_varieties": total_varieties,
            "low_stock_items": low_stock
        },
        "financials": {
            "outstanding_loans": float(outstanding_loans)
        }
    }


@tool
def get_sales_data(
    db: Session,
    tenant_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    salesperson: Optional[str] = None,
    variety_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get sales records with optional filters"""
    
    query = db.query(Sale).filter(Sale.tenant_id == tenant_id)
    
    if start_date:
        query = query.filter(Sale.sale_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(Sale.sale_date <= date.fromisoformat(end_date))
    if salesperson:
        query = query.filter(Sale.salesperson_name.ilike(f"%{salesperson}%"))
    if variety_name:
        variety = db.query(ClothVariety).filter(
            ClothVariety.name.ilike(f"%{variety_name}%"),
            ClothVariety.tenant_id == tenant_id
        ).first()
        if variety:
            query = query.filter(Sale.variety_id == variety.id)
    
    sales = query.order_by(Sale.sale_date.desc()).limit(50).all()
    
    return [
        {
            "id": s.id,
            "date": str(s.sale_date),
            "salesperson": s.salesperson_name,
            "variety": s.variety.name,
            "quantity": float(s.quantity),
            "selling_price": float(s.selling_price),
            "cost_price": float(s.cost_price),
            "profit": float(s.profit),
            "total_amount": float(s.selling_price * s.quantity)
        }
        for s in sales
    ]


@tool
def add_new_sale(
    db: Session,
    tenant_id: int,
    salesperson_name: str,
    variety_name: str,
    quantity: float,
    selling_price: float,
    cost_price: float,
    sale_date: Optional[str] = None
) -> Dict[str, Any]:
    """Record a new sale. Auto-creates variety if it doesn't exist."""
    
    # Get or create variety
    variety = db.query(ClothVariety).filter(
        ClothVariety.name.ilike(variety_name),
        ClothVariety.tenant_id == tenant_id
    ).first()
    
    if not variety:
        # Auto-create variety
        from models import MeasurementUnit
        variety = ClothVariety(
            tenant_id=tenant_id,
            name=variety_name,
            measurement_unit=MeasurementUnit.PIECES,
            default_cost_price=Decimal(str(cost_price)),
            current_stock=Decimal('0')
        )
        db.add(variety)
        db.flush()
    
    # Calculate values
    qty_decimal = Decimal(str(quantity))
    total_cost = Decimal(str(cost_price))
    total_selling = Decimal(str(selling_price))
    cost_per_unit = total_cost / qty_decimal
    selling_per_unit = total_selling / qty_decimal
    profit = total_selling - total_cost
    
    # Auto-create inventory if needed
    supplier_inv = db.query(SupplierInventory).filter(
        SupplierInventory.variety_id == variety.id,
        SupplierInventory.quantity_remaining >= qty_decimal,
        SupplierInventory.tenant_id == tenant_id
    ).first()
    
    if not supplier_inv:
        supplier_inv = SupplierInventory(
            tenant_id=tenant_id,
            supplier_name="Auto-Generated",
            variety_id=variety.id,
            quantity=qty_decimal,
            price_per_item=cost_per_unit,
            total_amount=total_cost,
            supply_date=date.fromisoformat(sale_date) if sale_date else date.today(),
            quantity_remaining=qty_decimal
        )
        db.add(supplier_inv)
        db.flush()
    
    # Create sale
    sale = Sale(
        tenant_id=tenant_id,
        salesperson_name=salesperson_name,
        variety_id=variety.id,
        quantity=qty_decimal,
        selling_price=selling_per_unit,
        cost_price=cost_per_unit,
        profit=profit,
        sale_date=date.fromisoformat(sale_date) if sale_date else date.today(),
        supplier_inventory_id=supplier_inv.id
    )
    
    # Update inventory
    supplier_inv.quantity_used += qty_decimal
    supplier_inv.quantity_remaining -= qty_decimal
    
    db.add(sale)
    db.commit()
    db.refresh(sale)
    
    return {
        "success": True,
        "sale_id": sale.id,
        "message": f"Sale recorded: {quantity} {variety_name} for PKR {selling_price}",
        "profit": float(profit)
    }


@tool
def add_new_variety(
    db: Session,
    tenant_id: int,
    name: str,
    measurement_unit: str = "pieces",
    default_cost_price: Optional[float] = None,
    min_stock_level: Optional[float] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new cloth variety"""
    
    # Check if exists
    existing = db.query(ClothVariety).filter(
        ClothVariety.name.ilike(name),
        ClothVariety.tenant_id == tenant_id
    ).first()
    
    if existing:
        return {
            "success": False,
            "message": f"Variety '{name}' already exists"
        }
    
    from models import MeasurementUnit
    unit_map = {
        "pieces": MeasurementUnit.PIECES,
        "meters": MeasurementUnit.METERS,
        "yards": MeasurementUnit.YARDS
    }
    
    variety = ClothVariety(
        tenant_id=tenant_id,
        name=name,
        measurement_unit=unit_map.get(measurement_unit.lower(), MeasurementUnit.PIECES),
        default_cost_price=Decimal(str(default_cost_price)) if default_cost_price else None,
        min_stock_level=Decimal(str(min_stock_level)) if min_stock_level else None,
        description=description,
        current_stock=Decimal('0')
    )
    
    db.add(variety)
    db.commit()
    db.refresh(variety)
    
    return {
        "success": True,
        "variety_id": variety.id,
        "message": f"Variety '{name}' created successfully"
    }


@tool
def add_inventory(
    db: Session,
    tenant_id: int,
    supplier_name: str,
    variety_name: str,
    quantity: float,
    price_per_item: float,
    supply_date: Optional[str] = None
) -> Dict[str, Any]:
    """Add new inventory from supplier"""
    
    # Find variety
    variety = db.query(ClothVariety).filter(
        ClothVariety.name.ilike(variety_name),
        ClothVariety.tenant_id == tenant_id
    ).first()
    
    if not variety:
        return {
            "success": False,
            "message": f"Variety '{variety_name}' not found. Please create it first."
        }
    
    qty_decimal = Decimal(str(quantity))
    price_decimal = Decimal(str(price_per_item))
    total = qty_decimal * price_decimal
    
    inventory = SupplierInventory(
        tenant_id=tenant_id,
        supplier_name=supplier_name,
        variety_id=variety.id,
        quantity=qty_decimal,
        price_per_item=price_decimal,
        total_amount=total,
        supply_date=date.fromisoformat(supply_date) if supply_date else date.today(),
        quantity_remaining=qty_decimal
    )
    
    # Update variety stock
    variety.current_stock += qty_decimal
    
    # Log movement
    movement = InventoryMovement(
        tenant_id=tenant_id,
        variety_id=variety.id,
        movement_type='supply',
        quantity=qty_decimal,
        reference_type='supplier_inventory',
        notes=f'Supply from {supplier_name}',
        movement_date=inventory.supply_date,
        stock_after=variety.current_stock
    )
    
    db.add(inventory)
    db.add(movement)
    db.commit()
    
    return {
        "success": True,
        "message": f"Added {quantity} {variety_name} from {supplier_name}. Total stock: {variety.current_stock}"
    }


@tool
def get_inventory_status(
    db: Session,
    tenant_id: int,
    variety_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get current inventory status for all or specific variety"""
    
    query = db.query(ClothVariety).filter(ClothVariety.tenant_id == tenant_id)
    
    if variety_name:
        query = query.filter(ClothVariety.name.ilike(f"%{variety_name}%"))
    
    varieties = query.all()
    
    result = []
    for v in varieties:
        is_low = v.min_stock_level and v.current_stock <= v.min_stock_level
        
        result.append({
            "name": v.name,
            "current_stock": float(v.current_stock),
            "min_stock_level": float(v.min_stock_level) if v.min_stock_level else None,
            "is_low_stock": is_low,
            "measurement_unit": v.measurement_unit.value
        })
    
    return result


@tool
def get_customer_loans(
    db: Session,
    tenant_id: int,
    customer_name: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get customer loan records"""
    
    query = db.query(CustomerLoan).filter(CustomerLoan.tenant_id == tenant_id)
    
    if customer_name:
        query = query.filter(CustomerLoan.customer_name.ilike(f"%{customer_name}%"))
    if status:
        query = query.filter(CustomerLoan.loan_status == status)
    
    loans = query.order_by(CustomerLoan.loan_date.desc()).limit(50).all()
    
    return [
        {
            "id": l.id,
            "customer_name": l.customer_name,
            "customer_phone": l.customer_phone,
            "total_amount": float(l.total_loan_amount),
            "amount_paid": float(l.amount_paid),
            "amount_remaining": float(l.amount_remaining),
            "status": l.loan_status,
            "loan_date": str(l.loan_date),
            "due_date": str(l.due_date) if l.due_date else None
        }
        for l in loans
    ]


@tool
def add_expense(
    db: Session,
    tenant_id: int,
    category: str,
    amount: float,
    description: Optional[str] = None,
    expense_date: Optional[str] = None
) -> Dict[str, Any]:
    """Record a business expense"""
    
    from models import ExpenseCategory
    
    # Map category
    category_map = {
        "rent": ExpenseCategory.RENT,
        "utilities": ExpenseCategory.UTILITIES,
        "salaries": ExpenseCategory.SALARIES,
        "marketing": ExpenseCategory.MARKETING,
        "transportation": ExpenseCategory.TRANSPORTATION,
        "office_supplies": ExpenseCategory.OFFICE_SUPPLIES,
        "maintenance": ExpenseCategory.MAINTENANCE,
        "insurance": ExpenseCategory.INSURANCE,
        "taxes": ExpenseCategory.TAXES,
        "other": ExpenseCategory.OTHER
    }
    
    expense = Expense(
        tenant_id=tenant_id,
        category=category_map.get(category.lower(), ExpenseCategory.OTHER),
        amount=Decimal(str(amount)),
        description=description,
        expense_date=date.fromisoformat(expense_date) if expense_date else date.today()
    )
    
    db.add(expense)
    db.commit()
    
    return {
        "success": True,
        "message": f"Expense of PKR {amount} recorded for {category}"
    }


# ==================== SYSTEM PROMPT ====================

SYSTEM_PROMPT = """You are an intelligent AI Sales Manager Assistant for a cloth shop management system.

Your role is to help business owners and salespersons manage their cloth shop efficiently through natural conversation.

AVAILABLE TOOLS:
- get_business_summary: Get overall business metrics and performance
- get_sales_data: Retrieve sales records with filters
- add_new_sale: Record a new sale transaction
- add_new_variety: Create a new cloth variety/product
- add_inventory: Add supplier inventory/stock
- get_inventory_status: Check current stock levels
- get_customer_loans: View customer credit/loans
- add_expense: Record business expenses

GUIDELINES:
1. Be conversational, friendly, and professional
2. When executing actions (adding sales, creating varieties), confirm the details clearly
3. Provide context with numbers (e.g., "Today's sales are PKR 15,000, up 20% from yesterday")
4. Be proactive - if you notice low stock or pending loans, mention them
5. Use proper Pakistani Rupee (PKR) formatting
6. For dates, use YYYY-MM-DD format when calling tools
7. When user asks vague questions, infer their intent and use appropriate tools
8. Always verify critical information before executing write operations

IMPORTANT NOTES:
- All data is automatically scoped to the user's business (no cross-tenant access)
- You have full read and write access to the business data
- Be careful with write operations - double-check amounts and quantities
- If a variety doesn't exist when adding a sale, it will be auto-created

RESPONSE STYLE:
- Use clear formatting (bullet points for lists, bold for emphasis)
- Keep responses concise but informative
- End with helpful suggestions when appropriate

Remember: You are a helpful assistant that can both answer questions AND take actions. Be proactive and helpful!
"""


# --------------- AGENT CLASS -----------------
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent



class SalesManagerAgent:
    """Complete AI Sales Manager Agent with LangGraph"""
    
    def __init__(self):
        """Initialize the agent with specified model"""
        self.model = init_chat_model("google_genai:gemini-2.5-flash")
        
        # Define all available tools
        self.tools = [
            get_business_summary,
            get_sales_data,
            add_new_sale,
            add_new_variety,
            add_inventory,
            get_inventory_status,
            get_customer_loans,
            add_expense
        ]
        
        # Create agent using LangGraph's helper
        # This automatically handles: tool binding, graph creation, and memory

        self.agent = create_agent(
            self.model,
            tools=self.tools,
            state_modifier=SYSTEM_PROMPT
        )
    
    async def chat(
        self,
        user_message: str,
        db: Session,
        user_id: int,
        tenant_id: int,
        conversation_id: str
    ) -> str:
        """
        Process user message and return AI response (async version)
        
        Args:
            user_message: The user's question or command
            db: Database session for tool operations
            user_id: Current user ID (for context)
            tenant_id: Current tenant ID (for data isolation)
            conversation_id: Unique conversation identifier (for memory)
        
        Returns:
            AI agent's response as a string
        """
        
        # CRITICAL: Inject database and tenant context into tools
        # This allows tools to access data while maintaining multi-tenant isolation
        for tool_func in self.tools:
            if hasattr(tool_func, 'func'):
                tool_func.func.__globals__['db'] = db
                tool_func.func.__globals__['tenant_id'] = tenant_id

                
        
        # Prepare input for the agent
        input_state = {
            "messages": [HumanMessage(content=user_message)]
        }
        
        # Configuration for conversation memory
        config = {
            "configurable": {
                "thread_id": conversation_id  # Enables memory across messages
            }
        }
        
        final_response = ""
        
        try:
            # Stream the agent's response (for real-time updates)
            async for chunk in self.agent.astream(input_state, config):
                # Extract the final AI message from the chunk
                if "agent" in chunk and "messages" in chunk["agent"]:
                    messages = chunk["agent"]["messages"]
                    if messages:
                        last_msg = messages[-1]
                        if hasattr(last_msg, 'content') and last_msg.content:
                            final_response = last_msg.content
                
                elif "messages" in chunk:
                    messages = chunk["messages"]
                    if messages:
                        last_msg = messages[-1]
                        if hasattr(last_msg, 'content') and last_msg.content:
                            final_response = last_msg.content
            
            return final_response if final_response else "I apologize, I couldn't generate a response. Please try again."
            
        except Exception as e:
            print(f"❌ Agent error: {str(e)}")
            return f"I encountered an error: {str(e)}. Please try rephrasing your question."
    
    def chat_sync(
        self,
        user_message: str,
        db: Session,
        user_id: int,
        tenant_id: int,
        conversation_id: str
    ) -> str:
        """
        Synchronous version of chat (for non-async FastAPI endpoints)
        
        Use this if your endpoint is not async
        """
        
        # Inject context
        for tool_func in self.tools:
            if hasattr(tool_func, 'func'):
                tool_func.func.__globals__['db'] = db
                tool_func.func.__globals__['tenant_id'] = tenant_id
        
        input_state = {
            "messages": [HumanMessage(content=user_message)]
        }
        
        config = {
            "configurable": {
                "thread_id": conversation_id
            }
        }
        
        final_response = ""
        
        try:
            # Invoke synchronously (blocks until complete)
            result = self.agent.invoke(input_state, config)
            
            # Extract the last AI message
            if "messages" in result:
                messages = result["messages"]
                if messages:
                    for msg in reversed(messages):
                        if hasattr(msg, 'content') and msg.content and not hasattr(msg, 'tool_calls'):
                            final_response = msg.content
                            break
            
            return final_response if final_response else "I apologize, I couldn't generate a response."
            
        except Exception as e:
            print(f"❌ Agent error: {str(e)}")
            return f"I encountered an error: {str(e)}. Please try rephrasing your question."


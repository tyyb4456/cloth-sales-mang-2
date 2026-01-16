# app/chatbot_engine.py

from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import json
import os

# LangChain imports
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.messages import HumanMessage, SystemMessage, AIMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("⚠️ Warning: LangChain not installed.")
    print("   Install with: pip install langchain-google-genai")


class BusinessChatbot:
    """AI-powered business assistant using LangChain"""
    
    def __init__(self, db_session=None):
        self.db = db_session
        self.llm = self._initialize_llm()
        
    def _initialize_llm(self):
        """Initialize the language model (Google Gemini)"""
        if not LANGCHAIN_AVAILABLE:
            return None
        
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("⚠️ Warning: GOOGLE_API_KEY not found in environment variables")
            return None
        
        try:
            model = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.7,
                convert_system_message_to_human=True
            )
            return model
        except Exception as e:
            print(f"Error initializing Gemini: {e}")
            return None
    
    def get_business_context(self) -> str:
        """Get current business data as context for the AI"""
        if not self.db:
            return "No database connection available."
        
        try:
            from sqlalchemy import func
            from models import Sale, SupplierInventory, ClothVariety, SupplierReturn
            
            today = date.today()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Get today's sales
            today_sales = self.db.query(
                func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
                func.sum(Sale.profit).label('profit'),
                func.count(Sale.id).label('count')
            ).filter(Sale.sale_date == today).first()
            
            # Get this week's sales
            week_sales = self.db.query(
                func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
                func.sum(Sale.profit).label('profit')
            ).filter(Sale.sale_date >= week_ago).first()
            
            # Get this month's sales
            month_sales = self.db.query(
                func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
                func.sum(Sale.profit).label('profit')
            ).filter(Sale.sale_date >= month_ago).first()
            
            # Get top products this month
            top_products = self.db.query(
                ClothVariety.name,
                func.sum(Sale.quantity).label('quantity'),
                func.sum(Sale.selling_price * Sale.quantity).label('revenue')
            ).join(Sale).filter(
                Sale.sale_date >= month_ago
            ).group_by(ClothVariety.name).order_by(
                func.sum(Sale.selling_price * Sale.quantity).desc()
            ).limit(5).all()
            
            # Get recent suppliers
            recent_suppliers = self.db.query(
                SupplierInventory.supplier_name,
                func.sum(SupplierInventory.total_amount).label('total')
            ).filter(
                SupplierInventory.supply_date >= month_ago
            ).group_by(SupplierInventory.supplier_name).all()
            
            context = f"""
CURRENT BUSINESS DATA (as of {today}):

TODAY'S PERFORMANCE:
- Revenue: ₹{float(today_sales.revenue) if today_sales.revenue else 0:,.2f}
- Profit: ₹{float(today_sales.profit) if today_sales.profit else 0:,.2f}
- Transactions: {today_sales.count if today_sales.count else 0}

THIS WEEK (Last 7 days):
- Revenue: ₹{float(week_sales.revenue) if week_sales.revenue else 0:,.2f}
- Profit: ₹{float(week_sales.profit) if week_sales.profit else 0:,.2f}

THIS MONTH (Last 30 days):
- Revenue: ₹{float(month_sales.revenue) if month_sales.revenue else 0:,.2f}
- Profit: ₹{float(month_sales.profit) if month_sales.profit else 0:,.2f}

TOP 5 PRODUCTS (This Month):
{chr(10).join([f"- {p.name}: {p.quantity} units, ₹{float(p.revenue):,.2f}" for p in top_products]) if top_products else "No data"}

SUPPLIERS (This Month):
{chr(10).join([f"- {s.supplier_name}: ₹{float(s.total):,.2f}" for s in recent_suppliers]) if recent_suppliers else "No suppliers"}
"""
            return context
            
        except Exception as e:
            return f"Error fetching business context: {str(e)}"
    
    def create_system_prompt(self) -> str:
        """Create the system prompt for the AI"""
        business_context = self.get_business_context()
        
        return f"""You are an intelligent business assistant for a cloth shop management system. 
Your job is to help the business owner understand their data, make decisions, and answer questions.

{business_context}

CAPABILITIES:
- Answer questions about sales, revenue, profit, inventory
- Provide business insights and recommendations
- Explain trends and patterns
- Suggest actions to improve business
- Compare performance across time periods

GUIDELINES:
- Be concise and direct
- Use numbers and data from the context above
- Format currency as ₹XX,XXX.XX
- If you don't have specific data, say so honestly
- Provide actionable advice when relevant
- Be conversational but professional

REMEMBER:
- Today's date is {date.today()}
- All amounts are in Indian Rupees (₹)
- The business is a cloth/fabric shop
"""
    
    async def chat(self, user_message: str, conversation_history: List[Dict] = None) -> Dict:
        """
        Process a chat message and return AI response
        """
        if not self.llm:
            return {
                "response": "AI chatbot is not configured. Please set GOOGLE_API_KEY in your .env file to enable AI features.\n\nYou can still ask simple questions and I'll try to help with basic queries!",
                "error": "no_api_key",
                "success": False
            }
        
        try:
            # Create messages
            messages = [
                SystemMessage(content=self.create_system_prompt())
            ]
            
            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-10:]:  # Last 10 messages for context
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # Add current message
            messages.append(HumanMessage(content=user_message))
            
            # Get AI response - FIX: Call invoke() method
            response = self.llm.invoke(messages)
            
            return {
                "response": response.content,
                "timestamp": datetime.now().isoformat(),
                "model": "gemini-2.0-flash-exp",
                "success": True
            }
            
        except Exception as e:
            print(f"Error in chat: {str(e)}")
            return {
                "response": f"I encountered an error while processing your request. Error: {str(e)}\n\nPlease make sure your Google API key is correctly configured.",
                "error": str(e),
                "success": False
            }
    
    def parse_query_intent(self, user_message: str) -> Dict:
        """
        Parse user intent for direct database queries
        Fallback when LLM is not available
        """
        message_lower = user_message.lower()
        
        # Sales queries
        if any(word in message_lower for word in ['sales', 'revenue', 'sold', 'earned']):
            if 'today' in message_lower:
                return {"intent": "sales_today", "period": "today"}
            elif 'yesterday' in message_lower:
                return {"intent": "sales_yesterday", "period": "yesterday"}
            elif 'week' in message_lower:
                return {"intent": "sales_week", "period": "week"}
            elif 'month' in message_lower:
                return {"intent": "sales_month", "period": "month"}
        
        # Profit queries
        if 'profit' in message_lower:
            if 'today' in message_lower:
                return {"intent": "profit_today", "period": "today"}
            elif 'month' in message_lower:
                return {"intent": "profit_month", "period": "month"}
        
        # Product queries
        if any(word in message_lower for word in ['product', 'item', 'best selling', 'top']):
            return {"intent": "top_products", "period": "month"}
        
        # Inventory queries
        if any(word in message_lower for word in ['stock', 'inventory', 'low stock']):
            return {"intent": "inventory_status"}
        
        return {"intent": "general", "message": user_message}
    
    def handle_simple_query(self, intent: Dict) -> str:
        """
        Handle simple queries without LLM (fallback)
        """
        if not self.db:
            return "Database not available. Please try again later."
        
        try:
            from sqlalchemy import func
            from models import Sale, ClothVariety
            
            today = date.today()
            
            if intent["intent"] == "sales_today":
                result = self.db.query(
                    func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
                    func.count(Sale.id).label('count')
                ).filter(Sale.sale_date == today).first()
                
                revenue = float(result.revenue) if result.revenue else 0
                count = result.count if result.count else 0
                
                return f"Today's sales: ₹{revenue:,.2f} from {count} transactions."
            
            elif intent["intent"] == "profit_today":
                result = self.db.query(
                    func.sum(Sale.profit).label('profit')
                ).filter(Sale.sale_date == today).first()
                
                profit = float(result.profit) if result.profit else 0
                return f"Today's profit: ₹{profit:,.2f}"
            
            elif intent["intent"] == "top_products":
                month_ago = today - timedelta(days=30)
                products = self.db.query(
                    ClothVariety.name,
                    func.sum(Sale.quantity).label('quantity'),
                    func.sum(Sale.selling_price * Sale.quantity).label('revenue')
                ).join(Sale).filter(
                    Sale.sale_date >= month_ago
                ).group_by(ClothVariety.name).order_by(
                    func.sum(Sale.selling_price * Sale.quantity).desc()
                ).limit(5).all()
                
                if not products:
                    return "No sales data available for the past month."
                
                response = "Top 5 products this month:\n"
                for i, p in enumerate(products, 1):
                    response += f"{i}. {p.name}: {p.quantity} units, ₹{float(p.revenue):,.2f}\n"
                
                return response
            
            else:
                return "I can help you with sales, profit, and product information. Try asking about today's sales or top products!"
                
        except Exception as e:
            return f"Error processing query: {str(e)}"


class ChatbotTools:
    """Tools that the chatbot can use to fetch specific data"""
    
    @staticmethod
    def get_sales_by_date(db, start_date: date, end_date: date = None) -> Dict:
        """Get sales data for a specific period"""
        from sqlalchemy import func
        from models import Sale
        
        if end_date is None:
            end_date = start_date
        
        result = db.query(
            func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
            func.sum(Sale.profit).label('profit'),
            func.sum(Sale.quantity).label('quantity'),
            func.count(Sale.id).label('transactions')
        ).filter(
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date
        ).first()
        
        return {
            "revenue": float(result.revenue) if result.revenue else 0,
            "profit": float(result.profit) if result.profit else 0,
            "quantity": result.quantity if result.quantity else 0,
            "transactions": result.transactions if result.transactions else 0
        }
    
    @staticmethod
    def get_top_products(db, limit: int = 5, days: int = 30) -> List[Dict]:
        """Get top performing products"""
        from sqlalchemy import func
        from models import Sale, ClothVariety
        
        start_date = date.today() - timedelta(days=days)
        
        products = db.query(
            ClothVariety.name,
            func.sum(Sale.quantity).label('quantity'),
            func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
            func.sum(Sale.profit).label('profit')
        ).join(Sale).filter(
            Sale.sale_date >= start_date
        ).group_by(ClothVariety.name).order_by(
            func.sum(Sale.selling_price * Sale.quantity).desc()
        ).limit(limit).all()
        
        return [
            {
                "name": p.name,
                "quantity": p.quantity,
                "revenue": float(p.revenue),
                "profit": float(p.profit)
            }
            for p in products
        ]
    
    @staticmethod
    def get_supplier_summary(db, days: int = 30) -> List[Dict]:
        """Get supplier summary"""
        from sqlalchemy import func
        from models import SupplierInventory
        
        start_date = date.today() - timedelta(days=days)
        
        suppliers = db.query(
            SupplierInventory.supplier_name,
            func.sum(SupplierInventory.total_amount).label('total')
        ).filter(
            SupplierInventory.supply_date >= start_date
        ).group_by(SupplierInventory.supplier_name).all()
        
        return [
            {
                "name": s.supplier_name,
                "total": float(s.total)
            }
            for s in suppliers
        ]
# app/routes/chatbot.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from database import get_db
from chatbot_engine import BusinessChatbot, ChatbotTools

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

# Request/Response models
class ChatMessage(BaseModel):
    content: str
    role: str = "user"  # user or assistant
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    model: Optional[str] = None
    success: bool = True
    error: Optional[str] = None
    suggested_queries: Optional[List[str]] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat with the AI business assistant
    """
    try:
        # Initialize chatbot
        chatbot = BusinessChatbot(db_session=db)
        
        # Convert history to dict format
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ] if request.conversation_history else []
        
        # Get AI response
        result = await chatbot.chat(request.message, history)
        
        # Add suggested queries
        suggested_queries = [
            "How much did I sell today?",
            "What's my profit this month?",
            "Show me top 5 products",
            "How's business trending?",
            "Which suppliers am I working with?"
        ]
        
        return ChatResponse(
            response=result.get("response", "I couldn't process that request."),
            timestamp=result.get("timestamp", datetime.now().isoformat()),
            model=result.get("model"),
            success=result.get("success", True),
            error=result.get("error"),
            suggested_queries=suggested_queries if not history else None
        )
        
    except Exception as e:
        return ChatResponse(
            response=f"I encountered an error: {str(e)}",
            timestamp=datetime.now().isoformat(),
            success=False,
            error=str(e)
        )


@router.get("/quick-stats")
def get_quick_stats(db: Session = Depends(get_db)):
    """
    Get quick stats for the chatbot interface
    """
    try:
        from datetime import date, timedelta
        
        today = date.today()
        
        # Today's sales
        today_sales = ChatbotTools.get_sales_by_date(db, today)
        
        # This week
        week_ago = today - timedelta(days=7)
        week_sales = ChatbotTools.get_sales_by_date(db, week_ago, today)
        
        # Top products
        top_products = ChatbotTools.get_top_products(db, limit=3, days=30)
        
        return {
            "today": {
                "revenue": today_sales["revenue"],
                "profit": today_sales["profit"],
                "transactions": today_sales["transactions"]
            },
            "this_week": {
                "revenue": week_sales["revenue"],
                "profit": week_sales["profit"]
            },
            "top_products": top_products,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggested-questions")
def get_suggested_questions():
    """
    Get list of suggested questions users can ask
    """
    return {
        "categories": {
            "Sales & Revenue": [
                "How much did I sell today?",
                "What was yesterday's revenue?",
                "Show me this week's sales",
                "How's this month compared to last month?",
                "What's my average daily revenue?"
            ],
            "Profit & Margins": [
                "What's my profit today?",
                "Show me profit margins by product",
                "Which products are most profitable?",
                "What's my total profit this month?"
            ],
            "Products": [
                "What are my top 5 selling products?",
                "Which products are slow moving?",
                "Show me product performance",
                "What should I restock?"
            ],
            "Suppliers": [
                "Who are my top suppliers?",
                "Show me supplier payments",
                "Which supplier has the best reliability?",
                "Any high return rate suppliers?"
            ],
            "Insights & Recommendations": [
                "Give me business insights",
                "What should I focus on?",
                "Any alerts I should know about?",
                "How can I improve sales?",
                "Recommend actions for today"
            ]
        },
        "quick_queries": [
            "Today's sales",
            "This month's profit",
            "Top products",
            "Business summary",
            "Revenue trend"
        ]
    }


@router.post("/simple-query")
def simple_query(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Handle simple queries without AI (fallback mode)
    Useful when API keys are not configured
    """
    try:
        chatbot = BusinessChatbot(db_session=db)
        intent = chatbot.parse_query_intent(request.message)
        response = chatbot.handle_simple_query(intent)
        
        return {
            "response": response,
            "timestamp": datetime.now().isoformat(),
            "mode": "simple",
            "success": True
        }
        
    except Exception as e:
        return {
            "response": f"Error: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "error": str(e)
        }


@router.get("/health")
def chatbot_health():
    """Check if chatbot is properly configured"""
    import os
    
    openai_configured = bool(os.getenv("OPENAI_API_KEY"))
    anthropic_configured = bool(os.getenv("ANTHROPIC_API_KEY"))
    
    try:
        from langchain.chat_models import ChatOpenAI
        langchain_available = True
    except ImportError:
        langchain_available = False
    
    return {
        "status": "healthy",
        "langchain_installed": langchain_available,
        "openai_configured": openai_configured,
        "anthropic_configured": anthropic_configured,
        "ai_enabled": openai_configured or anthropic_configured,
        "fallback_mode": not (openai_configured or anthropic_configured)
    }
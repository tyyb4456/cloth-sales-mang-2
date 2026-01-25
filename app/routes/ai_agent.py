# app/routes/ai_agent.py - AI Agent API Endpoints

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from database import get_db
from auth_models import User, Tenant
from routes.auth_routes import get_current_user, get_current_tenant
import json
import asyncio
from datetime import datetime
import uuid

# Import the AI agent
import sys
sys.path.append('..')
from ai_agent.agent_core import SalesManagerAgent

router = APIRouter(prefix="/ai-agent", tags=["AI Sales Manager"])

# Global agent instance (singleton)
agent = None

def get_agent():
    global agent
    if agent is None:
        agent = SalesManagerAgent()
    return agent


# ==================== REQUEST/RESPONSE SCHEMAS ====================

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


class ConversationHistory(BaseModel):
    conversation_id: str
    messages: list
    created_at: str
    updated_at: str


# ==================== REST API ENDPOINTS ====================

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI Sales Manager (text-based)
    
    The agent has full access to:
    - Business summary and analytics
    - Sales records and reporting
    - Inventory management
    - Customer loans
    - Expense tracking
    
    It can also execute actions like:
    - Adding new sales
    - Creating varieties
    - Adding inventory
    - Recording expenses
    """
    
    # Generate conversation ID if not provided
    conversation_id = request.conversation_id or f"{user.id}_{uuid.uuid4()}"
    
    try:
        # Get agent
        ai_agent = get_agent()
        
        # Process message
        response = await ai_agent.chat(
            user_message=request.message,
            db=db,
            user_id=user.id,
            tenant_id=tenant.id,
            conversation_id=conversation_id
        )
        
        return ChatResponse(
            response=response,
            conversation_id=conversation_id,
            timestamp=datetime.now().isoformat(),
            metadata={
                "user_id": user.id,
                "tenant_id": tenant.id,
                "business_name": tenant.business_name
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}"
        )


@router.get("/status")
async def agent_status(
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant)
):
    """Check AI agent status and capabilities"""
    
    ai_agent = get_agent()
    
    return {
        "status": "active",
        "model": "gpt-4o",
        "capabilities": [
            "Business analytics and insights",
            "Sales data retrieval and analysis",
            "Inventory management",
            "Sales recording",
            "Variety creation",
            "Customer loan tracking",
            "Expense management",
            "Natural language queries",
            "Voice interaction (via WebSocket)"
        ],
        "tools_available": len(ai_agent.tools),
        "business_context": {
            "business_name": tenant.business_name,
            "user_role": user.role,
            "subscription": tenant.subscription_plan
        }
    }


@router.post("/quick-insights")
async def get_quick_insights(
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get quick AI-generated business insights"""
    
    ai_agent = get_agent()
    
    # Ask agent for insights
    response = await ai_agent.chat(
        user_message="Give me a quick summary of my business performance today and any important alerts or recommendations.",
        db=db,
        user_id=user.id,
        tenant_id=tenant.id,
        conversation_id=f"{user.id}_insights_{datetime.now().timestamp()}"
    )
    
    return {
        "insights": response,
        "generated_at": datetime.now().isoformat()
    }


# ==================== WEBSOCKET FOR REAL-TIME VOICE ====================

class ConnectionManager:
    """Manage WebSocket connections for real-time voice chat"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[str(user_id)] = websocket
    
    def disconnect(self, user_id: int):
        if str(user_id) in self.active_connections:
            del self.active_connections[str(user_id)]
    
    async def send_message(self, user_id: int, message: dict):
        websocket = self.active_connections.get(str(user_id))
        if websocket:
            await websocket.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/voice-chat")
async def voice_chat_websocket(
    websocket: WebSocket,
    token: str,  # Pass JWT token as query param
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time voice chat with AI agent
    
    Protocol:
    1. Client connects with JWT token
    2. Client sends: {"type": "audio", "data": "base64_audio"}
    3. Server transcribes → Agent processes → TTS → Sends back
    4. Server sends: {"type": "response", "text": "...", "audio": "base64_audio"}
    
    Message Types:
    - "audio": Voice input from user
    - "text": Text input from user
    - "response": AI response (text + optional audio)
    - "status": Connection status updates
    - "error": Error messages
    """
    
    try:
        # Verify token and get user
        from auth_service import AuthService
        payload = AuthService.verify_token(token)
        user_id = int(payload.get("sub"))
        tenant_id = payload.get("tenant_id")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        # Connect
        await manager.connect(websocket, user_id)
        
        # Send connection confirmation
        await manager.send_message(user_id, {
            "type": "status",
            "message": "Connected to AI Sales Manager",
            "timestamp": datetime.now().isoformat()
        })
        
        # Get agent
        ai_agent = get_agent()
        conversation_id = f"{user_id}_voice_{uuid.uuid4()}"
        
        # Listen for messages
        while True:
            try:
                # Receive message
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "text":
                    # Text message
                    user_message = data.get("message")
                    
                    # Send processing status
                    await manager.send_message(user_id, {
                        "type": "status",
                        "message": "Processing..."
                    })
                    
                    # Get AI response
                    response = await ai_agent.chat(
                        user_message=user_message,
                        db=db,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        conversation_id=conversation_id
                    )
                    
                    # Send response
                    await manager.send_message(user_id, {
                        "type": "response",
                        "text": response,
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type == "audio":
                    # Voice input (base64 audio)
                    audio_data = data.get("data")
                    
                    # TODO: Transcribe audio using Whisper
                    # from openai import OpenAI
                    # client = OpenAI()
                    # transcript = client.audio.transcriptions.create(
                    #     model="whisper-1",
                    #     file=audio_data
                    # )
                    # user_message = transcript.text
                    
                    # For now, expect text in data
                    user_message = data.get("text", "")
                    
                    if not user_message:
                        continue
                    
                    # Send transcription
                    await manager.send_message(user_id, {
                        "type": "transcription",
                        "text": user_message
                    })
                    
                    # Get AI response
                    response = await ai_agent.chat(
                        user_message=user_message,
                        db=db,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        conversation_id=conversation_id
                    )
                    
                    # TODO: Convert to speech using TTS
                    # audio_response = client.audio.speech.create(
                    #     model="tts-1",
                    #     voice="alloy",
                    #     input=response
                    # )
                    
                    # Send response
                    await manager.send_message(user_id, {
                        "type": "response",
                        "text": response,
                        # "audio": base64_audio,  # TODO: Add TTS audio
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type == "ping":
                    # Keep-alive ping
                    await manager.send_message(user_id, {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                
            except WebSocketDisconnect:
                manager.disconnect(user_id)
                break
            except Exception as e:
                await manager.send_message(user_id, {
                    "type": "error",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                })
    
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason=str(e))


# ==================== SUGGESTED ACTIONS ====================

@router.get("/suggestions")
async def get_suggestions(
    user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get AI-powered action suggestions based on current business state"""
    
    from models import ClothVariety, CustomerLoan
    from datetime import date, timedelta
    
    suggestions = []
    
    # Check low stock
    low_stock = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant.id,
        ClothVariety.min_stock_level.isnot(None),
        ClothVariety.current_stock <= ClothVariety.min_stock_level
    ).all()
    
    if low_stock:
        suggestions.append({
            "type": "warning",
            "category": "inventory",
            "title": "Low Stock Alert",
            "message": f"{len(low_stock)} items are low on stock",
            "items": [v.name for v in low_stock],
            "action": "Add inventory for these items"
        })
    
    # Check overdue loans
    overdue_loans = db.query(CustomerLoan).filter(
        CustomerLoan.tenant_id == tenant.id,
        CustomerLoan.due_date < date.today(),
        CustomerLoan.loan_status.in_(['pending', 'partial'])
    ).all()
    
    if overdue_loans:
        total_overdue = sum(float(l.amount_remaining) for l in overdue_loans)
        suggestions.append({
            "type": "urgent",
            "category": "finance",
            "title": "Overdue Loans",
            "message": f"PKR {total_overdue:,.0f} in overdue payments from {len(overdue_loans)} customers",
            "action": "Follow up with customers"
        })
    
    # Check if no sales today
    from models import Sale
    today_sales = db.query(Sale).filter(
        Sale.tenant_id == tenant.id,
        Sale.sale_date == date.today()
    ).count()
    
    if today_sales == 0:
        suggestions.append({
            "type": "info",
            "category": "sales",
            "title": "No Sales Today",
            "message": "You haven't recorded any sales yet today",
            "action": "Record sales or check with your team"
        })
    
    return {
        "suggestions": suggestions,
        "generated_at": datetime.now().isoformat()
    }


# ==================== EXAMPLE QUERIES ====================

@router.get("/example-queries")
async def get_example_queries():
    """Get example queries users can ask the AI agent"""
    
    return {
        "categories": {
            "Business Insights": [
                "How is my business doing today?",
                "Show me this week's sales summary",
                "What are my top-selling products?",
                "Give me insights on my profit margins"
            ],
            "Sales Management": [
                "Add a sale: 10 meters of cotton fabric at PKR 500 per meter",
                "Record a sale by Ahmed for silk cloth",
                "Show me all sales from last week",
                "What did Salesperson Ali sell today?"
            ],
            "Inventory": [
                "What's my current inventory status?",
                "Which items are low on stock?",
                "Add 50 meters of denim from supplier XYZ at PKR 300 per meter",
                "Show me inventory for cotton fabrics"
            ],
            "Varieties": [
                "Create a new variety called 'Premium Silk'",
                "Add a new fabric type: Linen, measured in yards",
                "List all my cloth varieties"
            ],
            "Customer Loans": [
                "Show me all pending loans",
                "Which customers have overdue payments?",
                "Show loans for customer Ahmad"
            ],
            "Expenses": [
                "Record an expense: Rent PKR 50,000",
                "Add utility bill of PKR 5,000",
                "Show me this month's expenses"
            ],
            "Analytics": [
                "Compare this week vs last week sales",
                "What's my profit margin?",
                "Show me sales trends for the past month",
                "Which salesperson is performing best?"
            ]
        }
    }
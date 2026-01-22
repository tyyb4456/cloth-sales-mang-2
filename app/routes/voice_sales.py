# app/routes/voice_sales.py - FIXED WITH TENANT ISOLATION & RBAC

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends,status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Literal
from decimal import Decimal
from datetime import date
import os
import requests
from dotenv import load_dotenv
load_dotenv()

# Import AI models with structured output
try:
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_google_genai import ChatGoogleGenerativeAI
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from database import get_db
from models import (
    ClothVariety, Sale, SupplierInventory, InventoryMovement,
    StockType, PaymentStatus
)
from auth_models import Tenant, User
from routes.auth_routes import get_current_tenant, get_current_user
from rbac import require_permission, Permission

router = APIRouter(prefix="/sales/voice", tags=["Voice Sales"])


# ==================== PYDANTIC SCHEMAS FOR STRUCTURED OUTPUT ====================

class VoiceSaleData(BaseModel):
    """Structured output from AI for voice commands"""
    success: bool
    salesperson_name: str = Field(default="voice sale", min_length=1) 
    variety_name: str
    variety_id: int
    measurement_unit: str
    quantity: float = Field(..., gt=0)
    cost_price: Decimal = Field(..., gt=0)  # TOTAL cost
    selling_price: Decimal = Field(..., gt=0)  # TOTAL selling
    stock_type: Literal["old_stock", "new_stock"] = "old_stock"  # ✨ LITERAL - type-safe!
    payment_status: Literal["paid", "loan"] = "paid"
    customer_name: Optional[str] = None  # NEW: For loan sales
    sale_date: date = Field(default_factory=date.today)
    message: Optional[str] = None
    
    @field_validator('stock_type', mode='before')
    def normalize_stock_type(cls, v):
        """Normalize stock type - handle AI variations"""
        if not v:
            return "old_stock"
        
        v = str(v).lower().strip()
        
        # Map variations to literal values
        if v in ['new stock', 'new_stock', 'newstock', 'new', 'latest', 'fresh']:
            return 'new_stock'
        elif v in ['old stock', 'old_stock', 'oldstock', 'old', 'existing']:
            return 'old_stock'
        else:
            # Default to old_stock
            return 'old_stock'
    
    @field_validator('payment_status', mode='before')
    def normalize_payment_status(cls, v):
        """Normalize payment status - handle AI variations"""
        if not v:
            return "paid"
        
        v = str(v).lower().strip()
        
        # Map variations to literal values
        if v in ['loan', 'credit', 'udhaar', 'unpaid', 'on loan', 'on credit', 'pending']:
            return 'loan'
        else:
            return 'paid'

    
    @field_validator('customer_name')
    def validate_customer_for_loan(cls, v, info):
        if info.data.get('payment_status') == 'loan':
            if not v or not v.strip():
                raise ValueError('customer_name required for loan sales')
        return v


class VoiceValidationRequest(BaseModel):
    transcript: str


class VoiceValidationResponse(BaseModel):
    success: bool
    message: str
    sale_data: Optional[Dict] = None
    variety_name: Optional[str] = None
    measurement_unit: Optional[str] = None


# ==================== TRANSCRIPTION ENDPOINT ====================

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user)  # 🆕 RBAC - requires authentication
):
    """
    Transcribe audio using Hugging Face Whisper API
    Requires authentication
    """
    
    hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
    if not hf_token:
        raise HTTPException(
            status_code=500,
            detail="HUGGINGFACE_API_TOKEN not configured"
        )
    
    try:
        audio_bytes = await audio.read()
        
        API_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3"
        
        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "audio/m4a"
        }
        
        response = requests.post(
            API_URL,
            headers=headers,
            data=audio_bytes,
            timeout=30
        )
        
        if response.status_code == 503:
            raise HTTPException(
                status_code=503,
                detail="Model loading. Wait 20 seconds and retry."
            )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Whisper API error: {response.text}"
            )
        
        result = response.json()
        transcript = result.get("text", "").strip()
        
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="No speech detected"
            )
        
        return {
            "success": True,
            "transcript": transcript,
            "model": "whisper-large-v3"
        }
        
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=408,
            detail="Request timeout. Try shorter recording."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


# ==================== VALIDATION WITH STRUCTURED OUTPUT ====================

@router.post("/validate", response_model=VoiceValidationResponse)
async def validate_voice_command(
    request: VoiceValidationRequest,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 TENANT ISOLATION
    user: User = Depends(require_permission(Permission.ADD_SALES)),  # 🆕 RBAC
    db: Session = Depends(get_db)
):
    """
    Validate voice command using AI with structured output
    Requires ADD_SALES permission (Owner/Salesperson)
    Tenant-isolated
    """
    
    if not GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="Gemini AI not available. Install langchain-google-genai"
        )
    
    # 🆕 TENANT FILTERED - Get varieties for this tenant only
    varieties = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant.id
    ).all()
    
    if not varieties:
        raise HTTPException(
            status_code=400,
            detail="No varieties found. Please add varieties first."
        )
    
    # Build variety context
    variety_context = "Available cloth varieties:\n"
    for v in varieties:
        variety_context += f"- ID: {v.id}, Name: {v.name}, Unit: {v.measurement_unit}\n"
    
    # System prompt for structured output
     # System prompt for structured output
    system_prompt = f"""You are a sales data extraction assistant for a cloth shop.

{variety_context}

Extract sales information from voice commands.

CRITICAL FORMAT RULES:
1. salesperson_name: Extract if mentioned (e.g., "shahzad sells", "I sell"), otherwise use "Voice Sale"
2. stock_type must be EXACTLY: "old_stock" OR "new_stock" (with underscore, no spaces)
3. payment_status must be EXACTLY: "paid" OR "loan" (lowercase, no spaces)
4. Match variety name case-insensitively
5. Calculate TOTAL cost = cost_per_unit × quantity
6. Calculate TOTAL selling = selling_per_unit × quantity

SALESPERSON DETECTION:
- If user says "I sell", "sold", "we sold" → salesperson_name: "Voice Sale"
- If user says "shahzad sells", "by kashif" → extract the name
- Default: "Voice Sale"

STOCK TYPE DETECTION:
- If user says "new stock", "new inventory", "from new", "latest stock" → stock_type: "new_stock"
- Otherwise → stock_type: "old_stock"

PAYMENT DETECTION:
- If user says "loan", "credit", "udhaar", "on credit", "unpaid" → payment_status: "loan"
- If loan, MUST extract customer name (REQUIRED)
- Otherwise → payment_status: "paid"

Examples:
Input: "I sell 50 meters cotton from new stock, cost 100 per meter, selling 150"
Output: salesperson_name: "Voice Sale", stock_type: "new_stock", payment_status: "paid", quantity: 50, cost_price: 5000, selling_price: 7500

Input: "shahzad sells 20 pieces silk on loan to Ahmed, cost 200 each, selling 300"
Output: salesperson_name: "shahzad", payment_status: "loan", customer_name: "Ahmed", stock_type: "old_stock", quantity: 20, cost_price: 4000, selling_price: 6000

User command: "{request.transcript}"

IMPORTANT: 
- NEVER leave salesperson_name empty - use "Voice Sale" as default
- Return EXACT values for stock_type and payment_status as shown above (with underscores)"""


    try:
        # Initialize Gemini with structured output
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GOOGLE_API_KEY not configured"
            )
        
        # Use structured output with Pydantic
        model = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            api_key=api_key,
            temperature=0.1
        )
        
        # Create structured model
        structured_model = model.with_structured_output(VoiceSaleData)
        
        # Get structured response
        result = structured_model.invoke(system_prompt)
        
        if not result.success:
            return VoiceValidationResponse(
                success=False,
                message=result.message or "Failed to parse command"
            )
        
        # 🆕 VERIFY VARIETY EXISTS IN THIS TENANT
        variety = db.query(ClothVariety).filter(
            ClothVariety.id == result.variety_id,
            ClothVariety.tenant_id == tenant.id
        ).first()
        
        if not variety:
            return VoiceValidationResponse(
                success=False,
                message=f"Variety '{result.variety_name}' not found in your business"
            )
        
        # 🆕 CHECK STOCK AVAILABILITY FOR NEW STOCK
        if result.stock_type == "new_stock":
            if variety.current_stock < result.quantity:
                return VoiceValidationResponse(
                    success=False,
                    message=f"Insufficient stock! Available: {variety.current_stock}"
                )
        
        # Return validated data
        return VoiceValidationResponse(
            success=True,
            message="Command validated successfully",
            sale_data={
                "salesperson_name": result.salesperson_name,
                "variety_id": result.variety_id,
                "quantity": float(result.quantity),
                "cost_price": float(result.cost_price),
                "selling_price": float(result.selling_price),
                "stock_type": result.stock_type,
                "payment_status": result.payment_status,
                "customer_name": result.customer_name,
                "sale_date": result.sale_date.isoformat()
            },
            variety_name=result.variety_name,
            measurement_unit=result.measurement_unit
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )


# ==================== RECORD VOICE SALE ====================

@router.post("/record-sale")
async def record_voice_sale(
    sale_data: dict,
    tenant: Tenant = Depends(get_current_tenant),  # 🆕 TENANT ISOLATION
    user: User = Depends(require_permission(Permission.ADD_SALES)),  # 🆕 RBAC
    db: Session = Depends(get_db)
):
    """
    Record a sale from voice command
    Requires ADD_SALES permission
    Handles stock deduction, inventory tracking, profit calculation
    """
    
    # 🆕 VALIDATE VARIETY BELONGS TO TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == sale_data['variety_id'],
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variety not found in your business"
        )
    
    # Convert to Decimals
    quantity = Decimal(str(sale_data['quantity']))
    total_cost = Decimal(str(sale_data['cost_price']))
    total_selling = Decimal(str(sale_data['selling_price']))
    
    # 🆕 CALCULATE PER-UNIT PRICES (like in sales.py)
    cost_per_unit = total_cost / quantity
    selling_per_unit = total_selling / quantity
    profit_per_unit = selling_per_unit - cost_per_unit
    total_profit = profit_per_unit * quantity
    
    supplier_inventory_id = None
    
    # 🆕 HANDLE NEW STOCK - Deduct from inventory
    if sale_data['stock_type'] == 'new_stock':
        if variety.current_stock < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock! Available: {variety.current_stock}"
            )
        
        # 🆕 FIFO - Get oldest supplier inventory
        supplier_inventory = db.query(SupplierInventory).filter(
            SupplierInventory.variety_id == sale_data['variety_id'],
            SupplierInventory.quantity_remaining > 0,
            SupplierInventory.tenant_id == tenant.id  # TENANT FILTER
        ).order_by(SupplierInventory.supply_date.asc()).first()
        
        if not supplier_inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No supplier inventory available"
            )
        
        # Update inventory
        supplier_inventory.quantity_used += quantity
        supplier_inventory.quantity_remaining -= quantity
        supplier_inventory_id = supplier_inventory.id
        
        # Update variety stock
        variety.current_stock -= quantity
        
        # 🆕 LOG INVENTORY MOVEMENT
        inventory_movement = InventoryMovement(
            tenant_id=tenant.id,
            variety_id=sale_data['variety_id'],
            movement_type='sale',
            quantity=-quantity,
            reference_type='voice_sale',
            notes=f'Voice sale by {sale_data["salesperson_name"]}',
            movement_date=date.today(),
            stock_after=variety.current_stock
        )
        db.add(inventory_movement)
    
    # 🆕 CREATE SALE RECORD
    db_sale = Sale(
        tenant_id=tenant.id,  # TENANT ISOLATION
        salesperson_name=sale_data['salesperson_name'],
        variety_id=sale_data['variety_id'],
        quantity=quantity,
        selling_price=selling_per_unit,  # Per-unit price
        cost_price=cost_per_unit,  # Per-unit price
        profit=total_profit,
        sale_date=date.today(),
        stock_type=StockType(sale_data['stock_type']),
        payment_status=PaymentStatus(sale_data['payment_status']),
        customer_name=sale_data.get('customer_name'),
        supplier_inventory_id=supplier_inventory_id
    )
    
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    # Update movement reference
    if sale_data['stock_type'] == 'new_stock':
        inventory_movement.reference_id = db_sale.id
        db.commit()
    
    return {
        "success": True,
        "message": "Voice sale recorded successfully!",
        "sale_id": db_sale.id,
        "total_profit": float(total_profit),
        "stock_deducted": sale_data['stock_type'] == 'new_stock'
    }


# ==================== HEALTH CHECK ====================

@router.get("/health")
def check_voice_health():
    """Check voice features configuration"""
    hf_available = bool(os.getenv("HUGGINGFACE_API_TOKEN"))
    gemini_available = GEMINI_AVAILABLE and bool(os.getenv("GOOGLE_API_KEY"))
    
    return {
        "huggingface_whisper": hf_available,
        "gemini_structured_output": gemini_available,
        "status": "ready" if (hf_available and gemini_available) else "incomplete",
        "message": "Voice commands ready!" if (hf_available and gemini_available) else "Configure API keys"
    }


# ==================== HELPER: GET VOICE EXAMPLES ====================

@router.get("/examples")
def get_voice_examples(
    user: User = Depends(get_current_user)
):
    """Get example voice commands for the user"""
    return {
        "basic_examples": [
            "I sell 50 meters cotton, cost price per meter is 100 rupees, selling price per meter is 150 rupees",
            "shahzad sells 20 pieces silk, cost 200 each, selling 300 each",
            "Sold 30 yards linen at 250 per yard, cost was 180"
        ],
        "new_stock_examples": [
            "50 meters cotton sold from new stock, cost 100 per meter, selling 150",
            "30 pieces silk from new inventory, cost 200, selling 300"
        ],
        "loan_examples": [
            "20 meters cotton on loan to Ahmed, cost 100 per meter, selling 150",
            "50 pieces on credit to Fatima, cost 200, selling 300 each"
        ],
        "tips": [
            "Mention 'new stock' or 'new inventory' for inventory deduction",
            "Say 'loan', 'credit', or 'udhaar' followed by customer name",
            "Prices can be total or per-unit (AI will calculate)",
            "Speak naturally - AI understands variations"
        ]
    }
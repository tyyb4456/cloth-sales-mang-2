# app/routes/voice_sales.py - SMART AUTO-CREATION VERSION

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
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

from database import get_db
from models import (
    ClothVariety, Sale, SupplierInventory, InventoryMovement,
    StockType, PaymentStatus, MeasurementUnit
)
from auth_models import Tenant, User
from routes.auth_routes import get_current_tenant, get_current_user
from rbac import require_permission, Permission

router = APIRouter(prefix="/sales/voice", tags=["Voice Sales"])


# ==================== PYDANTIC SCHEMAS ====================

class VoiceSaleData(BaseModel):
    """Structured output from AI for voice commands"""
    success: bool
    variety_name: str
    measurement_unit: str
    quantity: float = Field(..., gt=0)
    cost_price: Decimal = Field(..., gt=0)
    selling_price: Decimal = Field(..., gt=0)
    payment_status: Literal["paid", "loan"] = "paid"
    customer_name: Optional[str] = None
    sale_date: date = Field(default_factory=date.today)
    message: Optional[str] = None
    
    @field_validator('payment_status', mode='before')
    def normalize_payment_status(cls, v):
        if not v:
            return "paid"
        v = str(v).lower().strip()
        if v in ['loan', 'credit', 'udhaar', 'unpaid', 'on loan', 'on credit', 'pending']:
            return 'loan'
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
    is_new_variety: Optional[bool] = None  # NEW: Flag for UI


# ==================== TRANSCRIPTION ====================

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Transcribe audio using Hugging Face Whisper API"""
    
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


# ==================== VALIDATION WITH AUTO-DETECTION ====================

@router.post("/validate", response_model=VoiceValidationResponse)
async def validate_voice_command(
    request: VoiceValidationRequest,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.ADD_SALES)),
    db: Session = Depends(get_db)
):
    """
    Validate voice command using AI
    SMART: Detects if variety exists or needs creation
    """
    
    if not GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="Gemini AI not available. Install langchain-google-genai"
        )
    
    # Get all varieties for this tenant
    varieties = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant.id
    ).all()
    
    # Build variety context for AI
    variety_context = "Available cloth varieties:\n"
    for v in varieties:
        variety_context += f"- Name: {v.name}, Unit: {v.measurement_unit}\n"
    
    if not varieties:
        variety_context += "(No varieties exist yet - will create new one)\n"
    
    system_prompt = f"""You are a sales data extraction assistant for a cloth shop.

{variety_context}

Extract sales information from voice commands.

CRITICAL RULES:
1. variety_name: EXACT name from available varieties (case-insensitive match)
2. measurement_unit: Extract from command or infer from variety
3. payment_status: "paid" OR "loan" (lowercase)
4. Calculate TOTAL cost = cost_per_unit × quantity
5. Calculate TOTAL selling = selling_per_unit × quantity

PAYMENT:
- "loan", "credit", "udhaar" → payment_status: "loan" (MUST include customer_name)
- Otherwise → payment_status: "paid"

Examples:
Input: "50 meters linen, cost 500 per meter, selling 600"
Output: variety_name: "linen", quantity: 50, cost_price: 25000, selling_price: 30000

User command: "{request.transcript}"
"""

    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GOOGLE_API_KEY not configured"
            )
        
        # Use structured output
        model = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            api_key=api_key,
            temperature=0.1
        )
        
        structured_model = model.with_structured_output(VoiceSaleData)
        result = structured_model.invoke(system_prompt)
        
        if not result.success:
            return VoiceValidationResponse(
                success=False,
                message=result.message or "Failed to parse command"
            )
        
        # SMART: Check if variety exists
        variety = db.query(ClothVariety).filter(
            ClothVariety.tenant_id == tenant.id,
            ClothVariety.name.ilike(result.variety_name)  # Case-insensitive
        ).first()
        
        is_new_variety = variety is None
        
        # If NEW variety, infer measurement unit from command or default to pieces
        if is_new_variety:
            # Try to detect unit from result or default to pieces
            measurement_unit = result.measurement_unit or "pieces"
        else:
            # Use existing variety's unit
            measurement_unit = variety.measurement_unit
        
        # SMART: Check stock only if variety exists and stock_type is new_stock
        if not is_new_variety and result.stock_type == "new_stock":
            if variety.current_stock < result.quantity:
                return VoiceValidationResponse(
                    success=False,
                    message=f"Insufficient stock! Available: {variety.current_stock}"
                )
        
        # Build success message
        if is_new_variety:
            success_msg = f"✨ New variety '{result.variety_name}' will be created automatically"
        else:
            success_msg = "Command validated successfully"
        
        return VoiceValidationResponse(
            success=True,
            message=success_msg,
            sale_data={
                "variety_name": result.variety_name,
                "quantity": float(result.quantity),
                "cost_price": float(result.cost_price),
                "selling_price": float(result.selling_price),
                "payment_status": result.payment_status,
                "customer_name": result.customer_name,
                "sale_date": result.sale_date.isoformat()
            },
            variety_name=result.variety_name,
            measurement_unit=measurement_unit,
            is_new_variety=is_new_variety
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )


# ==================== RECORD SALE (SAME AS sales.py) ====================

@router.post("/record-sale")
async def record_voice_sale(
    sale_data: dict,
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(require_permission(Permission.ADD_SALES)),
    db: Session = Depends(get_db)
):
    """
    Record voice sale with SMART AUTO-CREATION
    Uses same logic as sales.py for consistency
    """
    
    # ========== STEP 1: Handle Variety (Auto-create if needed) ==========
    variety = db.query(ClothVariety).filter(
        ClothVariety.tenant_id == tenant.id,
        ClothVariety.name.ilike(sale_data['variety_name'])  # Case-insensitive
    ).first()
    
    variety_created = False
    if not variety:
        # AUTO-CREATE VARIETY (same as sales.py)
        print(f"📦 Voice: Auto-creating variety: {sale_data['variety_name']}")
        
        quantity = Decimal(str(sale_data['quantity']))
        total_cost = Decimal(str(sale_data['cost_price']))
        cost_per_unit = total_cost / quantity
        
        variety = ClothVariety(
            tenant_id=tenant.id,
            name=sale_data['variety_name'],
            measurement_unit=MeasurementUnit.PIECES,  # Default
            description=None,
            default_cost_price=cost_per_unit,
            current_stock=Decimal('0'),
            min_stock_level=None
        )
        
        db.add(variety)
        db.flush()
        variety_created = True
        print(f"✅ Variety created with ID: {variety.id}")
    
    # ========== STEP 2: Calculate Sale Values ==========
    quantity = Decimal(str(sale_data['quantity']))
    total_cost = Decimal(str(sale_data['cost_price']))
    total_selling = Decimal(str(sale_data['selling_price']))
    
    cost_per_unit = total_cost / quantity
    selling_per_unit = total_selling / quantity
    profit_per_unit = selling_per_unit - cost_per_unit
    total_profit = profit_per_unit * quantity
    
    # ========== STEP 3: Handle Inventory (Auto-create if needed) ==========
    supplier_inventory_id = None
    inventory_created = False
    
    # Check for existing inventory
    existing_inventory = db.query(SupplierInventory).filter(
        SupplierInventory.variety_id == variety.id,
        SupplierInventory.quantity_remaining >= quantity,
        SupplierInventory.tenant_id == tenant.id
    ).order_by(SupplierInventory.supply_date.asc()).first()
    
    if existing_inventory:
        supplier_inventory = existing_inventory
        print(f"✅ Voice: Using existing inventory ID: {supplier_inventory.id}")
    else:
        # AUTO-CREATE INVENTORY (same as sales.py)
        print(f"📦 Voice: Auto-creating inventory")
        
        supplier_inventory = SupplierInventory(
            tenant_id=tenant.id,
            supplier_name="Voice Sale (To Be Updated)",
            variety_id=variety.id,
            quantity=quantity,
            price_per_item=cost_per_unit,
            total_amount=total_cost,
            supply_date=date.today(),
            quantity_used=Decimal('0'),
            quantity_remaining=quantity,
            quantity_returned=Decimal('0')
        )
        
        db.add(supplier_inventory)
        db.flush()
        inventory_created = True
        print(f"✅ Inventory created with ID: {supplier_inventory.id}")
    
    # Deduct from inventory
    supplier_inventory.quantity_used += quantity
    supplier_inventory.quantity_remaining -= quantity
    supplier_inventory_id = supplier_inventory.id
    
    # Update variety stock
    variety.current_stock += quantity  # Add new stock
    variety.current_stock -= quantity  # Deduct sale
    
    # Log inventory movement
    inventory_movement = InventoryMovement(
        tenant_id=tenant.id,
        variety_id=variety.id,
        movement_type='sale',
        quantity=-quantity,
        reference_type='voice_sale',
        notes=f'Voice sale by {sale_data["salesperson_name"]}',
        movement_date=date.today(),
        stock_after=variety.current_stock
    )
    db.add(inventory_movement)
    
    # ========== STEP 4: Create Sale Record ==========
    # Use logged-in user
    db_sale = Sale(
        tenant_id=tenant.id,
        salesperson_name=user.full_name,  # ← From logged-in user
        variety_id=variety.id,
        quantity=quantity,
        selling_price=selling_per_unit,
        cost_price=cost_per_unit,
        profit=total_profit,
        sale_date=date.today(),
        payment_status=PaymentStatus(sale_data['payment_status']),
        customer_name=sale_data.get('customer_name'),
        supplier_inventory_id=supplier_inventory_id
    )
    
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    # Update movement reference
    inventory_movement.reference_id = db_sale.id
    db.commit()
    
    print(f"✅ Voice sale recorded with ID: {db_sale.id}")
    
    # Build response message
    message = "Voice sale recorded successfully! 🎉"
    if variety_created:
        message += f" New variety '{variety.name}' created."
    if inventory_created:
        message += " Inventory auto-created."
    
    return {
        "success": True,
        "message": message,
        "sale_id": db_sale.id,
        "total_profit": float(total_profit),
        "variety_created": variety_created,
        "inventory_created": inventory_created,
        "stock_deducted": True
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


@router.get("/examples")
def get_voice_examples(user: User = Depends(get_current_user)):
    """Get example voice commands"""
    return {
        "basic_examples": [
            "I sell 50 meters cotton, cost 100 per meter, selling 150",
            "Sold 20 pieces silk, cost 200 each, selling 300",
            "30 yards linen at 250 per yard, cost was 180"
        ],
        "new_stock_examples": [
            "50 meters cotton from new stock, cost 100, selling 150",
            "30 pieces silk from new inventory, cost 200, selling 300"
        ],
        "loan_examples": [
            "20 meters cotton on loan to Ahmed, cost 100, selling 150",
            "50 pieces on credit to Fatima, cost 200, selling 300"
        ],
        "new_variety_examples": [
            "25 meters polyester fabric, cost 120 per meter, selling 180",
            "40 pieces velvet, cost 300 each, selling 450"
        ],
        "tips": [
            "Mention 'new stock' for inventory deduction",
            "Say 'loan' or 'credit' with customer name for credit sales",
            "Prices can be total or per-unit (AI calculates)",
            "New varieties are created automatically",
            "Speak naturally - AI understands variations"
        ]
    }
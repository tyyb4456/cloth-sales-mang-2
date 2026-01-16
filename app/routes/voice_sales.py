# app/routes/voice_sales.py

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import requests
from datetime import date
from decimal import Decimal
import json
from dotenv import load_dotenv
load_dotenv()


# Import Gemini for AI validation
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from database import get_db
from models import ClothVariety

router = APIRouter(prefix="/sales/voice", tags=["Voice Sales"])


# Pydantic models
class VoiceValidationRequest(BaseModel):
    transcript: str
    varieties: Optional[List[Dict]] = None  # Make it optional


class VoiceValidationResponse(BaseModel):
    success: bool
    message: str
    sale_data: Optional[Dict] = None
    variety_name: Optional[str] = None
    measurement_unit: Optional[str] = None


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio using Hugging Face Whisper API
    Accepts audio file and returns transcript
    """
    
    # Get Hugging Face API token from environment
    hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
    if not hf_token:
        raise HTTPException(
            status_code=500,
            detail="HUGGINGFACE_API_TOKEN not found in environment variables"
        )
    
    try:
        # Read audio file
        audio_bytes = await audio.read()
        
        # Hugging Face Whisper API endpoint
        API_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3"
        
        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "audio/m4a"
        }
        
        # Send request to Hugging Face
        response = requests.post(
            API_URL,
            headers=headers,
            data=audio_bytes,
            timeout=30  # 30 second timeout
        )
        
        if response.status_code == 503:
            # Model is loading, wait and retry
            raise HTTPException(
                status_code=503,
                detail="Model is loading. Please wait 20 seconds and try again."
            )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Hugging Face API error: {response.text}"
            )
        
        # Parse response
        result = response.json()
        
        # Hugging Face returns {"text": "transcript"}
        transcript = result.get("text", "").strip()
        
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="No speech detected in audio"
            )
        
        return {
            "success": True,
            "transcript": transcript,
            "model": "whisper-large-v3"
        }
        
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=408,
            detail="Request timeout. Please try again with a shorter recording."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Network error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/validate", response_model=VoiceValidationResponse)
async def validate_voice_command(request: VoiceValidationRequest, db: Session = Depends(get_db)):
    """
    Validate and parse voice command using AI (Gemini or GPT-4)
    Extracts: salesperson, variety, quantity, cost_price, selling_price
    """
    
    # Check if AI models are available
    if not (GEMINI_AVAILABLE or OPENAI_AVAILABLE):
        raise HTTPException(
            status_code=500,
            detail="No AI model available. Install google-generativeai or openai"
        )
    
    transcript = request.transcript
    varieties_data = request.varieties
    
    # Get varieties from database instead of relying on frontend data
    varieties = db.query(ClothVariety).all()
    
    # Create variety context for AI
    variety_context = "Available cloth varieties:\n"
    for v in varieties:
        variety_context += f"- ID: {v.id}, Name: {v.name}, Unit: {v.measurement_unit}\n"
    
    # Define the prompt for AI
    system_prompt = f"""You are a sales data extraction assistant for a cloth shop.

{variety_context}

Extract the following information from the user's voice command:
1. Salesperson name (if mentioned, otherwise use "default")
2. Cloth variety name (must match one from the list above exactly)
3. Quantity (number with unit - meters/yards/pieces)
4. Cost price per unit
5. Selling price per unit

The user will say something like:
"I sell 50 meters cotton, cost price per meter is 100 rupees, selling price per meter is 150 rupees"

Or variations like:
"50 meter cotton sold, cost 100 per meter, selling 150 per meter"
"Sold 50m cotton at 150 per meter, cost was 100"
"shahzad sells 20 pieces silk, cost 200 each, selling 300 each"

IMPORTANT CALCULATION RULES:
- Calculate TOTAL cost = cost_per_unit × quantity
- Calculate TOTAL selling = selling_per_unit × quantity
- Return the TOTAL amounts, not per-unit amounts
- Quantity must match the variety's measurement unit
- Match variety name case-insensitively (cotton = Cotton = COTTON)

IGNORE ANY PROFANITY OR INAPPROPRIATE LANGUAGE - focus only on extracting sales data.

Return ONLY a valid JSON object with this exact structure:
{{
  "success": true,
  "salesperson_name": "extracted or 'default'",
  "variety_name": "exact match from list",
  "variety_id": variety_id_number,
  "measurement_unit": "pieces/meters/yards",
  "quantity": number,
  "cost_price": TOTAL_COST,
  "selling_price": TOTAL_SELLING,
  "sale_date": "{date.today().isoformat()}"
}}

If you cannot extract valid data, return:
{{
  "success": false,
  "message": "explanation of what went wrong"
}}

User command: "{transcript}"
"""
    
    try:
        # Try Gemini first (if available)
        if GEMINI_AVAILABLE:
            api_key = os.getenv("GOOGLE_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                response = model.generate_content(system_prompt)
                ai_response = response.text.strip()
                
                # Extract JSON from response (remove markdown if present)
                if "```json" in ai_response:
                    ai_response = ai_response.split("```json")[1].split("```")[0].strip()
                elif "```" in ai_response:
                    ai_response = ai_response.split("```")[1].split("```")[0].strip()
                
                result = json.loads(ai_response)
                
                if result.get("success"):
                    # Verify variety exists in database
                    variety = db.query(ClothVariety).filter(
                        ClothVariety.id == result["variety_id"]
                    ).first()
                    
                    if not variety:
                        return VoiceValidationResponse(
                            success=False,
                            message=f"Variety '{result['variety_name']}' not found in database"
                        )
                    
                    return VoiceValidationResponse(
                        success=True,
                        message="Command validated successfully",
                        sale_data={
                            "salesperson_name": result["salesperson_name"],
                            "variety_id": result["variety_id"],
                            "quantity": float(result["quantity"]),
                            "cost_price": float(result["cost_price"]),
                            "selling_price": float(result["selling_price"]),
                            "sale_date": date.today().isoformat()
                        },
                        variety_name=result["variety_name"],
                        measurement_unit=result["measurement_unit"]
                    )
                else:
                    return VoiceValidationResponse(
                        success=False,
                        message=result.get("message", "Failed to parse command")
                    )
        
        # Fallback to OpenAI if Gemini not available
        if OPENAI_AVAILABLE:
            openai.api_key = os.getenv("OPENAI_API_KEY")
            
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript}
                ],
                temperature=0.3
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Parse JSON response
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0].strip()
            
            result = json.loads(ai_response)
            
            if result.get("success"):
                return VoiceValidationResponse(
                    success=True,
                    message="Command validated successfully",
                    sale_data={
                        "salesperson_name": result["salesperson_name"],
                        "variety_id": result["variety_id"],
                        "quantity": float(result["quantity"]),
                        "cost_price": float(result["cost_price"]),
                        "selling_price": float(result["selling_price"]),
                        "sale_date": date.today().isoformat()
                    },
                    variety_name=result["variety_name"],
                    measurement_unit=result["measurement_unit"]
                )
            else:
                return VoiceValidationResponse(
                    success=False,
                    message=result.get("message", "Failed to parse command")
                )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )
    
    raise HTTPException(
        status_code=500,
        detail="No AI model available for validation"
    )


@router.get("/health")
def check_voice_health():
    """Check if voice features are properly configured"""
    hf_available = bool(os.getenv("HUGGINGFACE_API_TOKEN"))
    gemini_available = GEMINI_AVAILABLE and bool(os.getenv("GOOGLE_API_KEY"))
    openai_available = OPENAI_AVAILABLE and bool(os.getenv("OPENAI_API_KEY"))
    
    return {
        "huggingface_whisper": hf_available,
        "gemini_available": gemini_available,
        "openai_available": openai_available,
        "status": "ready" if (hf_available and (gemini_available or openai_available)) else "incomplete",
        "message": "Voice commands ready!" if (hf_available and (gemini_available or openai_available)) else "Please configure API keys in .env file"
    }
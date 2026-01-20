# app/main.py - UPDATED WITH PROPER CORS FOR NGROK + MOBILE

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routes import (
    varieties,
    supplier,
    sales,
    reports,
    predictions,
    chatbot,
    expenses,
    voice_sales,
    inventory,
    customer_loans,
    shopkeeper_stock,
    auth_routes,
    user_management,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler"""
    # Startup
    print("Starting database initialization...")
    init_db()
    print("Database initialization complete!")
    yield
    # Shutdown (if needed)
    print("Application shutting down...")

app = FastAPI(
    title="Cloth Shop Management System with AI",
    description="Smart inventory and sales management with predictive analytics",
    version="2.0.0",
    lifespan=lifespan
)

# 🔧 UPDATED CORS MIDDLEWARE - FIX FOR NGROK + MOBILE
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://cloth-sales-mang-2.vercel.app",
        "https://*.vercel.app",
        "https://*.ngrok-free.dev",  # ngrok domains
        "https://*.ngrok.io",         # old ngrok domains
        "*"  # Allow all origins (for development with ngrok)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
# Include routers
app.include_router(varieties.router)
app.include_router(supplier.router)
app.include_router(sales.router)
app.include_router(reports.router)
app.include_router(predictions.router)
app.include_router(chatbot.router)
app.include_router(expenses.router)
app.include_router(voice_sales.router)
app.include_router(inventory.router)
app.include_router(customer_loans.router)
app.include_router(shopkeeper_stock.router)
app.include_router(auth_routes.router)
app.include_router(user_management.router)

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Cloth Shop Management System with AI",
        "version": "2.0.0",
        "features": [
            "Inventory Management",
            "Sales Tracking",
            "Supplier Management",
            "Advanced Analytics",
            "AI-Powered Predictions 🤖",
            "Smart Insights",
            "AI Chatbot 💬",
            "Voice Commands 🎤" 
        ],
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "ai_enabled": True,
        "chatbot_enabled": True,
        "voice_enabled": True
    }
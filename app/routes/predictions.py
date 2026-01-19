# app/routes/predictions.py - UPDATED WITH PROPHET INTEGRATION

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from database import get_db
from models import Sale, SupplierInventory, ClothVariety
from analytics_engine import AnalyticsEngine
from fastapi import HTTPException, status

from routes.auth_routes import get_current_tenant
from auth_models import Tenant

router = APIRouter(prefix="/predictions", tags=["Predictive Analytics"])


@router.get("/revenue-forecast")
def forecast_revenue(
    days_ahead: int = Query(30, ge=7, le=90, description="Days to forecast (7-90)"),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Forecast future revenue based on historical sales data (tenant-isolated)
    🆕 NOW USES FACEBOOK PROPHET FOR ACCURATE TIME SERIES FORECASTING
    """
    
    # Get historical sales data (last 90 days)
    end_date = date.today()
    start_date = end_date - timedelta(days=90)
    
    # Query daily sales aggregated WITH TENANT FILTER
    daily_sales = db.query(
        Sale.sale_date,
        func.sum(Sale.selling_price * Sale.quantity).label('revenue')
    ).filter(
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date,
        Sale.tenant_id == tenant.id
    ).group_by(Sale.sale_date).order_by(Sale.sale_date).all()
    
    # Prepare data for forecasting
    historical_data = [
        {
            "date": str(sale.sale_date),
            "revenue": float(sale.revenue)
        }
        for sale in daily_sales
    ]
    
    # 🆕 Generate forecast using Prophet (automatically falls back to sklearn if unavailable)
    forecast_result = AnalyticsEngine.forecast_revenue(historical_data, days_ahead)
    
    return {
        "historical_data": historical_data[-30:],  # Last 30 days
        "forecast": forecast_result.get("forecast", []),
        "confidence": forecast_result.get("confidence", "low"),
        "r_squared": forecast_result.get("r_squared", 0),
        "mae": forecast_result.get("mae", 0),
        "rmse": forecast_result.get("rmse", 0),
        "summary": {
            "total_predicted_revenue": forecast_result.get("total_predicted", 0),
            "avg_daily_predicted": forecast_result.get("avg_daily_predicted", 0),
            "forecast_period_days": days_ahead
        },
        "model_info": forecast_result.get("model_info", {}),
        "message": forecast_result.get("message")
    }


@router.get("/product-demand/{variety_id}")
def predict_product_demand(
    variety_id: int,
    days_ahead: int = Query(30, ge=7, le=90),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Predict demand for a specific product (tenant-isolated)
    🆕 NOW USES FACEBOOK PROPHET FOR QUANTITY PREDICTIONS
    """
    
    # Check if variety exists FOR THIS TENANT
    variety = db.query(ClothVariety).filter(
        ClothVariety.id == variety_id,
        ClothVariety.tenant_id == tenant.id
    ).first()
    
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variety not found in your business"
        )
    
    # Get historical sales for this product
    end_date = date.today()
    start_date = end_date - timedelta(days=90)
    
    # Get daily sales WITH TENANT FILTER
    daily_sales = db.query(
        Sale.sale_date,
        func.sum(Sale.quantity).label('quantity_sold')
    ).filter(
        Sale.variety_id == variety_id,
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date,
        Sale.tenant_id == tenant.id
    ).group_by(Sale.sale_date).order_by(Sale.sale_date).all()
    
    if len(daily_sales) < 7:
        return {
            "variety_id": variety_id,
            "variety_name": variety.name,
            "message": "Insufficient sales history for this product (need at least 7 days)",
            "forecast": [],
            "confidence": "low"
        }
    
    # 🆕 Prepare data for Prophet (quantity prediction)
    historical_data = [
        {"date": str(sale.sale_date), "quantity": float(sale.quantity_sold)}
        for sale in daily_sales
    ]
    
    # 🆕 Generate forecast using Prophet for QUANTITY
    forecast_result = AnalyticsEngine.forecast_product_demand_prophet(
        historical_data, days_ahead
    )
    
    # Calculate reorder point
    total_qty = sum(sale.quantity_sold for sale in daily_sales)
    avg_daily_sales = total_qty / len(daily_sales)
    reorder_point = AnalyticsEngine.calculate_reorder_point(avg_daily_sales)
    
    return {
        "variety_id": variety_id,
        "variety_name": variety.name,
        "forecast": forecast_result["forecast"],
        "confidence": forecast_result["confidence"],
        "r_squared": forecast_result.get("r_squared", 0),
        "analytics": {
            "avg_daily_sales": round(avg_daily_sales, 2),
            "total_predicted_demand": int(forecast_result.get("total_predicted", 0)),
            "reorder_point": reorder_point,
            "recommendation": f"Reorder when stock falls below {reorder_point} units"
        },
        "model_info": forecast_result.get("model_info", {}),
        "message": forecast_result.get("message", "")
    }


@router.get("/sales-trends")
def analyze_sales_trends(
    days: int = Query(30, ge=7, le=180),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Analyze sales trends and patterns (tenant-isolated)"""
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Get daily sales WITH TENANT FILTER
    daily_sales = db.query(
        Sale.sale_date,
        func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.count(Sale.id).label('transaction_count')
    ).filter(
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date,
        Sale.tenant_id == tenant.id
    ).group_by(Sale.sale_date).order_by(Sale.sale_date).all()
    
    if len(daily_sales) < 7:
        return {"error": "Insufficient data for trend analysis"}
    
    # Prepare data
    revenues = [float(sale.revenue) for sale in daily_sales]
    profits = [float(sale.profit) for sale in daily_sales]
    
    # Detect trends
    revenue_trend = AnalyticsEngine.detect_trend(revenues)
    profit_trend = AnalyticsEngine.detect_trend(profits)
    
    # Calculate moving averages
    revenue_ma = AnalyticsEngine.calculate_moving_average(revenues, window=7)
    
    # Detect seasonality
    sales_data = [
        {"date": sale.sale_date, "revenue": float(sale.revenue)}
        for sale in daily_sales
    ]
    seasonality = AnalyticsEngine.calculate_seasonality(sales_data)
    
    # Calculate growth rates
    if len(revenues) >= 14:
        first_half = revenues[:len(revenues)//2]
        second_half = revenues[len(revenues)//2:]
        growth_rate = AnalyticsEngine.calculate_growth_rate(
            sum(second_half), sum(first_half)
        )
    else:
        growth_rate = 0
    
    return {
        "period": f"{days} days",
        "revenue_trend": revenue_trend,
        "profit_trend": profit_trend,
        "growth_rate": round(growth_rate, 2),
        "seasonality": seasonality,
        "summary": {
            "total_revenue": sum(revenues),
            "total_profit": sum(profits),
            "avg_daily_revenue": round(sum(revenues) / len(revenues), 2),
            "avg_daily_profit": round(sum(profits) / len(profits), 2),
            "total_transactions": sum(sale.transaction_count for sale in daily_sales)
        }
    }


@router.get("/product-performance")
def analyze_product_performance(
    days: int = Query(30, ge=7, le=180),
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Analyze performance of all products (tenant-isolated)"""
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Get sales by variety WITH TENANT FILTER
    product_sales = db.query(
        Sale.variety_id,
        func.sum(Sale.selling_price * Sale.quantity).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.sum(Sale.quantity).label('quantity_sold'),
        func.count(Sale.id).label('sales_count')
    ).filter(
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date,
        Sale.tenant_id == tenant.id
    ).group_by(Sale.variety_id).all()
    
    # Get variety details FOR THIS TENANT
    varieties = {
        v.id: v.name 
        for v in db.query(ClothVariety).filter(
            ClothVariety.tenant_id == tenant.id
        ).all()
    }
    
    # Calculate metrics
    products = []
    for sale in product_sales:
        revenue = float(sale.revenue)
        profit = float(sale.profit)
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        products.append({
            "variety_id": sale.variety_id,
            "variety_name": varieties.get(sale.variety_id, f"Product {sale.variety_id}"),
            "revenue": round(revenue, 2),
            "profit": round(profit, 2),
            "quantity_sold": sale.quantity_sold,
            "sales_count": sale.sales_count,
            "profit_margin": round(margin, 2),
            "avg_sale_value": round(revenue / sale.sales_count, 2) if sale.sales_count > 0 else 0
        })
    
    # Sort by revenue
    products.sort(key=lambda x: x["revenue"], reverse=True)
    
    # Categorize products
    if products:
        avg_revenue = sum(p["revenue"] for p in products) / len(products)
        
        top_performers = [p for p in products if p["revenue"] > avg_revenue * 1.5]
        slow_movers = [p for p in products if p["revenue"] < avg_revenue * 0.5]
        high_margin = [p for p in products if p["profit_margin"] > 30]
    else:
        top_performers = []
        slow_movers = []
        high_margin = []
    
    return {
        "period": f"{days} days",
        "all_products": products,
        "top_performers": top_performers[:5],
        "slow_movers": slow_movers,
        "high_margin_products": high_margin[:5],
        "summary": {
            "total_products": len(products),
            "total_revenue": sum(p["revenue"] for p in products),
            "total_profit": sum(p["profit"] for p in products),
            "avg_margin": round(sum(p["profit_margin"] for p in products) / len(products), 2) if products else 0
        }
    }


@router.get("/smart-insights")
def get_smart_insights(
    days: int = 30,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered business insights (tenant-isolated)
    """
    try:
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Fetch sales data WITH TENANT FILTER
        sales = db.query(Sale).filter(
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date,
            Sale.tenant_id == tenant.id
        ).all()
        
        # Format sales_data correctly with "revenue" key
        sales_data = [
            {
                "date": sale.sale_date,
                "revenue": float(sale.selling_price * sale.quantity)
            }
            for sale in sales
        ]
        
        # Fetch inventory data WITH TENANT FILTER
        inventories = db.query(SupplierInventory).filter(
            SupplierInventory.supply_date >= start_date,
            SupplierInventory.supply_date <= end_date,
            SupplierInventory.tenant_id == tenant.id
        ).all()
        
        inventory_data = [
            {
                "variety_id": inv.variety_id,
                "quantity": float(inv.quantity),
                "date": inv.supply_date
            }
            for inv in inventories
        ]
        
        # Calculate product performance
        product_stats = {}
        for sale in sales:
            # Get variety WITH TENANT FILTER
            variety = db.query(ClothVariety).filter(
                ClothVariety.id == sale.variety_id,
                ClothVariety.tenant_id == tenant.id
            ).first()
            
            if not variety:
                continue
                
            name = variety.name
            if name not in product_stats:
                product_stats[name] = {
                    "name": name,
                    "revenue": 0,
                    "quantity": 0,
                    "margin": 0
                }
            
            revenue = float(sale.selling_price * sale.quantity)
            product_stats[name]["revenue"] += revenue
            product_stats[name]["quantity"] += float(sale.quantity)
            
            if revenue > 0:
                product_stats[name]["margin"] = (float(sale.profit) / revenue) * 100
        
        product_data = list(product_stats.values())
        
        # Generate insights
        insights = AnalyticsEngine.generate_insights(sales_data, inventory_data, product_data)
        
        return {
            "success": True,
            "insights": insights,
            "period_days": days
        }
        
    except Exception as e:
        print(f"❌ Error generating insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate insights: {str(e)}"
        )


@router.get("/reorder-recommendations")
def get_reorder_recommendations(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get smart reorder recommendations for all products (tenant-isolated)"""
    
    # Get sales data for last 30 days
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    # Get product sales WITH TENANT FILTER
    product_sales = db.query(
        Sale.variety_id,
        func.sum(Sale.quantity).label('total_quantity'),
        func.count(func.distinct(Sale.sale_date)).label('days_sold')
    ).filter(
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date,
        Sale.tenant_id == tenant.id
    ).group_by(Sale.variety_id).all()
    
    # Get variety details FOR THIS TENANT
    varieties = {
        v.id: v 
        for v in db.query(ClothVariety).filter(
            ClothVariety.tenant_id == tenant.id
        ).all()
    }
    
    recommendations = []
    for sale in product_sales:
        variety = varieties.get(sale.variety_id)
        if not variety:
            continue
        
        # Convert Decimal to float for calculations
        total_quantity = float(sale.total_quantity) if sale.total_quantity else 0
        days_sold_count = sale.days_sold if sale.days_sold else 1
        
        avg_daily_sales = total_quantity / days_sold_count
        reorder_point = AnalyticsEngine.calculate_reorder_point(avg_daily_sales)
        optimal_order_qty = int(reorder_point * 2)  # Order enough for 2 cycles
        
        recommendations.append({
            "variety_id": sale.variety_id,
            "variety_name": variety.name,
            "avg_daily_sales": round(avg_daily_sales, 2),
            "reorder_point": reorder_point,
            "optimal_order_quantity": optimal_order_qty,
            "days_of_stock": int(optimal_order_qty / avg_daily_sales) if avg_daily_sales > 0 else 0,
            "priority": "high" if avg_daily_sales > 10 else "medium" if avg_daily_sales > 5 else "low"
        })
    
    # Sort by priority and avg sales
    recommendations.sort(key=lambda x: x["avg_daily_sales"], reverse=True)
    
    return {
        "recommendations": recommendations,
        "total_products": len(recommendations),
        "generated_at": datetime.now().isoformat()
    }
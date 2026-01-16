# app/analytics_engine.py

from datetime import datetime, timedelta, date
from typing import List, Dict, Tuple, Optional
from decimal import Decimal
from collections import defaultdict
import numpy as np

# Try to import sklearn - use advanced ML if available
try:
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import PolynomialFeatures
    from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️ Warning: scikit-learn not installed. Using basic linear regression.")
    print("   Install with: pip install scikit-learn")


class AnalyticsEngine:
    """Advanced Machine Learning and Statistical Analysis Engine"""
    
    @staticmethod
    def calculate_moving_average(data: List[float], window: int = 7) -> List[float]:
        """Calculate simple moving average"""
        if len(data) < window:
            return data
        
        result = []
        for i in range(len(data)):
            if i < window - 1:
                result.append(data[i])
            else:
                avg = sum(data[i-window+1:i+1]) / window
                result.append(avg)
        return result
    
    @staticmethod
    def exponential_moving_average(data: List[float], alpha: float = 0.3) -> List[float]:
        """
        Calculate exponential moving average (gives more weight to recent data)
        alpha: smoothing factor (0-1), higher = more weight to recent values
        """
        if not data:
            return []
        
        ema = [data[0]]
        for value in data[1:]:
            ema.append(alpha * value + (1 - alpha) * ema[-1])
        return ema
    
    @staticmethod
    def linear_regression_forecast_sklearn(x: np.ndarray, y: np.ndarray, 
                                          future_periods: int,
                                          use_polynomial: bool = False,
                                          degree: int = 2) -> Dict:
        """
        Advanced linear regression using scikit-learn
        Returns: dict with predictions, r_squared, mae, rmse, and model info
        """
        if len(x) < 2:
            return {
                "predictions": [y[-1]] * future_periods if len(y) > 0 else [0] * future_periods,
                "r_squared": 0.0,
                "mae": 0.0,
                "rmse": 0.0,
                "model_type": "insufficient_data"
            }
        
        # Reshape for sklearn
        X = x.reshape(-1, 1)
        y_values = y.reshape(-1, 1)
        
        # Use polynomial features if requested (for non-linear trends)
        if use_polynomial and degree > 1:
            poly = PolynomialFeatures(degree=degree)
            X_poly = poly.fit_transform(X)
            model = LinearRegression()
            model.fit(X_poly, y_values)
            
            # Make predictions
            y_pred = model.predict(X_poly).flatten()
            
            # Future predictions
            future_x = np.arange(len(x), len(x) + future_periods).reshape(-1, 1)
            future_X_poly = poly.transform(future_x)
            predictions = model.predict(future_X_poly).flatten()
            
            model_type = f"polynomial_degree_{degree}"
        else:
            # Standard linear regression
            model = LinearRegression()
            model.fit(X, y_values)
            
            # Make predictions
            y_pred = model.predict(X).flatten()
            
            # Future predictions
            future_x = np.arange(len(x), len(x) + future_periods).reshape(-1, 1)
            predictions = model.predict(future_x).flatten()
            
            model_type = "linear"
        
        # Ensure no negative predictions
        predictions = np.maximum(predictions, 0)
        
        # Calculate metrics
        r_squared = r2_score(y, y_pred)
        mae = mean_absolute_error(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        
        return {
            "predictions": predictions.tolist(),
            "r_squared": float(r_squared),
            "mae": float(mae),
            "rmse": float(rmse),
            "model_type": model_type,
            "coefficients": model.coef_.flatten().tolist(),
            "intercept": float(model.intercept_[0]) if hasattr(model.intercept_, '__iter__') else float(model.intercept_)
        }
    
    @staticmethod
    def linear_regression_forecast_basic(x: List[float], y: List[float], 
                                        future_periods: int) -> Tuple[List[float], float]:
        """
        Fallback: Basic linear regression (when sklearn not available)
        Returns: (predictions, r_squared)
        """
        n = len(x)
        if n < 2:
            return [y[-1]] * future_periods if y else [0] * future_periods, 0.0
        
        # Calculate slope and intercept
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return [y_mean] * future_periods, 0.0
        
        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        
        # Calculate R-squared
        y_pred = [slope * x[i] + intercept for i in range(n)]
        ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
        ss_tot = sum((y[i] - y_mean) ** 2 for i in range(n))
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Generate predictions
        predictions = []
        for i in range(future_periods):
            future_x = n + i
            pred = slope * future_x + intercept
            predictions.append(max(0, pred))
        
        return predictions, r_squared
    
    @staticmethod
    def linear_regression_forecast(x: List[float], y: List[float], 
                                   future_periods: int,
                                   use_polynomial: bool = False) -> Dict:
        """
        Smart wrapper: Uses sklearn if available, falls back to basic implementation
        """
        if SKLEARN_AVAILABLE:
            x_array = np.array(x)
            y_array = np.array(y)
            
            # Try polynomial regression for better fit if requested
            if use_polynomial:
                result = AnalyticsEngine.linear_regression_forecast_sklearn(
                    x_array, y_array, future_periods, use_polynomial=True, degree=2
                )
            else:
                result = AnalyticsEngine.linear_regression_forecast_sklearn(
                    x_array, y_array, future_periods
                )
            
            return {
                "predictions": result["predictions"],
                "r_squared": result["r_squared"],
                "mae": result.get("mae", 0),
                "rmse": result.get("rmse", 0),
                "model_type": result.get("model_type", "linear"),
                "using_sklearn": True
            }
        else:
            # Fallback to basic implementation
            predictions, r_squared = AnalyticsEngine.linear_regression_forecast_basic(
                x, y, future_periods
            )
            return {
                "predictions": predictions,
                "r_squared": r_squared,
                "mae": 0,
                "rmse": 0,
                "model_type": "basic_linear",
                "using_sklearn": False
            }
    
    @staticmethod
    def calculate_growth_rate(current: float, previous: float) -> float:
        """Calculate percentage growth rate"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100
    
    @staticmethod
    def detect_trend(data: List[float]) -> Dict:
        """Detect if data shows upward, downward, or stable trend"""
        if len(data) < 2:
            return {"trend": "insufficient_data", "strength": 0, "confidence": 0}
        
        x = list(range(len(data)))
        
        if SKLEARN_AVAILABLE:
            # Use sklearn for better trend detection
            X = np.array(x).reshape(-1, 1)
            y = np.array(data)
            
            model = LinearRegression()
            model.fit(X, y)
            
            slope = float(model.coef_[0])
            r_squared = r2_score(y, model.predict(X))
            y_mean = np.mean(y)
        else:
            # Fallback to basic calculation
            x_mean = sum(x) / len(x)
            y_mean = sum(data) / len(data)
            
            numerator = sum((x[i] - x_mean) * (data[i] - y_mean) for i in range(len(data)))
            denominator = sum((x[i] - x_mean) ** 2 for i in range(len(data)))
            
            if denominator == 0:
                return {"trend": "stable", "strength": 0, "confidence": 0}
            
            slope = numerator / denominator
            
            # Calculate R-squared
            y_pred = [slope * x[i] + (y_mean - slope * x_mean) for i in range(len(data))]
            ss_res = sum((data[i] - y_pred[i]) ** 2 for i in range(len(data)))
            ss_tot = sum((data[i] - y_mean) ** 2 for i in range(len(data)))
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Determine trend
        threshold = y_mean * 0.01  # 1% of mean as threshold
        
        if slope > threshold:
            trend = "upward"
        elif slope < -threshold:
            trend = "downward"
        else:
            trend = "stable"
        
        # Calculate strength (normalized)
        strength = min(abs(slope / y_mean) * 100, 100) if y_mean != 0 else 0
        
        return {
            "trend": trend,
            "strength": round(strength, 2),
            "slope": round(slope, 2),
            "confidence": round(r_squared * 100, 2)  # R² as confidence %
        }
    
    @staticmethod
    def calculate_seasonality(data: List[Dict], period: int = 7) -> Dict:
        """
        Detect seasonal patterns (e.g., day of week patterns)
        data: List of {"date": date_obj, "value": float} OR {"date": date_obj, "revenue": float}
        """
        if len(data) < period * 2:
            return {"has_seasonality": False, "pattern": {}}
        
        # Group by day of week
        period_data = defaultdict(list)
        for item in data:
            if isinstance(item["date"], str):
                date_obj = datetime.strptime(item["date"], "%Y-%m-%d").date()
            else:
                date_obj = item["date"]
            
            day_of_week = date_obj.weekday()
            
            # 🔧 FIX: Handle both "value" and "revenue" keys
            value = item.get("value") or item.get("revenue", 0)
            period_data[day_of_week].append(float(value))
        
        # Calculate average and std for each day
        pattern = {}
        std_pattern = {}
        for day, values in period_data.items():
            if len(values) == 0:
                continue
                
            pattern[day] = sum(values) / len(values)
            if SKLEARN_AVAILABLE:
                std_pattern[day] = float(np.std(values))
            else:
                mean = pattern[day]
                variance = sum((v - mean) ** 2 for v in values) / len(values)
                std_pattern[day] = variance ** 0.5
        
        # Check if variation is significant
        if len(pattern) > 0:
            avg = sum(pattern.values()) / len(pattern)
            variation = sum(abs(v - avg) for v in pattern.values()) / len(pattern)
            has_seasonality = (variation / avg > 0.1) if avg > 0 else False
        else:
            has_seasonality = False
        
        days_map = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
                4: "Friday", 5: "Saturday", 6: "Sunday"}
        
        return {
            "has_seasonality": has_seasonality,
            "pattern": {days_map[k]: round(v, 2) for k, v in pattern.items()},
            "std_deviation": {days_map[k]: round(v, 2) for k, v in std_pattern.items()},
            "best_day": days_map[max(pattern.keys(), key=lambda k: pattern[k])] if pattern else None,
            "worst_day": days_map[min(pattern.keys(), key=lambda k: pattern[k])] if pattern else None
        }
    
    @staticmethod
    def calculate_reorder_point(avg_daily_sales: float, lead_time_days: int = 7,
                               safety_stock_factor: float = 1.5) -> int:
        """
        Calculate when to reorder inventory
        avg_daily_sales: Average units sold per day
        lead_time_days: Days it takes to receive new stock
        safety_stock_factor: Multiplier for safety stock
        """
        avg_daily_sales = float(avg_daily_sales)
        
        if avg_daily_sales <= 0:
            return 0
        
        reorder_point = (avg_daily_sales * lead_time_days) * safety_stock_factor
        
        if SKLEARN_AVAILABLE:
            return int(np.ceil(reorder_point))
        else:
            import math
            return int(math.ceil(reorder_point))
    
    @staticmethod
    def forecast_revenue(historical_data: List[Dict], days_ahead: int = 30,
                        use_advanced: bool = True) -> Dict:
        """
        Forecast revenue for future days
        historical_data: [{"date": "2024-01-01", "revenue": 1000}, ...]
        use_advanced: Use polynomial regression if available
        """
        if len(historical_data) < 7:
            return {
                "forecast": [],
                "confidence": "low",
                "r_squared": 0,
                "total_predicted": 0,
                "total_predicted_revenue": 0,
                "avg_daily_predicted": 0,
                "model_info": {"type": "insufficient_data"},
                "message": "Insufficient historical data for accurate forecasting (need at least 7 days)"
            }
        
        # Prepare data
        x = list(range(len(historical_data)))
        y = [item["revenue"] for item in historical_data]
        
        # Apply smoothing for better trend detection
        if len(y) >= 7:
            if SKLEARN_AVAILABLE:
                y_smoothed = AnalyticsEngine.exponential_moving_average(y, alpha=0.3)
            else:
                y_smoothed = AnalyticsEngine.calculate_moving_average(y, window=7)
        else:
            y_smoothed = y
        
        # Decide whether to use polynomial regression
        use_polynomial = use_advanced and SKLEARN_AVAILABLE and len(historical_data) >= 14
        
        # Generate forecast
        forecast_result = AnalyticsEngine.linear_regression_forecast(
            x, y_smoothed, days_ahead, use_polynomial=use_polynomial
        )
        
        predictions = forecast_result["predictions"]
        r_squared = forecast_result["r_squared"]
        
        # Determine confidence level
        if r_squared > 0.7:
            confidence = "high"
        elif r_squared > 0.4:
            confidence = "medium"
        else:
            confidence = "low"
        
        # Generate forecast dates
        if historical_data:
            last_date_str = historical_data[-1]["date"]
            if isinstance(last_date_str, str):
                last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date()
            else:
                last_date = last_date_str
        else:
            last_date = date.today()
        
        forecast_data = []
        for i, pred in enumerate(predictions, 1):
            forecast_date = last_date + timedelta(days=i)
            forecast_data.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_revenue": round(pred, 2),
                "confidence_level": confidence
            })
        
        total_predicted = round(sum(predictions), 2) if predictions else 0
        avg_daily = round(sum(predictions) / len(predictions), 2) if predictions else 0
        
        return {
            "forecast": forecast_data,
            "confidence": confidence,
            "r_squared": round(r_squared, 3),
            "mae": round(forecast_result.get("mae", 0), 2),
            "rmse": round(forecast_result.get("rmse", 0), 2),
            "total_predicted": total_predicted,
            "total_predicted_revenue": total_predicted,
            "avg_daily_predicted": avg_daily,
            "model_info": {
                "type": forecast_result.get("model_type", "unknown"),
                "using_sklearn": forecast_result.get("using_sklearn", False),
                "sklearn_available": SKLEARN_AVAILABLE
            }
        }
    
    @staticmethod
    def generate_insights(sales_data: List[Dict], inventory_data: List[Dict],
                         product_data: List[Dict]) -> List[Dict]:
        """Generate actionable business insights using AI/ML analysis"""
        insights = []
        
        # Insight 1: Revenue Trend
        if len(sales_data) >= 7:
            revenues = [s["revenue"] for s in sales_data]
            trend_info = AnalyticsEngine.detect_trend(revenues)
            
            if trend_info["trend"] == "upward" and trend_info["strength"] > 10:
                insights.append({
                    "type": "positive",
                    "category": "revenue",
                    "title": "Strong Revenue Growth",
                    "message": f"Revenue is trending upward with {trend_info['strength']:.1f}% strength ({trend_info['confidence']:.0f}% confidence). Great momentum!",
                    "priority": "high",
                    "confidence": trend_info["confidence"]
                })
            elif trend_info["trend"] == "downward" and trend_info["strength"] > 10:
                insights.append({
                    "type": "warning",
                    "category": "revenue",
                    "title": "Revenue Declining",
                    "message": f"Revenue shows a downward trend ({trend_info['confidence']:.0f}% confidence). Consider promotions or review pricing strategy.",
                    "priority": "high",
                    "confidence": trend_info["confidence"]
                })
        
        # Insight 2: Best Selling Products
        if len(product_data) > 0:
            sorted_products = sorted(product_data, key=lambda x: x.get("revenue", 0), reverse=True)
            if sorted_products:
                top_product = sorted_products[0]
                insights.append({
                    "type": "info",
                    "category": "product",
                    "title": f"Top Performer: {top_product['name']}",
                    "message": f"Generated ₹{top_product['revenue']:,.0f} in revenue. Ensure adequate stock levels.",
                    "priority": "medium"
                })
        
        # Insight 3: Slow Moving Products
        if len(product_data) > 0:
            avg_revenue = sum(p.get("revenue", 0) for p in product_data) / len(product_data)
            slow_movers = [p for p in product_data if p.get("revenue", 0) < avg_revenue * 0.3]
            
            if slow_movers:
                insights.append({
                    "type": "warning",
                    "category": "inventory",
                    "title": "Slow Moving Products Detected",
                    "message": f"{len(slow_movers)} product(s) selling below 30% of average. Consider discounts or bundling.",
                    "priority": "medium"
                })
        
        # Insight 4: High Margin Products
        if len(product_data) > 0:
            high_margin = [p for p in product_data if p.get("margin", 0) > 35]
            if high_margin:
                insights.append({
                    "type": "positive",
                    "category": "profit",
                    "title": "High Margin Opportunities",
                    "message": f"{len(high_margin)} product(s) with >35% margin. Focus on promoting these items.",
                    "priority": "high"
                })
        
        # Insight 5: Seasonality Detection
        if len(sales_data) >= 14:
            seasonality = AnalyticsEngine.calculate_seasonality(sales_data)
            if seasonality["has_seasonality"] and seasonality["best_day"]:
                insights.append({
                    "type": "info",
                    "category": "sales",
                    "title": f"Peak Sales Day: {seasonality['best_day']}",
                    "message": f"Sales are consistently higher on {seasonality['best_day']}. Plan inventory and staffing accordingly.",
                    "priority": "medium"
                })
        
        return insights
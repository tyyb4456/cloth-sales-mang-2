# app/analytics_engine.py - UPDATED WITH FACEBOOK PROPHET

from datetime import datetime, timedelta, date
from typing import List, Dict, Tuple, Optional
from decimal import Decimal
from collections import defaultdict
import numpy as np
import pandas as pd

# Try to import sklearn - use advanced ML if available
try:
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import PolynomialFeatures
    from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️ Warning: scikit-learn not installed. Using basic linear regression.")

# 🆕 NEW: Try to import Prophet for time series forecasting
try:
    from prophet import Prophet
    import warnings
    warnings.filterwarnings('ignore', category=FutureWarning)
    PROPHET_AVAILABLE = True
    print("✅ Prophet available for advanced time series forecasting")
except ImportError:
    PROPHET_AVAILABLE = False
    print("⚠️ Warning: Prophet not installed. Using fallback regression.")
    print("   Install with: pip install prophet")


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
        """Calculate exponential moving average"""
        if not data:
            return []
        
        ema = [data[0]]
        for value in data[1:]:
            ema.append(alpha * value + (1 - alpha) * ema[-1])
        return ema
    
    # 🆕 NEW: Facebook Prophet Time Series Forecasting (Generic)
    @staticmethod
    def forecast_timeseries_prophet(historical_data: List[Dict], days_ahead: int = 30, 
                                    value_column: str = "revenue") -> Dict:
        """
        Advanced time series forecasting using Facebook Prophet
        Works for BOTH revenue and quantity predictions
        
        historical_data: [{"date": "2024-01-01", "revenue": 1000}, ...] 
                        OR [{"date": "2024-01-01", "quantity": 50}, ...]
        value_column: "revenue" or "quantity" - what to predict
        """
        if not PROPHET_AVAILABLE:
            print("⚠️ Prophet not available, falling back to sklearn")
            return AnalyticsEngine.forecast_sklearn_fallback(historical_data, days_ahead, value_column)
        
        if len(historical_data) < 7:
            return {
                "forecast": [],
                "confidence": "low",
                "r_squared": 0,
                "mae": 0,
                "rmse": 0,
                "total_predicted": 0,
                "avg_daily_predicted": 0,
                "model_info": {"type": "insufficient_data"},
                "message": "Need at least 7 days of data for Prophet forecasting"
            }
        
        try:
            # Prepare data for Prophet (needs 'ds' and 'y' columns)
            df = pd.DataFrame(historical_data)
            df['ds'] = pd.to_datetime(df['date'])
            
            # 🆕 FLEXIBLE: Use either "revenue" or "quantity" column
            if value_column in df.columns:
                df['y'] = df[value_column]
            else:
                # Try alternative column names
                if 'quantity_sold' in df.columns:
                    df['y'] = df['quantity_sold']
                elif 'value' in df.columns:
                    df['y'] = df['value']
                else:
                    raise ValueError(f"Column '{value_column}' not found in data")
            
            df = df[['ds', 'y']]
            
            # Remove any NaN values
            df = df.dropna()
            
            if len(df) < 7:
                raise ValueError("Insufficient valid data points")
            
            # 🎯 OPTIMIZED: Different settings for revenue vs quantity
            if value_column == "quantity" or "quantity" in value_column:
                # Quantity predictions: More stable, less sensitive to spikes
                model = Prophet(
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=False,
                    changepoint_prior_scale=0.03,  # More stable for quantities
                    seasonality_mode='additive'     # Additive for quantities
                )
            else:
                # Revenue predictions: Can handle larger variations
                model = Prophet(
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=False,
                    changepoint_prior_scale=0.05,
                    seasonality_mode='multiplicative'
                )
            
            # Fit the model
            model.fit(df)
            
            # Create future dataframe for predictions
            future = model.make_future_dataframe(periods=days_ahead, freq='D')
            
            # Generate forecast
            forecast = model.predict(future)
            
            # Extract predictions for future dates only
            future_forecast = forecast.tail(days_ahead)
            
            # Calculate model accuracy on historical data
            historical_forecast = forecast.head(len(df))
            y_true = df['y'].values
            y_pred = historical_forecast['yhat'].values
            
            # Ensure non-negative predictions
            future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)
            future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(lower=0)
            future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(lower=0)
            
            # Calculate metrics
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
            
            # R² calculation
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            
            # Determine confidence based on R²
            if r_squared > 0.7:
                confidence = "high"
            elif r_squared > 0.4:
                confidence = "medium"
            else:
                confidence = "low"
            
            # 🆕 Format forecast data (works for both revenue and quantity)
            forecast_data = []
            for _, row in future_forecast.iterrows():
                item = {
                    "date": row['ds'].strftime("%Y-%m-%d"),
                    "lower_bound": round(float(row['yhat_lower']), 2),
                    "upper_bound": round(float(row['yhat_upper']), 2),
                    "confidence_level": confidence
                }
                
                # Add appropriate key based on what we're predicting
                if value_column == "quantity" or "quantity" in value_column:
                    item["predicted_quantity"] = int(round(float(row['yhat'])))
                else:
                    item["predicted_revenue"] = round(float(row['yhat']), 2)
                
                forecast_data.append(item)
            
            # Calculate totals
            if value_column == "quantity" or "quantity" in value_column:
                total_predicted = sum(item['predicted_quantity'] for item in forecast_data)
            else:
                total_predicted = sum(item.get('predicted_revenue', 0) for item in forecast_data)
            
            avg_daily = total_predicted / len(forecast_data) if forecast_data else 0
            
            return {
                "forecast": forecast_data,
                "confidence": confidence,
                "r_squared": round(r_squared, 3),
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "total_predicted": round(total_predicted, 2),
                "total_predicted_revenue": round(total_predicted, 2),
                "avg_daily_predicted": round(avg_daily, 2),
                "model_info": {
                    "type": "prophet",
                    "predicting": value_column,
                    "components": "trend + weekly_seasonality",
                    "using_prophet": True
                },
                "message": f"Prophet model trained on {len(df)} days of data"
            }
            
        except Exception as e:
            print(f"❌ Prophet forecasting failed: {str(e)}")
            print("   Falling back to sklearn regression")
            return AnalyticsEngine.forecast_sklearn_fallback(historical_data, days_ahead, value_column)
    
    # 🆕 WRAPPER: Revenue forecasting (for PredictionsDashboard)
    @staticmethod
    def forecast_revenue_prophet(historical_data: List[Dict], days_ahead: int = 30) -> Dict:
        """Predict future REVENUE using Prophet"""
        return AnalyticsEngine.forecast_timeseries_prophet(
            historical_data, days_ahead, value_column="revenue"
        )
    
    # 🆕 NEW: Product demand forecasting (for ProductDemandPredictor)
    @staticmethod
    def forecast_product_demand_prophet(historical_data: List[Dict], days_ahead: int = 30) -> Dict:
        """Predict future QUANTITY/DEMAND using Prophet"""
        return AnalyticsEngine.forecast_timeseries_prophet(
            historical_data, days_ahead, value_column="quantity"
        )
    
    # 🔧 UPDATED: Main forecast method now uses Prophet by default
    @staticmethod
    def forecast_revenue(historical_data: List[Dict], days_ahead: int = 30,
                        use_advanced: bool = True) -> Dict:
        """
        Smart revenue forecasting that picks the best available method
        
        Priority:
        1. Facebook Prophet (best for retail time series)
        2. Scikit-learn regression (fallback)
        3. Basic linear regression (last resort)
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
                "message": "Need at least 7 days of historical data for accurate forecasting"
            }
        
        # 🆕 TRY PROPHET FIRST (best for time series)
        if PROPHET_AVAILABLE and use_advanced:
            return AnalyticsEngine.forecast_revenue_prophet(historical_data, days_ahead)
        
        # FALLBACK TO SKLEARN
        return AnalyticsEngine.forecast_sklearn_fallback(historical_data, days_ahead, "revenue")
    
    @staticmethod
    def forecast_sklearn_fallback(historical_data: List[Dict], days_ahead: int = 30,
                                  value_column: str = "revenue") -> Dict:
        """
        Fallback: Scikit-learn based forecasting when Prophet is unavailable
        Works for both revenue and quantity predictions
        """
        if len(historical_data) < 7:
            return {
                "forecast": [],
                "confidence": "low",
                "r_squared": 0,
                "total_predicted": 0,
                "model_info": {"type": "insufficient_data"}
            }
        
        # Prepare data - flexible column selection
        x = list(range(len(historical_data)))
        
        if value_column in historical_data[0]:
            y = [item[value_column] for item in historical_data]
        elif 'quantity_sold' in historical_data[0]:
            y = [item['quantity_sold'] for item in historical_data]
        elif 'value' in historical_data[0]:
            y = [item['value'] for item in historical_data]
        else:
            return {
                "forecast": [],
                "confidence": "low",
                "message": f"Could not find {value_column} in data"
            }
        
        # Apply smoothing
        if len(y) >= 7:
            y_smoothed = AnalyticsEngine.calculate_moving_average(y, window=7)
        else:
            y_smoothed = y
        
        # Use polynomial if sklearn available
        if SKLEARN_AVAILABLE:
            X = np.array(x).reshape(-1, 1)
            y_array = np.array(y_smoothed)
            
            poly = PolynomialFeatures(degree=2)
            X_poly = poly.fit_transform(X)
            
            model = LinearRegression()
            model.fit(X_poly, y_array)
            
            y_pred = model.predict(X_poly)
            
            future_x = np.arange(len(x), len(x) + days_ahead).reshape(-1, 1)
            future_X_poly = poly.transform(future_x)
            predictions = model.predict(future_X_poly)
            predictions = np.maximum(predictions, 0)
            
            r_squared = r2_score(y_array, y_pred)
            mae = mean_absolute_error(y_array, y_pred)
            rmse = np.sqrt(mean_squared_error(y_array, y_pred))
            
            predictions_list = predictions.tolist()
        else:
            predictions_list, r_squared = AnalyticsEngine.linear_regression_forecast_basic(
                x, y_smoothed, days_ahead
            )
            mae = 0
            rmse = 0
        
        if r_squared > 0.7:
            confidence = "high"
        elif r_squared > 0.4:
            confidence = "medium"
        else:
            confidence = "low"
        
        last_date_str = historical_data[-1]["date"]
        if isinstance(last_date_str, str):
            last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date()
        else:
            last_date = last_date_str
        
        forecast_data = []
        for i, pred in enumerate(predictions_list, 1):
            forecast_date = last_date + timedelta(days=i)
            item = {
                "date": forecast_date.strftime("%Y-%m-%d"),
                "confidence_level": confidence
            }
            
            # Add appropriate prediction key
            if value_column == "quantity" or "quantity" in value_column:
                item["predicted_quantity"] = int(round(pred))
            else:
                item["predicted_revenue"] = round(pred, 2)
            
            forecast_data.append(item)
        
        total_predicted = round(sum(predictions_list), 2)
        avg_daily = round(sum(predictions_list) / len(predictions_list), 2) if predictions_list else 0
        
        return {
            "forecast": forecast_data,
            "confidence": confidence,
            "r_squared": round(r_squared, 3),
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "total_predicted": total_predicted,
            "total_predicted_revenue": total_predicted,
            "avg_daily_predicted": avg_daily,
            "model_info": {
                "type": "sklearn_polynomial" if SKLEARN_AVAILABLE else "basic_linear",
                "using_prophet": False
            }
        }
    
    @staticmethod
    def linear_regression_forecast_basic(x: List[float], y: List[float], 
                                        future_periods: int) -> Tuple[List[float], float]:
        """Basic linear regression (last resort fallback)"""
        n = len(x)
        if n < 2:
            return [y[-1]] * future_periods if y else [0] * future_periods, 0.0
        
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return [y_mean] * future_periods, 0.0
        
        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        
        # R-squared
        y_pred = [slope * x[i] + intercept for i in range(n)]
        ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
        ss_tot = sum((y[i] - y_mean) ** 2 for i in range(n))
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Predictions
        predictions = []
        for i in range(future_periods):
            future_x = n + i
            pred = slope * future_x + intercept
            predictions.append(max(0, pred))
        
        return predictions, r_squared
    
    # ... [REST OF YOUR EXISTING METHODS - keep all the other methods unchanged] ...
    
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
            X = np.array(x).reshape(-1, 1)
            y = np.array(data)
            
            model = LinearRegression()
            model.fit(X, y)
            
            slope = float(model.coef_[0])
            r_squared = r2_score(y, model.predict(X))
            y_mean = np.mean(y)
        else:
            x_mean = sum(x) / len(x)
            y_mean = sum(data) / len(data)
            
            numerator = sum((x[i] - x_mean) * (data[i] - y_mean) for i in range(len(data)))
            denominator = sum((x[i] - x_mean) ** 2 for i in range(len(data)))
            
            if denominator == 0:
                return {"trend": "stable", "strength": 0, "confidence": 0}
            
            slope = numerator / denominator
            
            y_pred = [slope * x[i] + (y_mean - slope * x_mean) for i in range(len(data))]
            ss_res = sum((data[i] - y_pred[i]) ** 2 for i in range(len(data)))
            ss_tot = sum((data[i] - y_mean) ** 2 for i in range(len(data)))
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        threshold = y_mean * 0.01
        
        if slope > threshold:
            trend = "upward"
        elif slope < -threshold:
            trend = "downward"
        else:
            trend = "stable"
        
        strength = min(abs(slope / y_mean) * 100, 100) if y_mean != 0 else 0
        
        return {
            "trend": trend,
            "strength": round(strength, 2),
            "slope": round(slope, 2),
            "confidence": round(r_squared * 100, 2)
        }
    
    @staticmethod
    def calculate_seasonality(data: List[Dict], period: int = 7) -> Dict:
        """Detect seasonal patterns"""
        if len(data) < period * 2:
            return {"has_seasonality": False, "pattern": {}}
        
        period_data = defaultdict(list)
        for item in data:
            if isinstance(item["date"], str):
                date_obj = datetime.strptime(item["date"], "%Y-%m-%d").date()
            else:
                date_obj = item["date"]
            
            day_of_week = date_obj.weekday()
            value = item.get("value") or item.get("revenue", 0)
            period_data[day_of_week].append(float(value))
        
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
        """Calculate when to reorder inventory"""
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
    def generate_insights(sales_data: List[Dict], inventory_data: List[Dict],
                         product_data: List[Dict]) -> List[Dict]:
        """Generate actionable business insights"""
        insights = []
        
        if len(sales_data) >= 7:
            revenues = [s["revenue"] for s in sales_data]
            trend_info = AnalyticsEngine.detect_trend(revenues)
            
            if trend_info["trend"] == "upward" and trend_info["strength"] > 10:
                insights.append({
                    "type": "positive",
                    "category": "revenue",
                    "title": "Strong Revenue Growth",
                    "message": f"Revenue is trending upward with {trend_info['strength']:.1f}% strength ({trend_info['confidence']:.0f}% confidence).",
                    "priority": "high",
                    "confidence": trend_info["confidence"]
                })
            elif trend_info["trend"] == "downward" and trend_info["strength"] > 10:
                insights.append({
                    "type": "warning",
                    "category": "revenue",
                    "title": "Revenue Declining",
                    "message": f"Revenue shows a downward trend ({trend_info['confidence']:.0f}% confidence). Consider promotions.",
                    "priority": "high",
                    "confidence": trend_info["confidence"]
                })
        
        if len(product_data) > 0:
            sorted_products = sorted(product_data, key=lambda x: x.get("revenue", 0), reverse=True)
            if sorted_products:
                top_product = sorted_products[0]
                insights.append({
                    "type": "info",
                    "category": "product",
                    "title": f"Top Performer: {top_product['name']}",
                    "message": f"Generated ₹{top_product['revenue']:,.0f} in revenue.",
                    "priority": "medium"
                })
        
        if len(sales_data) >= 14:
            seasonality = AnalyticsEngine.calculate_seasonality(sales_data)
            if seasonality["has_seasonality"] and seasonality["best_day"]:
                insights.append({
                    "type": "info",
                    "category": "sales",
                    "title": f"Peak Sales Day: {seasonality['best_day']}",
                    "message": f"Sales are consistently higher on {seasonality['best_day']}.",
                    "priority": "medium"
                })
        
        return insights
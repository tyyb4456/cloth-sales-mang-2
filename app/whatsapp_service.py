# app/whatsapp_service.py
import httpx
import os
from typing import Optional
from datetime import datetime

class WhatsAppService:
    """WhatsApp integration service - supports multiple backends"""
    
    def __init__(self):
        # Will use Twilio in production, local server for dev
        self.backend = os.getenv("WHATSAPP_BACKEND", "local")  # local | twilio
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER")
        self.local_api_url = os.getenv("WHATSAPP_LOCAL_API", "http://localhost:3000")
    
    async def send_message(self, to: str, message: str) -> bool:
        """
        Send WhatsApp message
        to: Phone number with country code (e.g., +923001234567)
        """
        try:
            if self.backend == "twilio":
                return await self._send_via_twilio(to, message)
            else:
                return await self._send_via_local(to, message)
        except Exception as e:
            print(f"WhatsApp send failed: {e}")
            return False
    
    async def send_invoice(self, to: str, invoice_data: dict) -> bool:
        """Send formatted invoice via WhatsApp"""
        message = self._format_invoice(invoice_data)
        return await self.send_message(to, message)
    
    async def send_payment_reminder(self, to: str, customer_name: str, 
                                   amount_due: float, due_date: str) -> bool:
        """Send payment reminder"""
        message = f"""
🔔 *Payment Reminder*

Dear {customer_name},

This is a friendly reminder that you have a pending payment:

Amount Due: Rs. {amount_due:,.2f}
Due Date: {due_date}

Please make the payment at your earliest convenience.

Thank you for your business! 🙏

_This is an automated message_
        """.strip()
        
        return await self.send_message(to, message)
    
    async def send_daily_summary(self, to: str, summary_data: dict) -> bool:
        """Send daily sales summary"""
        message = f"""
*Daily Sales Summary - {summary_data['date']}*

Total Sales: Rs. {summary_data['total_sales']:,.2f}
Transactions: {summary_data['transaction_count']}
Profit: Rs. {summary_data['profit']:,.2f}
Pending Loans: Rs. {summary_data['pending_loans']:,.2f}

Top Product: {summary_data['top_product']}

_Sent automatically at 10 PM_
        """.strip()
        
        return await self.send_message(to, message)
    
    async def send_low_stock_alert(self, to: str, product_name: str, 
                                   current_stock: float, min_stock: float) -> bool:
        """Send low stock alert"""
        message = f"""
*Low Stock Alert*

Product: {product_name}
Current Stock: {current_stock}
Minimum Level: {min_stock}

Please reorder soon!

_Automated Stock Alert_
        """.strip()
        
        return await self.send_message(to, message)
    
    def _format_invoice(self, invoice_data: dict) -> str:
        """Format invoice message"""
        items = invoice_data.get('items', [])
        items_text = "\n".join([
            f"  • {item['name']} - {item['quantity']} x Rs. {item['price']:,.2f}"
            for item in items
        ])
        
        message = f"""
*Invoice #{invoice_data['invoice_number']}*

Date: {invoice_data['date']}
Customer: {invoice_data['customer_name']}

*Items:*
{items_text}

━━━━━━━━━━━━━━━━
Subtotal: Rs. {invoice_data['subtotal']:,.2f}
Discount: Rs. {invoice_data.get('discount', 0):,.2f}
*Total: Rs. {invoice_data['total']:,.2f}*

Thank you for your business! 🙏

{invoice_data.get('business_name', 'Your Shop')}
{invoice_data.get('business_phone', '')}
        """.strip()
        
        return message
    
    async def _send_via_local(self, to: str, message: str) -> bool:
        """Send via local WhatsApp Web API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.local_api_url}/send-message",
                    json={
                        "phone": to.replace("+", ""),
                        "message": message
                    }
                )
                return response.status_code == 200
        except Exception as e:
            print(f"❌ Local API error: {e}")
            return False
    
    async def _send_via_twilio(self, to: str, message: str) -> bool:
        """Send via Twilio WhatsApp API"""
        try:
            from twilio.rest import Client
            
            client = Client(self.twilio_account_sid, self.twilio_auth_token)
            
            message = client.messages.create(
                body=message,
                from_=f"whatsapp:{self.twilio_whatsapp_number}",
                to=f"whatsapp:{to}"
            )
            
            return message.sid is not None
        except Exception as e:
            print(f"Twilio error: {e}")
            return False


# Global instance
whatsapp_service = WhatsAppService()
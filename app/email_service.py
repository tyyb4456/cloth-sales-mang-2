# app/email_service.py - Email Verification Service

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Email Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")  # Your email
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")  # App password
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "ShopSmart")

# Application URL for verification links
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


class EmailService:
    """Service for sending transactional emails"""
    
    @staticmethod
    def _send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None):
        """
        Internal method to send emails via SMTP
        """
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print("⚠️ WARNING: SMTP credentials not configured. Email not sent.")
            print(f"Email would be sent to: {to_email}")
            print(f"Subject: {subject}")
            return False
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
            message['To'] = to_email
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                message.attach(text_part)
            
            html_part = MIMEText(html_content, 'html')
            message.attach(html_part)
            
            # Send email
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
            
            print(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_verification_email(email: str, full_name: str, verification_token: str):
        """
        Send email verification link to new user
        """
        verification_link = f"{APP_URL}/verify-email?token={verification_token}"
        
        subject = "Verify Your ShopSmart Account"
        
        # Plain text version
        text_content = f"""
Hello {full_name},

Welcome to ShopSmart! Please verify your email address to activate your account.

Click the link below to verify:
{verification_link}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
The ShopSmart Team
        """
        
        # HTML version (beautiful email)
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 0; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🏪 ShopSmart
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                Welcome, {full_name}! 👋
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Thank you for signing up for ShopSmart! We're excited to have you on board.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                To get started, please verify your email address by clicking the button below:
                            </p>
                            
                            <!-- Verification Button -->
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #1f2937 0%, #374151 100%);">
                                        <a href="{verification_link}" 
                                           style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; font-size: 14px; line-height: 1.6; border-radius: 4px;">
                                ⚠️ This verification link will expire in <strong>24 hours</strong>.
                            </p>
                            
                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link in your browser:<br>
                                <a href="{verification_link}" style="color: #3b82f6; text-decoration: none; word-break: break-all;">
                                    {verification_link}
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                If you didn't create this account, you can safely ignore this email.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2025 ShopSmart. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, html_content, text_content)
    
    @staticmethod
    def send_password_reset_email(email: str, full_name: str, reset_token: str):
        """
        Send password reset link to user
        """
        reset_link = f"{APP_URL}/reset-password?token={reset_token}"
        
        subject = "Reset Your ShopSmart Password"
        
        text_content = f"""
Hello {full_name},

We received a request to reset your password for your ShopSmart account.

Click the link below to reset your password:
{reset_link}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
The ShopSmart Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 0; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🔒 Password Reset
                            </h1>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                Hello, {full_name}
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                We received a request to reset the password for your ShopSmart account.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Click the button below to choose a new password:
                            </p>
                            
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
                                        <a href="{reset_link}" 
                                           style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; font-size: 14px; line-height: 1.6; border-radius: 4px;">
                                ⚠️ This password reset link will expire in <strong>1 hour</strong>.
                            </p>
                            
                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link in your browser:<br>
                                <a href="{reset_link}" style="color: #3b82f6; text-decoration: none; word-break: break-all;">
                                    {reset_link}
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                                ⚠️ Security Notice
                            </p>
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2025 ShopSmart. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, html_content, text_content)
    
    @staticmethod
    def send_welcome_email(email: str, full_name: str, business_name: str):
        """
        Send welcome email after successful verification
        """
        subject = f"Welcome to ShopSmart, {full_name}!"
        
        text_content = f"""
Hello {full_name},

Your email has been verified successfully! Welcome to ShopSmart.

Business Name: {business_name}

You now have full access to all features:
• Track inventory
• Record sales
• Manage suppliers
• View analytics
• And much more!

Get started by logging in to your dashboard.

Need help? Check out our documentation or contact support.

Best regards,
The ShopSmart Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ShopSmart</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 0; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🎉 Welcome to ShopSmart!
                            </h1>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                Hello, {full_name}! ✨
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Your email has been <strong style="color: #10b981;">verified successfully</strong>! You're all set to start managing your business.
                            </p>
                            
                            <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                                <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
                                    Business: {business_name}
                                </p>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                    7-Day Free Trial Active
                                </p>
                            </div>
                            
                            <h3 style="margin: 30px 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                                What you can do now:
                            </h3>
                            
                            <table role="presentation" style="width: 100%; margin: 0 0 30px 0;">
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                                        <span style="color: #4b5563; font-size: 15px;">Track inventory in real-time</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                                        <span style="color: #4b5563; font-size: 15px;">Record and manage sales</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                                        <span style="color: #4b5563; font-size: 15px;">Manage supplier relationships</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                                        <span style="color: #4b5563; font-size: 15px;">View analytics & reports</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #1f2937 0%, #374151 100%);">
                                        <a href="{APP_URL}/dashboard" 
                                           style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                                            Go to Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                Need help getting started? Check out our <a href="#" style="color: #3b82f6; text-decoration: none;">Documentation</a>
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2025 ShopSmart. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, html_content, text_content)
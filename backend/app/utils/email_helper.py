import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from dotenv import load_dotenv

# Ensure environment variables are loaded
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=env_path)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@gitechnology.in")

# Common HTML layout wrapper
def get_base_html_template(title: str, content: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
        .wrapper {{
            width: 100%;
            background-color: #f4f6f9;
            padding: 40px 0;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            border: 1px solid #e1e8ed;
        }}
        .header {{
            background-color: #00478F;
            padding: 30px 40px;
            text-align: left;
            border-bottom: 3px solid #003366;
        }}
        .logo-text {{
            color: #ffffff;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 1px;
            margin: 0;
            display: inline-block;
        }}
        .logo-sub {{
            color: #93c5fd;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-top: 4px;
        }}
        .content {{
            padding: 40px;
            color: #334155;
            line-height: 1.6;
        }}
        h2 {{
            color: #0f172a;
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 20px;
        }}
        p {{
            font-size: 15px;
            margin-top: 0;
            margin-bottom: 16px;
            color: #475569;
        }}
        .highlight-box {{
            background-color: #f8fafc;
            border-left: 4px solid #00478F;
            padding: 20px;
            border-radius: 0 8px 8px 0;
            margin: 24px 0;
        }}
        .btn {{
            display: inline-block;
            background-color: #00478F;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            font-size: 15px;
            font-weight: 600;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,71,143,0.2);
        }}
        .btn:hover {{
            background-color: #003366;
        }}
        .footer {{
            background-color: #f8fafc;
            padding: 24px 40px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
        }}
        .footer p {{
            font-size: 12px;
            color: #94a3b8;
            margin: 4px 0;
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="logo-text">GI TECHNOLOGY</div>
                <div class="logo-sub">FASTAG PORTAL</div>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} GI Technology. All rights reserved.</p>
                <p>This is an automated operational email, please do not reply directly.</p>
                <p>Support: support@gitechnology.in | Toll-free: 1800-102-1234</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

def handle_email_dispatch(to_email: str, subject: str, html_body: str) -> bool:
    """
    Centralized email sender supporting real SMTP and Dev/Simulation fallback.
    """
    # 1. Determine if real SMTP credentials are fully provided
    smtp_enabled = all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD])
    
    if smtp_enabled:
        try:
            # Setup MIME message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = SMTP_FROM
            msg['To'] = to_email
            
            # Attach html content
            part = MIMEText(html_body, 'html')
            msg.attach(part)
            
            # Connect to SMTP
            server = smtplib.SMTP(SMTP_HOST, int(SMTP_PORT))
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
            server.quit()
            print(f"SMTP: Successfully sent email '{subject}' to {to_email}")
            return True
        except Exception as e:
            print(f"SMTP Error: Failed to send email via SMTP, falling back to Dev Mode. Error: {e}")
            # Do not raise exception, fall back to dev mode instead.

    # 2. Dev / Simulation Mode Fallback
    try:
        # Determine logs path relative to backend root
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        logs_dir = os.path.join(backend_dir, "logs", "emails")
        os.makedirs(logs_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        sanitized_subject = "".join([c if c.isalnum() else "_" for c in subject])
        filename = f"{timestamp}_{to_email}_{sanitized_subject}.html"
        file_path = os.path.join(logs_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_body)
            
        print("\n" + "="*80)
        print(f"[DEV MODE] SIMULATED EMAIL SENT")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Saved to file: {file_path}")
        print("="*80 + "\n")
        return True
    except Exception as e:
        print(f"Dev Mode Save Error: Failed to write simulated email to disk. Error: {e}")
        return False


def send_low_balance_email(to_email: str, full_name: str, balance: float, threshold: float) -> bool:
    """
    Sends low balance alert email warning user about tag status degradation.
    """
    subject = "Low Balance Alert - GI Technology FASTag"
    content = f"""
    <h2>Low Wallet Balance Warning</h2>
    <p>Dear {full_name},</p>
    <p>This is an automated alert from GI Technology to inform you that your FASTag wallet balance has dropped below your configured threshold.</p>
    
    <div class="highlight-box">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #00478F;">
            Current Balance: ₹{balance:.2f}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">
            Configured Alert Threshold: ₹{threshold:.2f}
        </p>
    </div>
    
    <p><strong>Important Warning:</strong> If your wallet balance drops too low, your registered vehicle FASTags will automatically transition to <strong>INACTIVE</strong> status. To avoid toll gate delays, blacklisting, or double-charge penalties, please recharge your wallet immediately.</p>
    
    <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard" class="btn">Recharge Wallet Now</a>
    </div>
    
    <p>Thank you for using GI Technology FASTag services.</p>
    """
    html_body = get_base_html_template(subject, content)
    return handle_email_dispatch(to_email, subject, html_body)


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    """
    Sends password reset email containing secure validation link.
    """
    subject = "Password Reset Request - GI Technology FASTag"
    content = f"""
    <h2>Password Reset Request</h2>
    <p>Dear {full_name},</p>
    <p>We received a request to reset the password for your GI Technology FASTag account. Click the button below to set up a new password.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" class="btn">Reset Password</a>
    </div>
    
    <div class="highlight-box" style="background-color: #fff9db; border-left-color: #f59f00;">
        <p style="margin: 0; font-size: 14px; color: #664d03;">
            <strong>Security Warning:</strong> This link is secure and will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email or contact support immediately.
        </p>
    </div>
    
    <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
    <p style="font-size: 13px; font-family: monospace; word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">
        {reset_link}
    </p>
    """
    html_body = get_base_html_template(subject, content)
    return handle_email_dispatch(to_email, subject, html_body)


def send_ticket_created_email(to_email: str, full_name: str, ticket_id: int, subject: str, category: str) -> bool:
    """
    Sends confirmation email when a support ticket is created.
    """
    email_subject = "Support Ticket Created - GI Technology FASTag"
    content = f"""
    <h2>Support Ticket Created</h2>
    <p>Dear {full_name},</p>
    <p>Your support ticket has been successfully created. Our operations team will review it and respond as soon as possible.</p>
    
    <div class="highlight-box">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Ticket Reference</p>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #00478F;">
            #{ticket_id}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;">
            <strong>Subject:</strong> {subject}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
            <strong>Category:</strong> {category.replace('_', ' ').title()}
        </p>
    </div>
    
    <p>You can track the status of your ticket and reply to the operations team directly from your support dashboard.</p>
    
    <div style="text-align: center;">
        <a href="http://localhost:5173/support" class="btn">View Ticket</a>
    </div>
    
    <p>Thank you for using GI Technology FASTag services.</p>
    """
    html_body = get_base_html_template(email_subject, content)
    return handle_email_dispatch(to_email, email_subject, html_body)


def send_admin_reply_email(to_email: str, full_name: str, ticket_id: int, subject: str, reply_preview: str) -> bool:
    """
    Sends notification email when admin replies to a support ticket.
    """
    email_subject = "Support Ticket Update - GI Technology FASTag"
    content = f"""
    <h2>New Reply on Your Support Ticket</h2>
    <p>Dear {full_name},</p>
    <p>Our operations team has responded to your support ticket.</p>
    
    <div class="highlight-box">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Ticket #{ticket_id}</p>
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #334155;">
            {subject}
        </p>
    </div>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Admin Response</p>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
            {reply_preview}
        </p>
    </div>
    
    <p>Please log in to your support dashboard to view the full conversation and reply.</p>
    
    <div style="text-align: center;">
        <a href="http://localhost:5173/support" class="btn">View Conversation</a>
    </div>
    """
    html_body = get_base_html_template(email_subject, content)
    return handle_email_dispatch(to_email, email_subject, html_body)


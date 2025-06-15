interface OTPEmailData {
  recipientName: string;
  otpCode: string;
  expirationMinutes: number;
  purpose: 'verification' | 'password-change' | 'account-recovery';
}

interface InviteEmailData {
  recipientName: string;
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
  expirationDays: number;
}

// Base email styles matching SmartHub's dark theme
const baseStyles = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #f9fafb;
      background-color: #111827;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1f2937;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    
    .header {
      background: linear-gradient(135deg, #14b8a6 0%, #a855f7 100%);
      padding: 32px 24px;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin-bottom: 8px;
    }
    
    .tagline {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 500;
    }
    
    .content {
      padding: 40px 32px;
    }
    
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #f9fafb;
      margin-bottom: 16px;
    }
    
    .message {
      color: #d1d5db;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .otp-container {
      background-color: #374151;
      border: 2px solid #4b5563;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 32px 0;
    }
    
    .otp-label {
      color: #9ca3af;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      color: #14b8a6;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin-bottom: 12px;
    }
    
    .otp-expiry {
      color: #fbbf24;
      font-size: 14px;
      font-weight: 500;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      transition: all 0.2s ease;
    }
    
    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(20, 184, 166, 0.3);
    }
    
    .security-notice {
      background-color: #1e293b;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      margin: 32px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .security-title {
      color: #fbbf24;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .security-text {
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .footer {
      background-color: #111827;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #374151;
    }
    
    .footer-text {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .footer-links {
      margin-top: 16px;
    }
    
    .footer-link {
      color: #14b8a6;
      text-decoration: none;
      margin: 0 12px;
      font-size: 14px;
    }
    
    .footer-link:hover {
      color: #0891b2;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0;
        border-radius: 0;
      }
      
      .content {
        padding: 24px 20px;
      }
      
      .header {
        padding: 24px 20px;
      }
      
      .otp-code {
        font-size: 28px;
        letter-spacing: 4px;
      }
      
      .button {
        display: block;
        text-align: center;
      }
    }
  </style>
`;

export function generateOTPEmail(data: OTPEmailData): string {
  const purposeText = {
    verification: 'verify your email address',
    'password-change': 'confirm your password change',
    'account-recovery': 'recover your account'
  };

  const purposeTitle = {
    verification: 'Email Verification',
    'password-change': 'Password Change Confirmation',
    'account-recovery': 'Account Recovery'
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SmartHub - ${purposeTitle[data.purpose]}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <div class="logo">SmartHub</div>
          <div class="tagline">Your Intelligent Workspace</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="greeting">Hello ${data.recipientName},</div>
          
          <div class="message">
            We received a request to ${purposeText[data.purpose]} for your SmartHub account. 
            Please use the verification code below to complete this process.
          </div>
          
          <!-- OTP Container -->
          <div class="otp-container">
            <div class="otp-label">Verification Code</div>
            <div class="otp-code">${data.otpCode}</div>
            <div class="otp-expiry">Expires in ${data.expirationMinutes} minutes</div>
          </div>
          
          <div class="message">
            Enter this code in the verification page to continue. If you didn't request this, 
            please ignore this email or contact our support team.
          </div>
          
          <!-- Security Notice -->
          <div class="security-notice">
            <div class="security-title">🔒 Security Notice</div>
            <div class="security-text">
              • Never share this code with anyone<br>
              • SmartHub will never ask for this code via phone or email<br>
              • This code expires in ${data.expirationMinutes} minutes<br>
              • If you didn't request this, please secure your account immediately
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">
            This email was sent by SmartHub. If you have any questions, please contact our support team.
          </div>
          <div class="footer-links">
            <a href="#" class="footer-link">Support</a>
            <a href="#" class="footer-link">Privacy Policy</a>
            <a href="#" class="footer-link">Terms of Service</a>
          </div>
          <div class="footer-text" style="margin-top: 16px; font-size: 12px;">
            © ${new Date().getFullYear()} SmartHub. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateInviteEmail(data: InviteEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SmartHub - Team Invitation</title>
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <div class="logo">SmartHub</div>
          <div class="tagline">Your Intelligent Workspace</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="greeting">Hello ${data.recipientName},</div>
          
          <div class="message">
            <strong>${data.inviterName}</strong> has invited you to join the 
            <strong>${data.workspaceName}</strong> workspace on SmartHub. 
            Join your team and start collaborating with powerful productivity tools.
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.inviteLink}" class="button">Accept Invitation</a>
          </div>
          
          <div class="message">
            This invitation will expire in ${data.expirationDays} days. 
            Click the button above to create your account and join the workspace.
          </div>
          
          <!-- Features Highlight -->
          <div style="background-color: #374151; border-radius: 8px; padding: 24px; margin: 32px 0;">
            <div style="color: #14b8a6; font-weight: 600; margin-bottom: 16px; text-align: center;">
              🚀 What you'll get with SmartHub:
            </div>
            <div style="color: #d1d5db; font-size: 14px; line-height: 1.8;">
              ✅ AI-powered task management and enhancement<br>
              ✅ Real-time team collaboration and chat<br>
              ✅ Video meetings with automatic summaries<br>
              ✅ Smart note-taking and organization<br>
              ✅ Attendance tracking and analytics<br>
              ✅ Seamless team productivity workflows
            </div>
          </div>
          
          <!-- Security Notice -->
          <div class="security-notice">
            <div class="security-title">🔒 Security Notice</div>
            <div class="security-text">
              This invitation link is unique to your email address and expires in ${data.expirationDays} days. 
              If you didn't expect this invitation, please ignore this email.
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">
            This invitation was sent by ${data.inviterName} via SmartHub.
          </div>
          <div class="footer-links">
            <a href="#" class="footer-link">Support</a>
            <a href="#" class="footer-link">Privacy Policy</a>
            <a href="#" class="footer-link">Terms of Service</a>
          </div>
          <div class="footer-text" style="margin-top: 16px; font-size: 12px;">
            © ${new Date().getFullYear()} SmartHub. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

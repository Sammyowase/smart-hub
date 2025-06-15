import nodemailer from 'nodemailer';
import { generateOTPEmail, generateInviteEmail } from './email-templates';

// Email configuration with validation and debugging
const createEmailTransporter = () => {
  // Force reload environment variables
  const host = process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_SERVER_PORT || '587');
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  // Critical validation - prevent localhost usage
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    console.error('🚨 CRITICAL: EMAIL_SERVER_HOST is set to localhost!');
    console.error('This will cause "localhost says..." messages in responses');
    console.error('Please set EMAIL_SERVER_HOST to smtp.gmail.com or another SMTP server');
    throw new Error('Email service configured with localhost - please use proper SMTP server');
  }

  // Clean password (remove spaces if any)
  const cleanPassword = pass ? pass.replace(/\s/g, '') : undefined;

  const config = {
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass: cleanPassword,
    },
    // Add timeout and retry settings
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 15000, // 15 seconds
    socketTimeout: 30000, // 30 seconds
  };

  console.log('🔧 Email transporter configuration:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? `${config.auth.user.substring(0, 3)}***@${config.auth.user.split('@')[1]}` : 'missing',
    pass: config.auth.pass ? `***${config.auth.pass.length} chars***` : 'missing',
    passwordHasSpaces: pass ? pass.includes(' ') : false,
    cleanPasswordLength: cleanPassword ? cleanPassword.length : 0
  });

  // Validate required fields
  if (!user || !cleanPassword) {
    console.error('🚨 Missing email credentials:', {
      user: !!user,
      password: !!cleanPassword
    });
    throw new Error('Email credentials not properly configured');
  }

  return nodemailer.createTransport(config);
};

let transporter = createEmailTransporter();

// Function to recreate transporter (useful after config changes)
export function recreateEmailTransporter() {
  console.log('🔄 Recreating email transporter with current environment variables...');
  try {
    transporter = createEmailTransporter();
    console.log('✅ Email transporter recreated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to recreate email transporter:', error);
    return { success: false, error: error.message };
  }
}

// Email service verification
export async function verifyEmailService(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    console.log('Verifying email service connection...');

    // Check if required environment variables are set
    const requiredVars = ['EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return {
        success: false,
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        details: { missingVars }
      };
    }

    // Check for localhost configuration (common issue)
    const host = process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return {
        success: false,
        error: 'Email service is configured to use localhost. Please configure a proper SMTP server (e.g., Gmail, Outlook).',
        details: {
          currentHost: host,
          suggestion: 'Set EMAIL_SERVER_HOST to smtp.gmail.com for Gmail or smtp-mail.outlook.com for Outlook'
        }
      };
    }

    // Verify SMTP connection with timeout
    const verified = await Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP verification timeout after 30 seconds')), 30000)
      )
    ]);

    if (verified) {
      console.log('✅ Email service connection verified successfully');
      return {
        success: true,
        details: {
          host: process.env.EMAIL_SERVER_HOST,
          port: process.env.EMAIL_SERVER_PORT,
          user: process.env.EMAIL_SERVER_USER,
          secure: process.env.EMAIL_SERVER_PORT === '465'
        }
      };
    } else {
      return {
        success: false,
        error: 'SMTP connection verification failed'
      };
    }
  } catch (error: any) {
    console.error('❌ Email service verification failed:', error);

    // Provide specific error messages for common issues
    let userFriendlyError = error.message || 'Unknown email service error';

    if (error.code === 'EAUTH') {
      userFriendlyError = 'Email authentication failed. Please check your email and password/app password.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      userFriendlyError = 'Cannot connect to email server. Please check your SMTP host and port settings.';
    } else if (error.code === 'ESOCKET') {
      userFriendlyError = 'Network connection error. Please check your internet connection and firewall settings.';
    }

    return {
      success: false,
      error: userFriendlyError,
      details: {
        code: error.code,
        command: error.command,
        response: error.response,
        originalError: error.message
      }
    };
  }
}

// Test email sending
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    console.log(`Sending test email to ${to}...`);

    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SmartHub Email Test</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #1f2937; color: #f9fafb; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #374151; border-radius: 8px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #14b8a6; font-size: 24px; font-weight: bold; }
          .success { background-color: #065f46; border: 1px solid #10b981; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SmartHub</div>
            <h2>Email Service Test</h2>
          </div>
          <div class="success">
            <h3>✅ Email Service Working!</h3>
            <p>This is a test email to verify that your SmartHub email configuration is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <p>If you received this email, your SMTP configuration is properly set up and invitation emails should work correctly.</p>
        </div>
      </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: `"SmartHub Test" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
      to,
      subject: 'SmartHub Email Service Test',
      html: testEmailHtml,
      text: `SmartHub Email Service Test\n\nThis is a test email to verify that your email configuration is working correctly.\n\nTimestamp: ${new Date().toISOString()}`
    });

    console.log(`✅ Test email sent successfully to ${to}:`, result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error: any) {
    console.error(`❌ Test email failed for ${to}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error sending test email'
    };
  }
}

// Email templates
export const emailTemplates = {
  invitation: (data: {
    inviterName: string;
    workspaceName: string;
    inviteLink: string;
    message?: string;
  }) => ({
    subject: `You're invited to join ${data.workspaceName} on SmartHub`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${data.workspaceName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; }
          .logo { color: #14b8a6; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .header-text { color: #e2e8f0; font-size: 18px; }
          .content { padding: 40px 30px; }
          .invitation-box { background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .invitation-title { color: white; font-size: 24px; font-weight: bold; margin-bottom: 15px; }
          .invitation-text { color: #e6fffa; font-size: 16px; margin-bottom: 25px; }
          .cta-button { display: inline-block; background-color: white; color: #0f172a; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; }
          .message-box { background-color: #f1f5f9; border-left: 4px solid #14b8a6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
          .footer a { color: #14b8a6; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SmartHub</div>
            <div class="header-text">Productivity & Collaboration Platform</div>
          </div>

          <div class="content">
            <h1 style="color: #1e293b; margin-bottom: 20px;">You're Invited!</h1>

            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              <strong>${data.inviterName}</strong> has invited you to join <strong>${data.workspaceName}</strong> on SmartHub.
            </p>

            ${data.message ? `
              <div class="message-box">
                <h3 style="color: #1e293b; margin-top: 0;">Personal Message:</h3>
                <p style="color: #475569; margin-bottom: 0;">${data.message}</p>
              </div>
            ` : ''}

            <div class="invitation-box">
              <div class="invitation-title">Join Your Team</div>
              <div class="invitation-text">
                Start collaborating with your team on tasks, notes, meetings, and more.
              </div>
              <a href="${data.inviteLink}" class="cta-button">Accept Invitation</a>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              SmartHub helps teams stay organized and productive with integrated task management,
              note-taking, meeting scheduling, and team collaboration tools.
            </p>
          </div>

          <div class="footer">
            <p>This invitation was sent by ${data.inviterName} from ${data.workspaceName}.</p>
            <p>If you don't want to receive these emails, you can safely ignore this message.</p>
            <p><a href="#">SmartHub</a> • Productivity Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      You're invited to join ${data.workspaceName} on SmartHub!

      ${data.inviterName} has invited you to join their workspace.

      ${data.message ? `Personal message: ${data.message}` : ''}

      Click here to accept: ${data.inviteLink}

      SmartHub helps teams stay organized and productive with integrated task management, note-taking, meeting scheduling, and team collaboration tools.
    `
  }),

  passwordReset: (data: {
    userName: string;
    otp: string;
    expiresIn: string;
  }) => ({
    subject: 'Reset Your SmartHub Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; }
          .logo { color: #14b8a6; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 40px 30px; text-align: center; }
          .otp-box { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 12px; padding: 30px; margin: 30px 0; }
          .otp-title { color: white; font-size: 20px; font-weight: bold; margin-bottom: 15px; }
          .otp-code { color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; font-family: 'Courier New', monospace; }
          .warning { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0; color: #92400e; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SmartHub</div>
          </div>

          <div class="content">
            <h1 style="color: #1e293b; margin-bottom: 20px;">Password Reset Request</h1>

            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Hi ${data.userName}, we received a request to reset your password.
            </p>

            <div class="otp-box">
              <div class="otp-title">Your Verification Code</div>
              <div class="otp-code">${data.otp}</div>
              <p style="color: #e0e7ff; font-size: 14px; margin: 0;">
                Enter this code to reset your password
              </p>
            </div>

            <div class="warning">
              <strong>Security Notice:</strong> This code expires in ${data.expiresIn}.
              If you didn't request this reset, please ignore this email.
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              For security reasons, never share this code with anyone.
            </p>
          </div>

          <div class="footer">
            <p>This email was sent from SmartHub security system.</p>
            <p>If you didn't request this, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request

      Hi ${data.userName}, we received a request to reset your password.

      Your verification code: ${data.otp}

      This code expires in ${data.expiresIn}.

      If you didn't request this reset, please ignore this email.
    `
  }),

  taskAssignment: (data: {
    assigneeName: string;
    assignerName: string;
    taskTitle: string;
    taskDescription: string;
    dueDate?: string;
    taskLink: string;
  }) => ({
    subject: `New Task Assigned: ${data.taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assignment</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; }
          .logo { color: #14b8a6; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .task-box { background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); border-radius: 12px; padding: 25px; margin: 25px 0; }
          .task-title { color: white; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
          .task-description { color: #e6fffa; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
          .task-meta { background-color: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; }
          .cta-button { display: inline-block; background-color: white; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SmartHub</div>
          </div>

          <div class="content">
            <h1 style="color: #1e293b; margin-bottom: 20px;">New Task Assignment</h1>

            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Hi ${data.assigneeName}, <strong>${data.assignerName}</strong> has assigned you a new task.
            </p>

            <div class="task-box">
              <div class="task-title">${data.taskTitle}</div>
              <div class="task-description">${data.taskDescription}</div>
              <div class="task-meta">
                <div style="color: white; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Task Details</div>
                <div style="color: #e6fffa;">
                  <strong>Assigned by:</strong> ${data.assignerName}<br>
                  ${data.dueDate ? `<strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}<br>` : ''}
                  <strong>Status:</strong> To Do
                </div>
              </div>
              <a href="${data.taskLink}" class="cta-button">View Task</a>
            </div>
          </div>

          <div class="footer">
            <p>Stay organized and productive with SmartHub.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      New Task Assignment

      Hi ${data.assigneeName}, ${data.assignerName} has assigned you a new task.

      Task: ${data.taskTitle}
      Description: ${data.taskDescription}
      ${data.dueDate ? `Due Date: ${new Date(data.dueDate).toLocaleDateString()}` : ''}

      View task: ${data.taskLink}
    `
  })
};

// Email sending functions
export async function sendEmail(to: string, template: { subject: string; html: string; text: string }) {
  try {
    const info = await transporter.sendMail({
      from: `"SmartHub" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  workspaceName: string,
  inviteToken: string,
  message?: string
) {
  const inviteLink = `${process.env.APP_URL || process.env.NEXTAUTH_URL}/invite/${inviteToken}`;
  const template = emailTemplates.invitation({
    inviterName,
    workspaceName,
    inviteLink,
    message
  });

  return sendEmail(to, template);
}

export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  otp: string
) {
  const template = emailTemplates.passwordReset({
    userName,
    otp,
    expiresIn: '10 minutes'
  });

  return sendEmail(to, template);
}

export async function sendTaskAssignmentEmail(
  to: string,
  assigneeName: string,
  assignerName: string,
  taskTitle: string,
  taskDescription: string,
  taskId: string,
  dueDate?: string
) {
  const taskLink = `${process.env.APP_URL || process.env.NEXTAUTH_URL}/dashboard/tasks?task=${taskId}`;
  const template = emailTemplates.taskAssignment({
    assigneeName,
    assignerName,
    taskTitle,
    taskDescription,
    dueDate,
    taskLink
  });

  return sendEmail(to, template);
}

// OTP Email Functions
export async function sendOTPEmail(
  to: string,
  recipientName: string,
  otpCode: string,
  purpose: 'verification' | 'password-change' | 'account-recovery' = 'verification'
) {
  try {
    const emailHtml = generateOTPEmail({
      recipientName,
      otpCode,
      expirationMinutes: 10,
      purpose
    });

    const subjectMap = {
      verification: 'Verify Your Email - SmartHub',
      'password-change': 'Confirm Password Change - SmartHub',
      'account-recovery': 'Account Recovery - SmartHub'
    };

    const result = await transporter.sendMail({
      from: `"SmartHub" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
      to,
      subject: subjectMap[purpose],
      html: emailHtml,
      text: `Your SmartHub verification code is: ${otpCode}. This code expires in 10 minutes.`
    });

    console.log(`OTP email sent to ${to} (${purpose}):`, result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error: any) {
    console.error('OTP email sending failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendEnhancedInvitationEmail(
  to: string,
  recipientName: string,
  inviterName: string,
  workspaceName: string,
  inviteToken: string
): Promise<{ success: boolean; error?: string; messageId?: string; details?: any }> {
  try {
    console.log(`Preparing to send invitation email to ${to}...`);

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        success: false,
        error: `Invalid email address format: ${to}`
      };
    }

    const inviteLink = `${process.env.APP_URL || process.env.NEXTAUTH_URL}/auth/accept-invite/${inviteToken}`;

    const emailHtml = generateInviteEmail({
      recipientName,
      inviterName,
      workspaceName,
      inviteLink,
      expirationDays: 7
    });

    console.log(`Sending invitation email to ${to} via SMTP...`);

    const result = await transporter.sendMail({
      from: `"SmartHub" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
      to,
      subject: `You're invited to join ${workspaceName} on SmartHub`,
      html: emailHtml,
      text: `${inviterName} has invited you to join ${workspaceName} on SmartHub. Click here to accept: ${inviteLink}`
    });

    // Clean up the response message to remove technical details
    const cleanMessageId = result.messageId || 'unknown';
    const successMessage = `Invitation email sent successfully to ${to}`;

    console.log(`✅ ${successMessage} (Message ID: ${cleanMessageId})`);

    return {
      success: true,
      messageId: cleanMessageId,
      details: {
        recipient: to,
        workspace: workspaceName,
        inviter: inviterName,
        sentAt: new Date().toISOString()
      }
    };

  } catch (error: any) {
    console.error(`❌ Enhanced invitation email sending failed for ${to}:`, error);

    // Provide user-friendly error messages
    let userFriendlyError = 'Failed to send invitation email';

    if (error.code === 'EAUTH') {
      userFriendlyError = 'Email authentication failed. Please check SMTP credentials.';
    } else if (error.code === 'EENVELOPE') {
      userFriendlyError = 'Invalid email address or sender configuration.';
    } else if (error.code === 'ECONNECTION') {
      userFriendlyError = 'Cannot connect to email server. Please check SMTP settings.';
    } else if (error.responseCode === 550) {
      userFriendlyError = 'Email address rejected by server. Please verify the recipient email.';
    } else if (error.message) {
      // Remove technical details from error messages
      userFriendlyError = error.message
        .replace(/localhost/gi, 'email server')
        .replace(/127\.0\.0\.1/gi, 'email server')
        .replace(/SMTP/gi, 'email service');
    }

    return {
      success: false,
      error: userFriendlyError,
      details: {
        code: error.code,
        responseCode: error.responseCode,
        originalError: error.message
      }
    };
  }
}

// Email verification helper
export async function sendEmailVerificationOTP(email: string, name: string) {
  const { createOTP } = await import('./otp');

  const otpResult = await createOTP(email, 'EMAIL_VERIFICATION');

  if (!otpResult.success || !otpResult.otp) {
    return { success: false, error: otpResult.error };
  }

  const emailResult = await sendOTPEmail(email, name, otpResult.otp, 'verification');

  if (!emailResult.success) {
    return { success: false, error: 'Failed to send verification email' };
  }

  return { success: true, messageId: emailResult.messageId };
}

// Password change verification helper
export async function sendPasswordChangeOTP(email: string, name: string) {
  const { createOTP } = await import('./otp');

  const otpResult = await createOTP(email, 'PASSWORD_CHANGE');

  if (!otpResult.success || !otpResult.otp) {
    return { success: false, error: otpResult.error };
  }

  const emailResult = await sendOTPEmail(email, name, otpResult.otp, 'password-change');

  if (!emailResult.success) {
    return { success: false, error: 'Failed to send password change verification email' };
  }

  return { success: true, messageId: emailResult.messageId };
}
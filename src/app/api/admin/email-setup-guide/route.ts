import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest) {
  try {
    const setupGuide = {
      timestamp: new Date().toISOString(),
      title: "📧 SmartHub Email Configuration Guide",

      overview: {
        purpose: "Configure SMTP email service for SmartHub invitation system",
        requirements: [
          "SMTP server access (Gmail, Outlook, or custom SMTP)",
          "Email credentials (username and password/app password)",
          "Environment variables configuration"
        ]
      },

      environmentVariables: {
        required: {
          EMAIL_SERVER_HOST: {
            description: "SMTP server hostname",
            examples: [
              "smtp.gmail.com (for Gmail)",
              "smtp-mail.outlook.com (for Outlook)",
              "smtp.your-domain.com (for custom SMTP)"
            ]
          },
          EMAIL_SERVER_PORT: {
            description: "SMTP server port",
            examples: [
              "587 (TLS - recommended)",
              "465 (SSL)",
              "25 (unsecured - not recommended)"
            ]
          },
          EMAIL_SERVER_USER: {
            description: "Your email address for authentication",
            examples: [
              "your-email@gmail.com",
              "admin@your-company.com"
            ]
          },
          EMAIL_SERVER_PASSWORD: {
            description: "Email password or app-specific password",
            note: "For Gmail, use App Password instead of regular password"
          }
        },
        optional: {
          EMAIL_FROM: {
            description: "Display name for sent emails",
            default: "Uses EMAIL_SERVER_USER if not set",
            example: "SmartHub <noreply@your-company.com>"
          }
        }
      },

      providerSetup: {
        gmail: {
          title: "Gmail Configuration",
          steps: [
            "1. Enable 2-Factor Authentication on your Google account",
            "2. Go to Google Account settings > Security > App passwords",
            "3. Generate an app password for 'Mail'",
            "4. Use the generated 16-character password (not your regular password)"
          ],
          environmentVariables: {
            EMAIL_SERVER_HOST: "smtp.gmail.com",
            EMAIL_SERVER_PORT: "587",
            EMAIL_SERVER_USER: "your-email@gmail.com",
            EMAIL_SERVER_PASSWORD: "your-16-char-app-password"
          }
        },
        outlook: {
          title: "Outlook/Hotmail Configuration",
          steps: [
            "1. Enable 2-Factor Authentication",
            "2. Go to Security settings > App passwords",
            "3. Generate an app password",
            "4. Use the generated password"
          ],
          environmentVariables: {
            EMAIL_SERVER_HOST: "smtp-mail.outlook.com",
            EMAIL_SERVER_PORT: "587",
            EMAIL_SERVER_USER: "your-email@outlook.com",
            EMAIL_SERVER_PASSWORD: "your-app-password"
          }
        },
        custom: {
          title: "Custom SMTP Server",
          steps: [
            "1. Get SMTP settings from your email provider",
            "2. Ensure SMTP is enabled for your account",
            "3. Use appropriate authentication method",
            "4. Test connection before deploying"
          ],
          environmentVariables: {
            EMAIL_SERVER_HOST: "smtp.your-provider.com",
            EMAIL_SERVER_PORT: "587 or 465",
            EMAIL_SERVER_USER: "your-email@domain.com",
            EMAIL_SERVER_PASSWORD: "your-password"
          }
        }
      },

      setupInstructions: {
        development: [
          "1. Create a .env.local file in your project root",
          "2. Add the email configuration variables:",
          "   EMAIL_SERVER_HOST=smtp.gmail.com",
          "   EMAIL_SERVER_PORT=587",
          "   EMAIL_SERVER_USER=your-email@gmail.com",
          "   EMAIL_SERVER_PASSWORD=your-app-password",
          "3. Restart your development server",
          "4. Test email configuration using /api/admin/test-email"
        ],
        production: [
          "1. Set environment variables in your hosting platform",
          "2. Ensure variables are properly configured in deployment",
          "3. Test email service after deployment",
          "4. Monitor email delivery logs"
        ]
      },

      troubleshooting: {
        commonIssues: [
          {
            issue: "Authentication failed",
            solutions: [
              "Verify email and password are correct",
              "Use app password instead of regular password",
              "Check if 2FA is enabled and configured properly",
              "Ensure SMTP is enabled for your email account"
            ]
          },
          {
            issue: "Connection timeout",
            solutions: [
              "Check SMTP server hostname and port",
              "Verify firewall settings allow SMTP connections",
              "Try different port (587 vs 465)",
              "Check if your hosting provider blocks SMTP"
            ]
          },
          {
            issue: "Emails not being delivered",
            solutions: [
              "Check spam/junk folders",
              "Verify sender reputation",
              "Ensure proper SPF/DKIM records if using custom domain",
              "Monitor email service logs for delivery status"
            ]
          }
        ]
      },

      testing: {
        steps: [
          "1. Configure environment variables",
          "2. Restart application",
          "3. Access /api/admin/test-email (GET) for diagnostic",
          "4. Send test email using /api/admin/test-email (POST)",
          "5. Check email delivery and logs",
          "6. Test invitation system with real email addresses"
        ],
        endpoints: {
          diagnostic: "GET /api/admin/test-email",
          sendTest: "POST /api/admin/test-email",
          inviteTest: "POST /api/team/invite"
        }
      },

      security: {
        bestPractices: [
          "Use app passwords instead of regular passwords",
          "Enable 2-Factor Authentication on email accounts",
          "Rotate email passwords regularly",
          "Monitor email sending logs for suspicious activity",
          "Use environment variables, never hardcode credentials",
          "Limit email sending rate to prevent abuse"
        ]
      },

      nextSteps: [
        "1. Choose your email provider (Gmail recommended for testing)",
        "2. Set up app password or SMTP credentials",
        "3. Configure environment variables",
        "4. Test email service using provided endpoints",
        "5. Send test invitations to verify complete flow",
        "6. Monitor email delivery and user feedback"
      ]
    };

    return NextResponse.json(setupGuide);

  } catch (error) {
    console.error("❌ Email setup guide error:", error);
    return NextResponse.json({
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

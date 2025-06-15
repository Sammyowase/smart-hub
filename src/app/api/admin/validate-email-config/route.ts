import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    console.log("=== EMAIL CONFIGURATION VALIDATION ===");

    const validation = {
      timestamp: new Date().toISOString(),
      status: "🔧 EMAIL CONFIGURATION VALIDATION",
      
      environmentVariables: {
        EMAIL_SERVER_HOST: {
          value: process.env.EMAIL_SERVER_HOST || 'not set',
          isSet: !!process.env.EMAIL_SERVER_HOST,
          isValid: !!(process.env.EMAIL_SERVER_HOST && !process.env.EMAIL_SERVER_HOST.includes('localhost')),
          recommendation: process.env.EMAIL_SERVER_HOST?.includes('localhost') 
            ? 'Change from localhost to a real SMTP server (e.g., smtp.gmail.com)'
            : process.env.EMAIL_SERVER_HOST 
            ? 'OK' 
            : 'Set to smtp.gmail.com for Gmail or smtp-mail.outlook.com for Outlook'
        },
        EMAIL_SERVER_PORT: {
          value: process.env.EMAIL_SERVER_PORT || 'not set',
          isSet: !!process.env.EMAIL_SERVER_PORT,
          isValid: ['587', '465', '25'].includes(process.env.EMAIL_SERVER_PORT || ''),
          recommendation: process.env.EMAIL_SERVER_PORT 
            ? (['587', '465', '25'].includes(process.env.EMAIL_SERVER_PORT) ? 'OK' : 'Use 587 for TLS or 465 for SSL')
            : 'Set to 587 for TLS (recommended) or 465 for SSL'
        },
        EMAIL_SERVER_USER: {
          value: process.env.EMAIL_SERVER_USER ? '***configured***' : 'not set',
          isSet: !!process.env.EMAIL_SERVER_USER,
          isValid: !!(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_USER.includes('@')),
          recommendation: process.env.EMAIL_SERVER_USER?.includes('@') 
            ? 'OK' 
            : 'Set to your full email address (e.g., your-email@gmail.com)'
        },
        EMAIL_SERVER_PASSWORD: {
          value: process.env.EMAIL_SERVER_PASSWORD ? '***configured***' : 'not set',
          isSet: !!process.env.EMAIL_SERVER_PASSWORD,
          isValid: !!(process.env.EMAIL_SERVER_PASSWORD && process.env.EMAIL_SERVER_PASSWORD.length >= 8),
          recommendation: process.env.EMAIL_SERVER_PASSWORD 
            ? (process.env.EMAIL_SERVER_PASSWORD.length >= 16 
              ? 'OK (appears to be app password)' 
              : 'For Gmail, use 16-character app password instead of regular password')
            : 'Set to your email password or app password'
        },
        EMAIL_FROM: {
          value: process.env.EMAIL_FROM || 'not set (will use EMAIL_SERVER_USER)',
          isSet: !!process.env.EMAIL_FROM,
          isValid: true, // Optional field
          recommendation: 'Optional - can set to customize sender display name'
        }
      },

      configurationIssues: [],
      recommendations: [],
      nextSteps: []
    };

    // Analyze configuration issues
    Object.entries(validation.environmentVariables).forEach(([key, config]) => {
      if (!config.isSet && key !== 'EMAIL_FROM') {
        validation.configurationIssues.push(`${key} is not set`);
        validation.recommendations.push(`Set ${key}: ${config.recommendation}`);
      } else if (!config.isValid) {
        validation.configurationIssues.push(`${key} has invalid value`);
        validation.recommendations.push(`Fix ${key}: ${config.recommendation}`);
      }
    });

    // Specific issue detection
    if (process.env.EMAIL_SERVER_HOST?.includes('localhost')) {
      validation.configurationIssues.push('Email service configured to use localhost');
      validation.recommendations.push('This is why you see "localhost says..." messages');
      validation.recommendations.push('Change EMAIL_SERVER_HOST to a real SMTP server');
    }

    if (process.env.EMAIL_SERVER_PASSWORD && process.env.EMAIL_SERVER_PASSWORD.length < 16 && 
        process.env.EMAIL_SERVER_HOST?.includes('gmail')) {
      validation.configurationIssues.push('Gmail requires app password, not regular password');
      validation.recommendations.push('Generate 16-character app password in Google Account settings');
    }

    // Generate next steps
    if (validation.configurationIssues.length === 0) {
      validation.nextSteps = [
        '✅ Configuration looks good',
        'Test email service: GET /api/admin/test-email',
        'Send test email: POST /api/admin/test-email',
        'Try sending invitations'
      ];
    } else {
      validation.nextSteps = [
        '1. Fix the configuration issues listed above',
        '2. Update your .env.local file with correct values',
        '3. Restart your development server',
        '4. Test again with GET /api/admin/test-email'
      ];
    }

    // Overall status
    validation.status = validation.configurationIssues.length === 0 
      ? "✅ EMAIL CONFIGURATION VALID" 
      : "❌ EMAIL CONFIGURATION ISSUES DETECTED";

    return NextResponse.json(validation);

  } catch (error) {
    console.error("❌ Email configuration validation error:", error);
    return NextResponse.json({
      status: "❌ VALIDATION FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { config } = await request.json();

    // Validate provided configuration
    const validation = {
      timestamp: new Date().toISOString(),
      providedConfig: config,
      validation: {},
      isValid: true,
      errors: [],
      recommendations: []
    };

    // Validate each field
    if (!config.EMAIL_SERVER_HOST) {
      validation.errors.push('EMAIL_SERVER_HOST is required');
      validation.isValid = false;
    } else if (config.EMAIL_SERVER_HOST.includes('localhost')) {
      validation.errors.push('EMAIL_SERVER_HOST cannot be localhost');
      validation.recommendations.push('Use smtp.gmail.com for Gmail or smtp-mail.outlook.com for Outlook');
      validation.isValid = false;
    }

    if (!config.EMAIL_SERVER_PORT) {
      validation.errors.push('EMAIL_SERVER_PORT is required');
      validation.isValid = false;
    } else if (!['587', '465', '25'].includes(config.EMAIL_SERVER_PORT)) {
      validation.errors.push('EMAIL_SERVER_PORT should be 587, 465, or 25');
      validation.recommendations.push('Use 587 for TLS (recommended) or 465 for SSL');
      validation.isValid = false;
    }

    if (!config.EMAIL_SERVER_USER) {
      validation.errors.push('EMAIL_SERVER_USER is required');
      validation.isValid = false;
    } else if (!config.EMAIL_SERVER_USER.includes('@')) {
      validation.errors.push('EMAIL_SERVER_USER should be a valid email address');
      validation.isValid = false;
    }

    if (!config.EMAIL_SERVER_PASSWORD) {
      validation.errors.push('EMAIL_SERVER_PASSWORD is required');
      validation.isValid = false;
    } else if (config.EMAIL_SERVER_HOST?.includes('gmail') && config.EMAIL_SERVER_PASSWORD.length < 16) {
      validation.errors.push('Gmail requires 16-character app password');
      validation.recommendations.push('Generate app password in Google Account > Security > App passwords');
      validation.isValid = false;
    }

    if (validation.isValid) {
      validation.recommendations.push('Configuration looks valid');
      validation.recommendations.push('Add these to your .env.local file');
      validation.recommendations.push('Restart your server and test with /api/admin/test-email');
    }

    return NextResponse.json(validation);

  } catch (error) {
    console.error("Email configuration validation error:", error);
    return NextResponse.json({
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

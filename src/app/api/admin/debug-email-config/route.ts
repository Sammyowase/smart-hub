import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import nodemailer from 'nodemailer'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    console.log("=== DETAILED EMAIL CONFIGURATION DEBUG ===");

    const debug = {
      timestamp: new Date().toISOString(),
      title: "🔍 DETAILED EMAIL CONFIGURATION DEBUG",
      
      environmentVariables: {
        EMAIL_SERVER_HOST: {
          value: process.env.EMAIL_SERVER_HOST || 'NOT SET',
          isLocalhost: (process.env.EMAIL_SERVER_HOST || '').includes('localhost'),
          isValid: !!(process.env.EMAIL_SERVER_HOST && !process.env.EMAIL_SERVER_HOST.includes('localhost'))
        },
        EMAIL_SERVER_PORT: {
          value: process.env.EMAIL_SERVER_PORT || 'NOT SET',
          isValid: ['587', '465', '25'].includes(process.env.EMAIL_SERVER_PORT || '')
        },
        EMAIL_SERVER_USER: {
          value: process.env.EMAIL_SERVER_USER || 'NOT SET',
          isEmail: !!(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_USER.includes('@')),
          domain: process.env.EMAIL_SERVER_USER ? process.env.EMAIL_SERVER_USER.split('@')[1] : 'N/A'
        },
        EMAIL_SERVER_PASSWORD: {
          isSet: !!process.env.EMAIL_SERVER_PASSWORD,
          length: process.env.EMAIL_SERVER_PASSWORD ? process.env.EMAIL_SERVER_PASSWORD.length : 0,
          hasSpaces: !!(process.env.EMAIL_SERVER_PASSWORD && process.env.EMAIL_SERVER_PASSWORD.includes(' ')),
          isAppPasswordLength: process.env.EMAIL_SERVER_PASSWORD ? process.env.EMAIL_SERVER_PASSWORD.replace(/\s/g, '').length === 16 : false
        },
        EMAIL_FROM: {
          value: process.env.EMAIL_FROM || 'NOT SET',
          isSet: !!process.env.EMAIL_FROM
        },
        APP_URL: {
          value: process.env.APP_URL || 'NOT SET',
          isLocalhost: (process.env.APP_URL || '').includes('localhost')
        }
      },

      configurationIssues: [],
      smtpTest: null,
      recommendations: []
    };

    // Analyze configuration issues
    if (!process.env.EMAIL_SERVER_HOST) {
      debug.configurationIssues.push('EMAIL_SERVER_HOST is not set');
      debug.recommendations.push('Set EMAIL_SERVER_HOST=smtp.gmail.com');
    } else if (debug.environmentVariables.EMAIL_SERVER_HOST.isLocalhost) {
      debug.configurationIssues.push('EMAIL_SERVER_HOST is set to localhost - this causes "localhost says..." messages');
      debug.recommendations.push('Change EMAIL_SERVER_HOST to smtp.gmail.com');
    }

    if (!process.env.EMAIL_SERVER_USER) {
      debug.configurationIssues.push('EMAIL_SERVER_USER is not set');
      debug.recommendations.push('Set EMAIL_SERVER_USER to your Gmail address');
    }

    if (!process.env.EMAIL_SERVER_PASSWORD) {
      debug.configurationIssues.push('EMAIL_SERVER_PASSWORD is not set');
      debug.recommendations.push('Set EMAIL_SERVER_PASSWORD to your Gmail app password');
    } else if (debug.environmentVariables.EMAIL_SERVER_PASSWORD.hasSpaces) {
      debug.configurationIssues.push('EMAIL_SERVER_PASSWORD contains spaces - remove all spaces');
      debug.recommendations.push('Remove spaces from app password: agposmjfmolehaec (not "agpo smjf mole haec")');
    } else if (!debug.environmentVariables.EMAIL_SERVER_PASSWORD.isAppPasswordLength) {
      debug.configurationIssues.push('EMAIL_SERVER_PASSWORD is not 16 characters - may not be a valid app password');
      debug.recommendations.push('Generate new 16-character app password from Google Account settings');
    }

    // Test SMTP connection if configuration looks good
    if (debug.configurationIssues.length === 0) {
      try {
        console.log('Testing SMTP connection...');
        
        const transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_SERVER_HOST,
          port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
          secure: process.env.EMAIL_SERVER_PORT === '465',
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        });

        const verified = await transporter.verify();
        
        debug.smtpTest = {
          success: verified,
          message: verified ? 'SMTP connection successful' : 'SMTP connection failed',
          timestamp: new Date().toISOString()
        };

        if (verified) {
          debug.recommendations.push('✅ SMTP configuration is working - emails should be delivered');
        }

      } catch (error: any) {
        debug.smtpTest = {
          success: false,
          error: error.message,
          code: error.code,
          details: {
            command: error.command,
            response: error.response
          }
        };

        if (error.code === 'EAUTH') {
          debug.recommendations.push('❌ Authentication failed - check email and app password');
          debug.recommendations.push('Generate new app password: Google Account > Security > App passwords');
        } else if (error.code === 'ECONNECTION') {
          debug.recommendations.push('❌ Connection failed - check SMTP host and port');
        } else {
          debug.recommendations.push(`❌ SMTP error: ${error.message}`);
        }
      }
    } else {
      debug.recommendations.push('Fix configuration issues above before testing SMTP connection');
    }

    // Overall status
    const hasIssues = debug.configurationIssues.length > 0;
    const smtpWorks = debug.smtpTest?.success === true;
    
    debug.status = hasIssues 
      ? "❌ CONFIGURATION ISSUES DETECTED" 
      : smtpWorks 
      ? "✅ EMAIL CONFIGURATION WORKING"
      : "⚠️ CONFIGURATION LOOKS GOOD BUT SMTP TEST FAILED";

    return NextResponse.json(debug);

  } catch (error) {
    console.error("❌ Email configuration debug error:", error);
    return NextResponse.json({
      status: "❌ DEBUG FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

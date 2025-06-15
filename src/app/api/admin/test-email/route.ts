import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyEmailService, sendTestEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    console.log("=== EMAIL SERVICE DIAGNOSTIC TEST ===");

    const testResults = {
      timestamp: new Date().toISOString(),
      status: "📧 EMAIL SERVICE DIAGNOSTIC",
      
      environmentVariables: {
        EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || 'not set',
        EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || 'not set',
        EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER ? '***configured***' : 'not set',
        EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ? '***configured***' : 'not set',
        EMAIL_FROM: process.env.EMAIL_FROM || 'not set',
        APP_URL: process.env.APP_URL || 'not set',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set'
      },

      serviceVerification: null,
      testEmailResult: null,
      recommendations: []
    };

    // Test 1: Verify email service configuration
    console.log("Test 1: Verifying email service configuration...");
    const verificationResult = await verifyEmailService();
    testResults.serviceVerification = verificationResult;

    if (!verificationResult.success) {
      testResults.recommendations.push("Fix email service configuration before sending invitations");
      testResults.recommendations.push(`Error: ${verificationResult.error}`);
      
      if (verificationResult.details?.missingVars) {
        testResults.recommendations.push(`Set missing environment variables: ${verificationResult.details.missingVars.join(', ')}`);
      }
    }

    // Test 2: Send test email (only if service verification passed)
    if (verificationResult.success && session.user.email) {
      console.log("Test 2: Sending test email...");
      const testEmailResult = await sendTestEmail(session.user.email);
      testResults.testEmailResult = testEmailResult;

      if (testEmailResult.success) {
        testResults.recommendations.push("✅ Email service is working correctly");
        testResults.recommendations.push("Check your email inbox for the test message");
      } else {
        testResults.recommendations.push("❌ Email sending failed");
        testResults.recommendations.push(`Error: ${testEmailResult.error}`);
      }
    } else if (!session.user.email) {
      testResults.recommendations.push("Cannot send test email - user email not available");
    }

    // Add configuration recommendations
    if (!process.env.EMAIL_SERVER_HOST) {
      testResults.recommendations.push("Set EMAIL_SERVER_HOST (e.g., smtp.gmail.com)");
    }
    if (!process.env.EMAIL_SERVER_USER) {
      testResults.recommendations.push("Set EMAIL_SERVER_USER (your email address)");
    }
    if (!process.env.EMAIL_SERVER_PASSWORD) {
      testResults.recommendations.push("Set EMAIL_SERVER_PASSWORD (your email password or app password)");
    }

    // Overall status
    testResults.status = verificationResult.success && 
                        (testResults.testEmailResult?.success !== false) 
                        ? "✅ EMAIL SERVICE WORKING" 
                        : "❌ EMAIL SERVICE ISSUES DETECTED";

    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ Email service test error:", error);
    return NextResponse.json({
      status: "❌ EMAIL SERVICE TEST FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      recommendations: [
        "Check server logs for detailed error information",
        "Verify email service configuration",
        "Ensure all required environment variables are set"
      ]
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

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    console.log(`Sending test email to ${email}...`);

    // Verify email service first
    const verificationResult = await verifyEmailService();
    if (!verificationResult.success) {
      return NextResponse.json({
        success: false,
        error: "Email service not configured properly",
        details: verificationResult.error
      }, { status: 500 });
    }

    // Send test email
    const testResult = await sendTestEmail(email);

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        messageId: testResult.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Test email sending error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

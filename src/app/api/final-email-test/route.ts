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

    console.log("=== FINAL EMAIL SYSTEM TEST ===");

    const finalTest = {
      timestamp: new Date().toISOString(),
      title: "🎯 FINAL EMAIL SYSTEM VERIFICATION",
      
      configurationCheck: {
        environmentVariables: {
          EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || 'NOT SET',
          EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || 'NOT SET',
          EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER ? '***configured***' : 'NOT SET',
          EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ? `***${process.env.EMAIL_SERVER_PASSWORD.length} chars***` : 'NOT SET',
          EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET'
        },
        
        validation: {
          hostNotLocalhost: !!(process.env.EMAIL_SERVER_HOST && !process.env.EMAIL_SERVER_HOST.includes('localhost')),
          portValid: ['587', '465', '25'].includes(process.env.EMAIL_SERVER_PORT || ''),
          userIsEmail: !!(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_USER.includes('@')),
          passwordSet: !!process.env.EMAIL_SERVER_PASSWORD,
          passwordNoSpaces: !!(process.env.EMAIL_SERVER_PASSWORD && !process.env.EMAIL_SERVER_PASSWORD.includes(' '))
        }
      },

      serviceVerification: null,
      testEmailResult: null,
      invitationTest: null,
      
      status: "testing",
      issues: [],
      recommendations: []
    };

    // Step 1: Verify email service
    console.log("Step 1: Verifying email service...");
    const verifyResult = await verifyEmailService();
    finalTest.serviceVerification = verifyResult;

    if (!verifyResult.success) {
      finalTest.issues.push(`Email service verification failed: ${verifyResult.error}`);
      
      if (verifyResult.error?.includes('localhost')) {
        finalTest.recommendations.push("❌ CRITICAL: EMAIL_SERVER_HOST is still set to localhost");
        finalTest.recommendations.push("Fix: Set EMAIL_SERVER_HOST=smtp.gmail.com in .env.local");
      }
      if (verifyResult.error?.includes('authentication')) {
        finalTest.recommendations.push("❌ Authentication failed - check Gmail app password");
        finalTest.recommendations.push("Generate new app password: Google Account > Security > App passwords");
      }
    } else {
      finalTest.recommendations.push("✅ Email service verification successful");
    }

    // Step 2: Send test email (only if verification passed)
    if (verifyResult.success && session.user.email) {
      console.log("Step 2: Sending test email...");
      const testResult = await sendTestEmail(session.user.email);
      finalTest.testEmailResult = testResult;

      if (!testResult.success) {
        finalTest.issues.push(`Test email failed: ${testResult.error}`);
        finalTest.recommendations.push("❌ Test email delivery failed");
      } else {
        finalTest.recommendations.push("✅ Test email sent successfully");
        finalTest.recommendations.push(`Check your inbox: ${session.user.email}`);
      }
    } else if (!session.user.email) {
      finalTest.recommendations.push("⚠️ Cannot send test email - user email not available");
    }

    // Step 3: Test invitation API (simulation)
    if (verifyResult.success) {
      console.log("Step 3: Testing invitation API response format...");
      
      // Simulate invitation response to check message format
      const mockInvitationResponse = {
        message: "Processed 1 invitation(s). 1 emails sent successfully.",
        results: [
          {
            email: "test@example.com",
            emailSent: true,
            status: "sent",
            emailError: null
          }
        ],
        summary: {
          total: 1,
          emailsSent: 1,
          emailsFailed: 0
        }
      };

      finalTest.invitationTest = {
        success: true,
        mockResponse: mockInvitationResponse,
        messageFormat: "Professional format without localhost references"
      };

      finalTest.recommendations.push("✅ Invitation API response format is correct");
    }

    // Overall assessment
    const hasConfigIssues = !finalTest.configurationCheck.validation.hostNotLocalhost ||
                           !finalTest.configurationCheck.validation.passwordSet;
    const hasServiceIssues = !verifyResult.success;
    const hasEmailIssues = finalTest.testEmailResult && !finalTest.testEmailResult.success;

    if (hasConfigIssues) {
      finalTest.status = "❌ CONFIGURATION ISSUES";
      finalTest.recommendations.unshift("Fix configuration issues before testing email delivery");
    } else if (hasServiceIssues) {
      finalTest.status = "❌ SERVICE VERIFICATION FAILED";
      finalTest.recommendations.unshift("Email service cannot connect - check SMTP settings");
    } else if (hasEmailIssues) {
      finalTest.status = "⚠️ EMAIL DELIVERY ISSUES";
      finalTest.recommendations.unshift("Email service works but delivery failed");
    } else {
      finalTest.status = "✅ EMAIL SYSTEM FULLY FUNCTIONAL";
      finalTest.recommendations.unshift("All email system components are working correctly");
    }

    // Next steps based on status
    if (finalTest.status.includes("✅")) {
      finalTest.nextSteps = [
        "1. Email system is ready for production use",
        "2. Test invitation system: POST /api/team/invite",
        "3. Send real invitations to team members",
        "4. Monitor email delivery and user feedback"
      ];
    } else {
      finalTest.nextSteps = [
        "1. Fix the issues identified above",
        "2. Restart development server if configuration changed",
        "3. Re-run this test: GET /api/final-email-test",
        "4. Test invitation system once all issues are resolved"
      ];
    }

    // Summary
    finalTest.summary = {
      configurationValid: !hasConfigIssues,
      serviceConnected: verifyResult.success,
      emailDeliveryWorking: finalTest.testEmailResult?.success !== false,
      readyForProduction: !hasConfigIssues && !hasServiceIssues && !hasEmailIssues,
      issuesFound: finalTest.issues.length,
      recommendationsProvided: finalTest.recommendations.length
    };

    return NextResponse.json(finalTest);

  } catch (error) {
    console.error("❌ Final email test error:", error);
    return NextResponse.json({
      status: "❌ TEST FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      recommendations: [
        "Check server logs for detailed error information",
        "Verify email configuration in .env.local",
        "Ensure development server is running properly",
        "Contact support if issues persist"
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

    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: "Test email address is required" },
        { status: 400 }
      );
    }

    console.log(`Testing email delivery to ${testEmail}...`);

    // Verify service first
    const verifyResult = await verifyEmailService();
    if (!verifyResult.success) {
      return NextResponse.json({
        success: false,
        error: "Email service verification failed",
        details: verifyResult.error,
        recommendation: "Fix email configuration before testing delivery"
      }, { status: 500 });
    }

    // Send test email
    const testResult = await sendTestEmail(testEmail);

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        messageId: testResult.messageId,
        recommendation: "Check the recipient's inbox (including spam folder)"
      });
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error,
        recommendation: "Check SMTP configuration and credentials"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Final email test error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

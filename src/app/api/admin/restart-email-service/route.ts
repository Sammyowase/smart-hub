import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { recreateEmailTransporter, verifyEmailService } from "@/lib/email"

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    console.log("=== RESTARTING EMAIL SERVICE ===");

    const result = {
      timestamp: new Date().toISOString(),
      title: "🔄 EMAIL SERVICE RESTART",

      steps: {
        step1_recreate_transporter: null,
        step2_verify_service: null,
        step3_test_connection: null
      },

      status: "processing",
      recommendations: []
    };

    // Step 1: Recreate email transporter
    console.log("Step 1: Recreating email transporter...");
    const recreateResult = recreateEmailTransporter();
    result.steps.step1_recreate_transporter = {
      success: recreateResult.success,
      message: recreateResult.success
        ? "Email transporter recreated with current environment variables"
        : `Failed to recreate transporter: ${recreateResult.error}`,
      error: recreateResult.error
    };

    if (!recreateResult.success) {
      result.status = "❌ FAILED AT STEP 1";
      result.recommendations.push("Fix email configuration issues before restarting service");
      return NextResponse.json(result, { status: 500 });
    }

    // Step 2: Verify email service
    console.log("Step 2: Verifying email service...");
    const verifyResult = await verifyEmailService();
    result.steps.step2_verify_service = {
      success: verifyResult.success,
      message: verifyResult.success
        ? "Email service verification successful"
        : `Verification failed: ${verifyResult.error}`,
      error: verifyResult.error,
      details: verifyResult.details
    };

    if (!verifyResult.success) {
      result.status = "❌ FAILED AT STEP 2";
      result.recommendations.push("Email service verification failed");
      result.recommendations.push(`Error: ${verifyResult.error}`);

      if (verifyResult.error?.includes('localhost')) {
        result.recommendations.push("Set EMAIL_SERVER_HOST to smtp.gmail.com (not localhost)");
      }
      if (verifyResult.error?.includes('authentication')) {
        result.recommendations.push("Check EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD");
        result.recommendations.push("For Gmail, use app password (16 characters without spaces)");
      }

      return NextResponse.json(result, { status: 500 });
    }

    // Step 3: Final status
    result.steps.step3_test_connection = {
      success: true,
      message: "Email service is ready for sending emails",
      timestamp: new Date().toISOString()
    };

    result.status = "✅ EMAIL SERVICE RESTARTED SUCCESSFULLY";
    result.recommendations = [
      "Email service is now ready",
      "Test with: POST /api/admin/test-email",
      "Send invitations with: POST /api/team/invite",
      "No more 'localhost says...' messages should appear"
    ];

    console.log("✅ Email service restart completed successfully");
    return NextResponse.json(result);

  } catch (error) {
    console.error("❌ Email service restart error:", error);
    return NextResponse.json({
      status: "❌ RESTART FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      recommendations: [
        "Check email configuration in .env.local",
        "Ensure EMAIL_SERVER_HOST is not localhost",
        "Verify Gmail app password is correct",
        "Restart development server manually"
      ]
    }, { status: 500 });
  }
}

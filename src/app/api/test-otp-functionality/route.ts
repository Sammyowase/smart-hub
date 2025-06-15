import { NextRequest, NextResponse } from "next/server"
import { createOTP, verifyOTPCode, getOTPStatus } from "@/lib/otp"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING OTP FUNCTIONALITY ===");
    
    const testEmail = "test@smarthub.com";
    const testResults = {
      timestamp: new Date().toISOString(),
      status: "🧪 OTP FUNCTIONALITY TEST",
      tests: {}
    };

    // Test 1: Create OTP
    console.log("Test 1: Creating OTP...");
    const createResult = await createOTP(testEmail, 'EMAIL_VERIFICATION');
    testResults.tests.create_otp = {
      success: createResult.success,
      otp_generated: createResult.otp ? "✅ Generated" : "❌ Failed",
      error: createResult.error || null
    };

    if (!createResult.success || !createResult.otp) {
      return NextResponse.json({
        ...testResults,
        overall_status: "❌ OTP Creation Failed"
      });
    }

    // Test 2: Get OTP Status
    console.log("Test 2: Getting OTP status...");
    const statusResult = await getOTPStatus(testEmail, 'EMAIL_VERIFICATION');
    testResults.tests.otp_status = {
      exists: statusResult.exists,
      is_expired: statusResult.isExpired || false,
      attempts: statusResult.attempts || 0,
      time_remaining: statusResult.timeRemaining || 0
    };

    // Test 3: Verify Invalid OTP
    console.log("Test 3: Testing invalid OTP...");
    const invalidResult = await verifyOTPCode(testEmail, "123456", 'EMAIL_VERIFICATION');
    testResults.tests.invalid_otp = {
      should_fail: true,
      actually_failed: !invalidResult.success,
      error_message: invalidResult.error || null
    };

    // Test 4: Verify Correct OTP
    console.log("Test 4: Testing correct OTP...");
    const validResult = await verifyOTPCode(testEmail, createResult.otp, 'EMAIL_VERIFICATION');
    testResults.tests.valid_otp = {
      should_succeed: true,
      actually_succeeded: validResult.success,
      error_message: validResult.error || null
    };

    // Test 5: Try to reuse OTP (should fail)
    console.log("Test 5: Testing OTP reuse prevention...");
    const reuseResult = await verifyOTPCode(testEmail, createResult.otp, 'EMAIL_VERIFICATION');
    testResults.tests.otp_reuse_prevention = {
      should_fail: true,
      actually_failed: !reuseResult.success,
      error_message: reuseResult.error || null
    };

    // Test 6: Rate limiting test
    console.log("Test 6: Testing rate limiting...");
    const rateLimitResults = [];
    for (let i = 0; i < 4; i++) {
      const result = await createOTP(`ratelimit${i}@test.com`, 'EMAIL_VERIFICATION');
      rateLimitResults.push({
        attempt: i + 1,
        success: result.success,
        error: result.error
      });
    }
    
    testResults.tests.rate_limiting = {
      attempts: rateLimitResults,
      rate_limit_working: rateLimitResults.slice(0, 3).every(r => r.success) && 
                         !rateLimitResults[3].success
    };

    // Overall assessment
    const allTestsPassed = 
      testResults.tests.create_otp.success &&
      testResults.tests.otp_status.exists &&
      !testResults.tests.invalid_otp.actually_failed === testResults.tests.invalid_otp.should_fail &&
      testResults.tests.valid_otp.actually_succeeded &&
      !testResults.tests.otp_reuse_prevention.actually_failed === testResults.tests.otp_reuse_prevention.should_fail;

    testResults.overall_status = allTestsPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED";
    
    testResults.summary = {
      otp_generation: testResults.tests.create_otp.success ? "✅ Working" : "❌ Failed",
      otp_verification: testResults.tests.valid_otp.actually_succeeded ? "✅ Working" : "❌ Failed",
      invalid_otp_rejection: testResults.tests.invalid_otp.actually_failed ? "✅ Working" : "❌ Failed",
      otp_reuse_prevention: testResults.tests.otp_reuse_prevention.actually_failed ? "✅ Working" : "❌ Failed",
      rate_limiting: testResults.tests.rate_limiting.rate_limit_working ? "✅ Working" : "❌ Failed"
    };

    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ OTP functionality test error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

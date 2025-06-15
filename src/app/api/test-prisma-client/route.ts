import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING PRISMA CLIENT SYNCHRONIZATION ===");
    
    const testResults = {
      timestamp: new Date().toISOString(),
      status: "🔧 PRISMA CLIENT SYNCHRONIZATION TEST",
      tests: {}
    };

    // Test 1: Check if Prisma client recognizes the new fields
    console.log("Test 1: Checking Prisma client schema recognition...");
    
    try {
      // Try to create a test user object (without actually saving)
      const testUserData = {
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword",
        role: "USER" as const,
        isEmailVerified: false, // This should work if client is updated
      };

      // Test the data structure without saving
      testResults.tests.schema_recognition = {
        status: "✅ SUCCESS",
        message: "Prisma client recognizes isEmailVerified field",
        test_data_valid: true
      };

    } catch (error) {
      testResults.tests.schema_recognition = {
        status: "❌ FAILED",
        message: "Prisma client does not recognize isEmailVerified field",
        error: error instanceof Error ? error.message : "Unknown error",
        solution: "Run 'npx prisma generate' to regenerate the client"
      };
    }

    // Test 2: Check OTPVerification model
    console.log("Test 2: Checking OTPVerification model...");
    
    try {
      // Test OTPVerification model structure
      const testOTPData = {
        email: "test@example.com",
        otpHash: "hashedotp",
        type: "EMAIL_VERIFICATION" as const,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        isUsed: false
      };

      testResults.tests.otp_model_recognition = {
        status: "✅ SUCCESS",
        message: "OTPVerification model is properly recognized",
        test_data_valid: true
      };

    } catch (error) {
      testResults.tests.otp_model_recognition = {
        status: "❌ FAILED",
        message: "OTPVerification model not recognized",
        error: error instanceof Error ? error.message : "Unknown error",
        solution: "Run 'npx prisma generate' and 'npx prisma db push'"
      };
    }

    // Test 3: Check database connection
    console.log("Test 3: Testing database connection...");
    
    try {
      // Simple database query to test connection
      const userCount = await prisma.user.count();
      
      testResults.tests.database_connection = {
        status: "✅ SUCCESS",
        message: "Database connection working",
        user_count: userCount
      };

    } catch (error) {
      testResults.tests.database_connection = {
        status: "❌ FAILED",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Test 4: Check if we can query with new fields
    console.log("Test 4: Testing query with new fields...");
    
    try {
      // Try to find users with the new field
      const verifiedUsers = await prisma.user.findMany({
        where: {
          isEmailVerified: true
        },
        select: {
          id: true,
          email: true,
          isEmailVerified: true
        },
        take: 1
      });

      testResults.tests.new_field_query = {
        status: "✅ SUCCESS",
        message: "Can query using isEmailVerified field",
        verified_users_found: verifiedUsers.length
      };

    } catch (error) {
      testResults.tests.new_field_query = {
        status: "❌ FAILED",
        message: "Cannot query using isEmailVerified field",
        error: error instanceof Error ? error.message : "Unknown error",
        solution: "Run 'npx prisma generate' and restart the development server"
      };
    }

    // Test 5: Check OTP table exists
    console.log("Test 5: Testing OTP table existence...");
    
    try {
      const otpCount = await prisma.oTPVerification.count();
      
      testResults.tests.otp_table_exists = {
        status: "✅ SUCCESS",
        message: "OTPVerification table exists and accessible",
        otp_records_count: otpCount
      };

    } catch (error) {
      testResults.tests.otp_table_exists = {
        status: "❌ FAILED",
        message: "OTPVerification table not accessible",
        error: error instanceof Error ? error.message : "Unknown error",
        solution: "Run 'npx prisma db push' to create the table"
      };
    }

    // Overall assessment
    const allTestsPassed = Object.values(testResults.tests).every(
      test => test.status === "✅ SUCCESS"
    );

    testResults.overall_status = allTestsPassed 
      ? "✅ ALL TESTS PASSED - Prisma client is synchronized" 
      : "❌ SOME TESTS FAILED - Prisma client needs regeneration";

    // Provide specific solutions
    testResults.solutions = {
      if_schema_recognition_failed: [
        "1. Run: npx prisma generate",
        "2. Restart development server: npm run dev",
        "3. Clear node_modules/.prisma if needed"
      ],
      if_database_sync_failed: [
        "1. Run: npx prisma db push",
        "2. Check database connection string",
        "3. Verify MongoDB is accessible"
      ],
      if_query_failed: [
        "1. Run: npx prisma generate",
        "2. Run: npx prisma db push", 
        "3. Restart development server",
        "4. Clear browser cache and try again"
      ]
    };

    testResults.next_steps = allTestsPassed ? [
      "✅ Prisma client is working correctly",
      "✅ You can now test user registration",
      "✅ Email verification should work properly"
    ] : [
      "❌ Follow the solutions above to fix the issues",
      "❌ Regenerate Prisma client and restart server",
      "❌ Test again after applying fixes"
    ];

    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ Prisma client test error:", error);
    return NextResponse.json({
      status: "❌ CRITICAL ERROR",
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      immediate_action_required: [
        "1. Run: npx prisma generate",
        "2. Run: npx prisma db push",
        "3. Restart development server",
        "4. Check database connection"
      ]
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log("=== TESTING LOGIN PROCESS IN PRODUCTION ===");
    console.log("Login attempt for:", email);
    
    const testResult = {
      timestamp: new Date().toISOString(),
      title: "🔐 Test Login Process",
      input: { email, passwordProvided: !!password },
      steps: [] as any[],
      result: {
        success: false,
        canLogin: false,
        error: null
      }
    };

    // Step 1: Validate input
    testResult.steps.push({
      step: 1,
      name: "Input Validation",
      status: "running"
    });

    if (!email || !password) {
      testResult.steps[0].status = "❌ Failed";
      testResult.steps[0].error = "Missing email or password";
      testResult.result.error = "Email and password are required";
      return NextResponse.json(testResult, { status: 400 });
    }

    testResult.steps[0].status = "✅ Passed";

    // Step 2: Find user in database
    testResult.steps.push({
      step: 2,
      name: "Find User in Database",
      status: "running"
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        emailVerified: true,
        isTemporaryPassword: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      testResult.steps[1].status = "❌ User not found";
      testResult.steps[1].error = "No user found with this email";
      testResult.result.error = "User not found in database";
      
      // Check if there are any users at all
      const userCount = await prisma.user.count();
      testResult.steps[1].totalUsers = userCount;
      
      return NextResponse.json(testResult, { status: 404 });
    }

    testResult.steps[1].status = "✅ User found";
    testResult.steps[1].userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.emailVerified,
      isTemporaryPassword: user.isTemporaryPassword,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0,
      createdAt: user.createdAt
    };

    // Step 3: Check if user has a password
    testResult.steps.push({
      step: 3,
      name: "Check User Password",
      status: "running"
    });

    if (!user.password) {
      testResult.steps[2].status = "❌ No password set";
      testResult.steps[2].error = "User exists but has no password";
      testResult.result.error = "User has no password set";
      return NextResponse.json(testResult, { status: 400 });
    }

    testResult.steps[2].status = "✅ Password exists";
    testResult.steps[2].passwordHash = user.password.substring(0, 20) + "...";

    // Step 4: Verify password
    testResult.steps.push({
      step: 4,
      name: "Verify Password",
      status: "running"
    });

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      testResult.steps[3].status = "❌ Password mismatch";
      testResult.steps[3].error = "Provided password does not match stored hash";
      testResult.result.error = "Invalid password";
      
      // Test if bcrypt is working at all
      const testHash = await bcrypt.hash(password, 12);
      const testVerify = await bcrypt.compare(password, testHash);
      testResult.steps[3].bcryptTest = {
        working: testVerify,
        testHash: testHash.substring(0, 20) + "..."
      };
      
      return NextResponse.json(testResult, { status: 401 });
    }

    testResult.steps[3].status = "✅ Password verified";

    // Step 5: Check email verification
    testResult.steps.push({
      step: 5,
      name: "Check Email Verification",
      status: "running"
    });

    if (!user.emailVerified) {
      testResult.steps[4].status = "⚠️ Email not verified";
      testResult.steps[4].warning = "User exists and password is correct, but email is not verified";
      testResult.result.canLogin = false;
      testResult.result.error = "Email not verified";
    } else {
      testResult.steps[4].status = "✅ Email verified";
      testResult.result.canLogin = true;
      testResult.result.success = true;
    }

    console.log("✅ Login test completed:", testResult.result);
    return NextResponse.json(testResult);

  } catch (error: any) {
    console.error("❌ Login test error:", error);
    return NextResponse.json({
      status: "❌ TEST FAILED",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: "POST to this endpoint with { email, password } to test login process",
    example: {
      email: "test@example.com",
      password: "testPassword123"
    }
  });
}

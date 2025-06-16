import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    
    console.log("=== TESTING USER CREATION IN PRODUCTION ===");
    console.log("Request data:", { email, name, passwordLength: password?.length });
    
    const testResult = {
      timestamp: new Date().toISOString(),
      title: "🧪 Test User Creation",
      input: { email, name, passwordProvided: !!password },
      steps: [] as any[],
      result: {
        success: false,
        userId: null,
        error: null
      }
    };

    // Step 1: Validate input
    testResult.steps.push({
      step: 1,
      name: "Input Validation",
      status: "running"
    });

    if (!email || !password || !name) {
      testResult.steps[0].status = "❌ Failed";
      testResult.steps[0].error = "Missing required fields";
      testResult.result.error = "Email, password, and name are required";
      return NextResponse.json(testResult, { status: 400 });
    }

    testResult.steps[0].status = "✅ Passed";

    // Step 2: Check if user already exists
    testResult.steps.push({
      step: 2,
      name: "Check Existing User",
      status: "running"
    });

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      testResult.steps[1].status = "⚠️ User exists";
      testResult.steps[1].existingUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        emailVerified: existingUser.emailVerified,
        createdAt: existingUser.createdAt
      };
      testResult.result.error = "User already exists";
      return NextResponse.json(testResult, { status: 409 });
    }

    testResult.steps[1].status = "✅ No existing user";

    // Step 3: Hash password
    testResult.steps.push({
      step: 3,
      name: "Hash Password",
      status: "running"
    });

    const hashedPassword = await bcrypt.hash(password, 12);
    testResult.steps[2].status = "✅ Password hashed";
    testResult.steps[2].hashLength = hashedPassword.length;

    // Step 4: Create user in database
    testResult.steps.push({
      step: 4,
      name: "Create User in Database",
      status: "running"
    });

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(), // For testing, mark as verified
        isTemporaryPassword: false,
        role: "USER"
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        role: true
      }
    });

    testResult.steps[3].status = "✅ User created";
    testResult.steps[3].userId = newUser.id;

    // Step 5: Verify user can be found
    testResult.steps.push({
      step: 5,
      name: "Verify User Creation",
      status: "running"
    });

    const verifyUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (verifyUser) {
      testResult.steps[4].status = "✅ User verified";
      testResult.result.success = true;
      testResult.result.userId = verifyUser.id;
    } else {
      testResult.steps[4].status = "❌ User not found after creation";
      testResult.result.error = "User creation appeared to succeed but user not found";
    }

    console.log("✅ Test user creation completed:", testResult.result);
    return NextResponse.json(testResult);

  } catch (error: any) {
    console.error("❌ Test user creation error:", error);
    return NextResponse.json({
      status: "❌ TEST FAILED",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: "POST to this endpoint with { email, password, name } to test user creation",
    example: {
      email: "test@example.com",
      password: "testPassword123",
      name: "Test User"
    }
  });
}

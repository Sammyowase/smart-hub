import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(_request: NextRequest) {
  try {
    console.log("=== PRODUCTION AUTHENTICATION DEBUG ===");
    
    const debug = {
      timestamp: new Date().toISOString(),
      title: "🔍 Production Authentication Debug Report",
      environment: process.env.NODE_ENV,
      
      // Test 1: Database Connection
      databaseConnection: {
        status: "unknown",
        error: null as any,
        userCount: 0,
        sampleUsers: [] as any[]
      },
      
      // Test 2: Password Hashing
      passwordHashing: {
        status: "unknown",
        testHash: "",
        verificationTest: false,
        error: null as any
      },
      
      // Test 3: NextAuth Configuration
      nextAuthConfig: {
        status: "unknown",
        providers: [] as string[],
        session: null as any,
        error: null as any
      },
      
      // Test 4: Environment Variables
      environmentVariables: {
        NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV
      },
      
      recommendations: [] as string[]
    };

    // Test 1: Database Connection and User Data
    console.log("1. Testing database connection...");
    try {
      const userCount = await prisma.user.count();
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          isTemporaryPassword: true,
          createdAt: true
        }
      });
      
      debug.databaseConnection = {
        status: "✅ Connected",
        error: null,
        userCount,
        sampleUsers
      };
      
      console.log(`✅ Database connected. Found ${userCount} users.`);
      
      if (userCount === 0) {
        debug.recommendations.push("❌ No users found in database - this explains login failures");
      }
      
    } catch (error: any) {
      debug.databaseConnection = {
        status: "❌ Failed",
        error: error.message,
        userCount: 0,
        sampleUsers: []
      };
      debug.recommendations.push("❌ Database connection failed - check DATABASE_URL and database status");
      console.error("❌ Database connection failed:", error);
    }

    // Test 2: Password Hashing and Verification
    console.log("2. Testing password hashing...");
    try {
      const testPassword = "testPassword123";
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      
      debug.passwordHashing = {
        status: isValid ? "✅ Working" : "❌ Failed",
        testHash: hashedPassword.substring(0, 20) + "...",
        verificationTest: isValid,
        error: null
      };
      
      console.log(`✅ Password hashing test: ${isValid ? "PASSED" : "FAILED"}`);
      
      if (!isValid) {
        debug.recommendations.push("❌ Password hashing/verification is broken");
      }
      
    } catch (error: any) {
      debug.passwordHashing = {
        status: "❌ Error",
        testHash: "",
        verificationTest: false,
        error: error.message
      };
      debug.recommendations.push("❌ Password hashing library error - check bcryptjs installation");
      console.error("❌ Password hashing error:", error);
    }

    // Test 3: NextAuth Configuration
    console.log("3. Testing NextAuth configuration...");
    try {
      const session = await getServerSession(authOptions);
      
      debug.nextAuthConfig = {
        status: "✅ Configured",
        providers: authOptions.providers?.map((p: any) => p.id || p.type) || [],
        session: session ? {
          user: session.user?.email,
          expires: session.expires
        } : null,
        error: null
      };
      
      console.log("✅ NextAuth configuration loaded successfully");
      
    } catch (error: any) {
      debug.nextAuthConfig = {
        status: "❌ Error",
        providers: [],
        session: null,
        error: error.message
      };
      debug.recommendations.push("❌ NextAuth configuration error - check authOptions");
      console.error("❌ NextAuth error:", error);
    }

    // Test 4: Environment Variables Check
    console.log("4. Checking environment variables...");
    if (!process.env.NEXTAUTH_SECRET) {
      debug.recommendations.push("❌ NEXTAUTH_SECRET is missing - this will cause session issues");
    }
    
    if (!process.env.DATABASE_URL) {
      debug.recommendations.push("❌ DATABASE_URL is missing - database connection will fail");
    }
    
    if (process.env.NODE_ENV !== 'production') {
      debug.recommendations.push("⚠️ NODE_ENV is not 'production' - ensure production environment");
    }

    // Overall Assessment
    const hasDbConnection = debug.databaseConnection.status.includes("✅");
    const hasUsers = debug.databaseConnection.userCount > 0;
    const passwordWorks = debug.passwordHashing.status.includes("✅");
    const nextAuthWorks = debug.nextAuthConfig.status.includes("✅");
    
    if (!hasDbConnection) {
      debug.recommendations.push("🔧 CRITICAL: Fix database connection first");
    } else if (!hasUsers) {
      debug.recommendations.push("🔧 CRITICAL: No users in database - need to create test user or migrate data");
    } else if (!passwordWorks) {
      debug.recommendations.push("🔧 CRITICAL: Password hashing is broken - check bcryptjs");
    } else if (!nextAuthWorks) {
      debug.recommendations.push("🔧 CRITICAL: NextAuth configuration issues");
    } else {
      debug.recommendations.push("✅ All core components appear to be working");
    }

    return NextResponse.json(debug);

  } catch (error) {
    console.error("❌ Authentication debug error:", error);
    return NextResponse.json({
      status: "❌ DEBUG FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

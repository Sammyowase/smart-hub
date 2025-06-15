import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING IMPORTS ===");
    
    // Test 1: Direct PrismaClient import
    console.log("1. Testing direct PrismaClient import...");
    let directImport;
    try {
      const { PrismaClient } = await import("@prisma/client");
      directImport = {
        success: true,
        PrismaClientExists: !!PrismaClient,
        PrismaClientType: typeof PrismaClient,
        canInstantiate: false
      };
      
      // Try to instantiate
      try {
        const testClient = new PrismaClient();
        directImport.canInstantiate = true;
        await testClient.$disconnect();
      } catch (instError) {
        directImport.instantiationError = (instError as Error).message;
      }
      
      console.log("✅ Direct import successful:", directImport);
    } catch (error) {
      directImport = {
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Direct import failed:", error);
    }

    // Test 2: Our prisma lib import
    console.log("2. Testing @/lib/prisma import...");
    let libImport;
    try {
      const prismaLib = await import("@/lib/prisma");
      libImport = {
        success: true,
        prismaExists: !!prismaLib.prisma,
        prismaType: typeof prismaLib.prisma,
        prismaKeys: prismaLib.prisma ? Object.keys(prismaLib.prisma).filter(k => !k.startsWith('_')).slice(0, 10) : [],
        hasTestFunction: !!prismaLib.testPrismaConnection
      };
      
      // Try to use a method
      try {
        if (prismaLib.prisma && typeof prismaLib.prisma.$connect === 'function') {
          libImport.hasConnectMethod = true;
        }
      } catch (methodError) {
        libImport.methodError = (methodError as Error).message;
      }
      
      console.log("✅ Lib import successful:", libImport);
    } catch (error) {
      libImport = {
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Lib import failed:", error);
    }

    // Test 3: Try using the imported prisma
    console.log("3. Testing prisma usage...");
    let usageTest;
    if (libImport.success && libImport.prismaExists) {
      try {
        const { prisma } = await import("@/lib/prisma");
        
        // Test if methods exist
        const methodTests = {
          hasConnect: typeof prisma.$connect === 'function',
          hasDisconnect: typeof prisma.$disconnect === 'function',
          hasUser: !!prisma.user,
          hasUserFindMany: !!prisma.user?.findMany,
          hasConversation: !!prisma.conversation,
          hasConversationFindFirst: !!prisma.conversation?.findFirst,
          hasGroup: !!prisma.group,
          hasGroupFindMany: !!prisma.group?.findMany
        };
        
        usageTest = {
          success: true,
          methods: methodTests,
          allMethodsExist: Object.values(methodTests).every(Boolean)
        };
        
        console.log("✅ Usage test successful:", usageTest);
      } catch (error) {
        usageTest = {
          success: false,
          error: (error as Error).message
        };
        console.error("❌ Usage test failed:", error);
      }
    } else {
      usageTest = {
        success: false,
        error: "Skipped due to import failure"
      };
    }

    // Test 4: Environment check
    console.log("4. Testing environment...");
    const envTest = {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlValid: process.env.DATABASE_URL?.startsWith('mongodb') || false,
      workingDirectory: process.cwd()
    };

    return NextResponse.json({
      status: "import_test_complete",
      timestamp: new Date().toISOString(),
      tests: {
        directImport,
        libImport,
        usage: usageTest,
        environment: envTest
      },
      summary: {
        allTestsPassed: directImport.success && libImport.success && usageTest.success,
        criticalIssues: getCriticalIssues(directImport, libImport, usageTest, envTest)
      }
    });

  } catch (error) {
    console.error("❌ Import test API error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getCriticalIssues(directImport: any, libImport: any, usageTest: any, envTest: any) {
  const issues = [];

  if (!directImport.success) {
    issues.push("CRITICAL: Cannot import PrismaClient from @prisma/client");
  }

  if (!libImport.success) {
    issues.push("CRITICAL: Cannot import from @/lib/prisma - check file path and syntax");
  }

  if (libImport.success && !libImport.prismaExists) {
    issues.push("CRITICAL: prisma object is undefined in @/lib/prisma");
  }

  if (!usageTest.success && libImport.success) {
    issues.push("CRITICAL: Prisma methods are not available - client not properly initialized");
  }

  if (usageTest.success && !usageTest.allMethodsExist) {
    issues.push("WARNING: Some Prisma methods are missing - check model generation");
  }

  if (!envTest.hasDatabaseUrl) {
    issues.push("CRITICAL: DATABASE_URL environment variable missing");
  }

  if (issues.length === 0) {
    issues.push("✅ All import tests passed - Prisma should be working");
  }

  return issues;
}

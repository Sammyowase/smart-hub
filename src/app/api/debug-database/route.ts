import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("=== DEBUGGING DATABASE STATE ===");
    
    const tests = [];

    // Test 1: Check all users
    console.log("1. Checking all users in database...");
    let usersTest;
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          workspaceId: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      usersTest = {
        step: "all_users",
        success: true,
        userCount: users.length,
        users: users
      };

      console.log(`✅ Found ${users.length} users in database`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - Workspace: ${user.workspaceId}`);
      });
    } catch (error) {
      usersTest = {
        step: "all_users",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Error fetching users:", error);
    }
    tests.push(usersTest);

    // Test 2: Check all workspaces
    console.log("2. Checking all workspaces in database...");
    let workspacesTest;
    try {
      const workspaces = await prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdById: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      workspacesTest = {
        step: "all_workspaces",
        success: true,
        workspaceCount: workspaces.length,
        workspaces: workspaces
      };

      console.log(`✅ Found ${workspaces.length} workspaces in database`);
      workspaces.forEach(workspace => {
        console.log(`  - ${workspace.name} (${workspace.id}) - Created by: ${workspace.createdById}`);
      });
    } catch (error) {
      workspacesTest = {
        step: "all_workspaces",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Error fetching workspaces:", error);
    }
    tests.push(workspacesTest);

    // Test 3: Check all chat messages
    console.log("3. Checking all chat messages in database...");
    let messagesTest;
    try {
      const messages = await prisma.chatMessage.findMany({
        select: {
          id: true,
          content: true,
          authorId: true,
          workspaceId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10 // Only get last 10 messages
      });

      messagesTest = {
        step: "all_messages",
        success: true,
        messageCount: messages.length,
        messages: messages
      };

      console.log(`✅ Found ${messages.length} chat messages in database`);
    } catch (error) {
      messagesTest = {
        step: "all_messages",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Error fetching messages:", error);
    }
    tests.push(messagesTest);

    // Test 4: Check accounts (NextAuth)
    console.log("4. Checking NextAuth accounts...");
    let accountsTest;
    try {
      const accounts = await prisma.account.findMany({
        select: {
          id: true,
          userId: true,
          provider: true,
          providerAccountId: true
        },
        take: 10
      });

      accountsTest = {
        step: "all_accounts",
        success: true,
        accountCount: accounts.length,
        accounts: accounts
      };

      console.log(`✅ Found ${accounts.length} NextAuth accounts in database`);
    } catch (error) {
      accountsTest = {
        step: "all_accounts",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Error fetching accounts:", error);
    }
    tests.push(accountsTest);

    // Test 5: Check sessions (NextAuth)
    console.log("5. Checking NextAuth sessions...");
    let sessionsTest;
    try {
      const sessions = await prisma.session.findMany({
        select: {
          id: true,
          userId: true,
          sessionToken: true,
          expires: true
        },
        take: 10
      });

      sessionsTest = {
        step: "all_sessions",
        success: true,
        sessionCount: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          userId: s.userId,
          expires: s.expires,
          isExpired: s.expires < new Date()
        }))
      };

      console.log(`✅ Found ${sessions.length} NextAuth sessions in database`);
    } catch (error) {
      sessionsTest = {
        step: "all_sessions",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Error fetching sessions:", error);
    }
    tests.push(sessionsTest);

    return NextResponse.json({
      status: "database_debug_complete",
      timestamp: new Date().toISOString(),
      tests,
      summary: {
        databaseEmpty: usersTest.success && usersTest.userCount === 0,
        hasUsers: usersTest.success && usersTest.userCount > 0,
        hasWorkspaces: workspacesTest.success && workspacesTest.workspaceCount > 0,
        hasMessages: messagesTest.success && messagesTest.messageCount > 0,
        hasAuthData: (accountsTest.success && accountsTest.accountCount > 0) || 
                     (sessionsTest.success && sessionsTest.sessionCount > 0),
        recommendations: generateDatabaseRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ Database debug error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateDatabaseRecommendations(tests: any[]) {
  const recommendations = [];
  
  const usersTest = tests.find(t => t.step === "all_users");
  const workspacesTest = tests.find(t => t.step === "all_workspaces");
  const messagesTest = tests.find(t => t.step === "all_messages");
  const accountsTest = tests.find(t => t.step === "all_accounts");
  const sessionsTest = tests.find(t => t.step === "all_sessions");

  if (usersTest?.success && usersTest.userCount === 0) {
    recommendations.push("CRITICAL: No users found - database was likely reset during Prisma fixes");
    recommendations.push("ACTION: Need to create test users or re-register existing users");
  }

  if (workspacesTest?.success && workspacesTest.workspaceCount === 0) {
    recommendations.push("CRITICAL: No workspaces found - need to create default workspace");
  }

  if (accountsTest?.success && accountsTest.accountCount === 0 && 
      sessionsTest?.success && sessionsTest.sessionCount === 0) {
    recommendations.push("WARNING: No NextAuth data found - users need to re-authenticate");
  }

  if (usersTest?.success && usersTest.userCount > 0 && 
      workspacesTest?.success && workspacesTest.workspaceCount > 0) {
    recommendations.push("✅ Users and workspaces exist - check user-workspace relationships");
  }

  if (messagesTest?.success && messagesTest.messageCount > 0) {
    recommendations.push("INFO: Existing messages found - check if they have valid author relationships");
  }

  return recommendations;
}

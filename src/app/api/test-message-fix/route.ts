import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTING MESSAGE CREATION FIX ===");
    
    const { userId, userEmail, userName, workspaceId, content } = await request.json();

    if (!userId || !content) {
      return NextResponse.json({
        error: "Missing required fields: userId and content"
      }, { status: 400 });
    }

    console.log("Test data:", { userId, userEmail, userName, workspaceId, content });

    const tests = [];

    // Test 1: Check if user exists
    console.log("1. Checking if user exists...");
    let userExistsTest;
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          workspaceId: true
        }
      });

      userExistsTest = {
        step: "user_exists",
        success: true,
        userFound: !!existingUser,
        user: existingUser
      };

      console.log(existingUser ? "✅ User found" : "❌ User not found");
    } catch (error) {
      userExistsTest = {
        step: "user_exists",
        success: false,
        error: (error as Error).message
      };
    }
    tests.push(userExistsTest);

    // Test 2: Create user if doesn't exist (simulate the fix)
    console.log("2. Creating user if needed...");
    let userCreationTest;
    let finalUser = userExistsTest.user;

    if (!userExistsTest.userFound) {
      try {
        // Create workspace first if needed
        let workspace = null;
        if (workspaceId) {
          workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
          });

          if (!workspace) {
            console.log("Creating workspace...");
            workspace = await prisma.workspace.create({
              data: {
                id: workspaceId,
                name: "Test Workspace",
                description: "Auto-created for testing",
                createdById: userId
              }
            });
          }
        }

        // Create user
        console.log("Creating user...");
        finalUser = await prisma.user.create({
          data: {
            id: userId,
            email: userEmail || `test-${userId}@smarthub.local`,
            name: userName || "Test User",
            role: "USER",
            workspaceId: workspaceId,
            isTemporaryPassword: false
          },
          select: {
            id: true,
            email: true,
            name: true,
            workspaceId: true
          }
        });

        userCreationTest = {
          step: "user_creation",
          success: true,
          userCreated: true,
          user: finalUser
        };

        console.log("✅ User created successfully");
      } catch (error) {
        userCreationTest = {
          step: "user_creation",
          success: false,
          error: (error as Error).message
        };
        console.error("❌ User creation failed:", error);
      }
    } else {
      userCreationTest = {
        step: "user_creation",
        success: true,
        userCreated: false,
        message: "User already exists"
      };
    }
    tests.push(userCreationTest);

    // Test 3: Create test message
    console.log("3. Creating test message...");
    let messageCreationTest;
    if (finalUser) {
      try {
        const testMessage = await prisma.chatMessage.create({
          data: {
            content: content,
            authorId: finalUser.id,
            workspaceId: finalUser.workspaceId || workspaceId
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        messageCreationTest = {
          step: "message_creation",
          success: true,
          message: {
            id: testMessage.id,
            content: testMessage.content,
            authorId: testMessage.authorId,
            authorName: testMessage.author.name,
            authorEmail: testMessage.author.email,
            createdAt: testMessage.createdAt
          }
        };

        console.log("✅ Message created successfully:", testMessage.id);
      } catch (error) {
        messageCreationTest = {
          step: "message_creation",
          success: false,
          error: (error as Error).message,
          errorCode: (error as any).code
        };
        console.error("❌ Message creation failed:", error);
      }
    } else {
      messageCreationTest = {
        step: "message_creation",
        success: false,
        error: "No user available for message creation"
      };
    }
    tests.push(messageCreationTest);

    // Test 4: Verify message with author relationship
    console.log("4. Verifying message with author...");
    let verificationTest;
    if (messageCreationTest.success) {
      try {
        const verifiedMessage = await prisma.chatMessage.findUnique({
          where: { id: messageCreationTest.message.id },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        verificationTest = {
          step: "message_verification",
          success: true,
          messageFound: !!verifiedMessage,
          authorIncluded: !!verifiedMessage?.author,
          message: verifiedMessage
        };

        console.log("✅ Message verification successful");
      } catch (error) {
        verificationTest = {
          step: "message_verification",
          success: false,
          error: (error as Error).message
        };
        console.error("❌ Message verification failed:", error);
      }
    } else {
      verificationTest = {
        step: "message_verification",
        success: false,
        error: "No message to verify"
      };
    }
    tests.push(verificationTest);

    return NextResponse.json({
      status: "message_fix_test_complete",
      timestamp: new Date().toISOString(),
      tests,
      summary: {
        userHandled: userExistsTest.success && (userExistsTest.userFound || userCreationTest.success),
        messageCreated: messageCreationTest.success,
        authorRelationshipWorking: verificationTest.success && verificationTest.authorIncluded,
        fixWorking: messageCreationTest.success && verificationTest.success,
        recommendations: generateTestRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ Message fix test error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateTestRecommendations(tests: any[]) {
  const recommendations = [];
  
  const userTest = tests.find(t => t.step === "user_exists");
  const creationTest = tests.find(t => t.step === "user_creation");
  const messageTest = tests.find(t => t.step === "message_creation");
  const verificationTest = tests.find(t => t.step === "message_verification");

  if (!userTest?.userFound && creationTest?.success) {
    recommendations.push("✅ User auto-creation working - missing users will be created");
  }

  if (messageTest?.success) {
    recommendations.push("✅ Message creation working - no more 'author is required' errors");
  }

  if (verificationTest?.success && verificationTest.authorIncluded) {
    recommendations.push("✅ Author relationship working - messages include author data");
  }

  if (messageTest?.success && verificationTest?.success) {
    recommendations.push("✅ COMPLETE FIX VERIFIED - chat messaging should work end-to-end");
  }

  if (!messageTest?.success) {
    recommendations.push("❌ Message creation still failing - check error details");
  }

  return recommendations;
}

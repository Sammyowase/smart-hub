import { NextRequest, NextResponse } from "next/server"
import { aiService } from "@/lib/ai"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING AI SYSTEM DIRECTLY ===");
    
    const tests = [];

    // Test 1: Environment Check
    console.log("1. Checking environment...");
    const envTest = {
      step: "environment_check",
      hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
      keyLength: process.env.GOOGLE_AI_API_KEY?.length || 0,
      keyPreview: process.env.GOOGLE_AI_API_KEY ? 
        process.env.GOOGLE_AI_API_KEY.substring(0, 10) + "..." : "Not found"
    };
    tests.push(envTest);

    // Test 2: AI Service Initialization
    console.log("2. Testing AI service initialization...");
    let serviceTest;
    try {
      const aiServiceAvailable = !!aiService;
      serviceTest = {
        step: "service_initialization",
        success: true,
        aiServiceAvailable,
        serviceType: typeof aiService
      };
    } catch (error) {
      serviceTest = {
        step: "service_initialization",
        success: false,
        error: (error as Error).message
      };
    }
    tests.push(serviceTest);

    // Test 3: Basic AI Response (if API key exists)
    console.log("3. Testing basic AI response...");
    let responseTest;
    if (envTest.hasGoogleAIKey) {
      try {
        const testResponse = await aiService.generateResponse("Hello AI, are you working?", {
          userId: "test-user-id",
          workspaceId: "test-workspace-id",
          conversationType: "group"
        });

        responseTest = {
          step: "basic_response_test",
          success: true,
          responseLength: testResponse.length,
          responsePreview: testResponse.substring(0, 100) + "...",
          fullResponse: testResponse
        };
      } catch (error) {
        responseTest = {
          step: "basic_response_test",
          success: false,
          error: (error as Error).message,
          errorType: (error as any).constructor.name
        };
      }
    } else {
      responseTest = {
        step: "basic_response_test",
        success: false,
        error: "No Google AI API key found",
        skipped: true
      };
    }
    tests.push(responseTest);

    // Test 4: AI Commands
    console.log("4. Testing AI commands...");
    let commandTest;
    if (envTest.hasGoogleAIKey) {
      try {
        const commands = [
          "@ai summarize my productivity",
          "@ai tasks overview",
          "@ai meetings today"
        ];

        const commandResults = [];
        for (const command of commands) {
          try {
            const response = await aiService.generateResponse(command, {
              userId: "test-user-id",
              workspaceId: "test-workspace-id",
              conversationType: "group"
            });
            commandResults.push({
              command,
              success: true,
              responseLength: response.length,
              responsePreview: response.substring(0, 50) + "..."
            });
          } catch (error) {
            commandResults.push({
              command,
              success: false,
              error: (error as Error).message
            });
          }
        }

        commandTest = {
          step: "command_test",
          success: true,
          commandResults,
          successfulCommands: commandResults.filter(r => r.success).length,
          totalCommands: commands.length
        };
      } catch (error) {
        commandTest = {
          step: "command_test",
          success: false,
          error: (error as Error).message
        };
      }
    } else {
      commandTest = {
        step: "command_test",
        success: false,
        error: "No Google AI API key found",
        skipped: true
      };
    }
    tests.push(commandTest);

    return NextResponse.json({
      status: "ai_direct_test_complete",
      timestamp: new Date().toISOString(),
      tests,
      summary: {
        hasAPIKey: envTest.hasGoogleAIKey,
        serviceWorking: serviceTest.success,
        basicResponseWorking: responseTest.success,
        commandsWorking: commandTest.success && commandTest.successfulCommands > 0,
        recommendations: generateAIRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ AI direct test error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateAIRecommendations(tests: any[]) {
  const recommendations = [];
  
  const envTest = tests.find(t => t.step === "environment_check");
  const serviceTest = tests.find(t => t.step === "service_initialization");
  const responseTest = tests.find(t => t.step === "basic_response_test");
  const commandTest = tests.find(t => t.step === "command_test");

  if (!envTest?.hasGoogleAIKey) {
    recommendations.push("CRITICAL: Add GOOGLE_AI_API_KEY to environment variables");
    recommendations.push("Get API key from: https://makersuite.google.com/app/apikey");
  } else if (envTest.keyLength < 30) {
    recommendations.push("WARNING: Google AI API key appears to be invalid (too short)");
  }

  if (!serviceTest?.success) {
    recommendations.push("CRITICAL: AI service initialization failed");
  }

  if (envTest?.hasGoogleAIKey && !responseTest?.success) {
    recommendations.push("CRITICAL: AI response generation failed - check API key validity");
    recommendations.push("Error: " + responseTest?.error);
  }

  if (envTest?.hasGoogleAIKey && responseTest?.success && !commandTest?.success) {
    recommendations.push("WARNING: AI commands not working properly");
  }

  if (envTest?.hasGoogleAIKey && responseTest?.success && commandTest?.success) {
    recommendations.push("✅ AI system is working correctly!");
    recommendations.push("✅ Basic responses working");
    recommendations.push("✅ AI commands working");
    recommendations.push("Ready to test in chat messages");
  }

  return recommendations;
}

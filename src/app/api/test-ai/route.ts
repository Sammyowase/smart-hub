import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, testType = "general" } = body

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Test different AI commands
    const testMessages = {
      general: message,
      summarize: "@ai summarize my productivity",
      tasks: "@ai tasks overview",
      meetings: "@ai meetings today",
      schedule: "@ai schedule team meeting tomorrow at 2pm",
      remind: "@ai remind me to review the project proposal"
    }

    const testMessage = testMessages[testType as keyof typeof testMessages] || message

    // Generate AI response
    const aiResponse = await aiService.generateResponse(testMessage, {
      userId: session.user.id,
      workspaceId: session.user.workspaceId,
      conversationType: "group"
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      input: {
        message: testMessage,
        testType,
        userId: session.user.id
      },
      output: {
        response: aiResponse,
        duration,
        timestamp: new Date().toISOString()
      },
      metadata: {
        hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
        responseLength: aiResponse.length
      }
    })

  } catch (error: any) {
    console.error("AI test error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Test AI service availability
    const tests = {
      environmentCheck: {
        hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
        keyLength: process.env.GOOGLE_AI_API_KEY?.length || 0
      },
      serviceCheck: {
        aiServiceAvailable: !!aiService,
        timestamp: new Date().toISOString()
      }
    }

    // Test basic AI functionality
    try {
      const testResponse = await aiService.generateResponse("Hello AI, are you working?", {
        userId: session.user.id,
        workspaceId: session.user.workspaceId,
        conversationType: "group"
      })

      tests.serviceCheck = {
        ...tests.serviceCheck,
        basicTest: "passed",
        responseLength: testResponse.length,
        responsePreview: testResponse.substring(0, 100) + "..."
      }
    } catch (error: any) {
      tests.serviceCheck = {
        ...tests.serviceCheck,
        basicTest: "failed",
        error: error.message
      }
    }

    return NextResponse.json({
      status: "ai_system_check",
      tests,
      recommendations: generateAIRecommendations(tests),
      availableCommands: [
        "@ai summarize - Get productivity summary",
        "@ai tasks - View task overview", 
        "@ai meetings - View meeting overview",
        "@ai schedule [details] - Get scheduling help",
        "@ai remind [details] - Set reminder guidance"
      ]
    })

  } catch (error: any) {
    console.error("AI system check error:", error)
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

function generateAIRecommendations(tests: any) {
  const recommendations = []

  if (!tests.environmentCheck.hasGoogleAIKey) {
    recommendations.push("Google AI API key is missing - add GOOGLE_AI_API_KEY to environment variables")
  } else if (tests.environmentCheck.keyLength < 30) {
    recommendations.push("Google AI API key appears to be invalid - check the key format")
  }

  if (!tests.serviceCheck.aiServiceAvailable) {
    recommendations.push("AI service is not properly initialized")
  }

  if (tests.serviceCheck.basicTest === "failed") {
    recommendations.push("AI service basic test failed - check API key and network connectivity")
  }

  if (recommendations.length === 0) {
    recommendations.push("AI system is working correctly! Try using @ai commands in chat.")
  }

  return recommendations
}

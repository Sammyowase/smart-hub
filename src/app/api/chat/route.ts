import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { message, conversationHistory } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Build conversation context
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .filter((msg: any) => !msg.isLoading)
        .slice(-5) // Last 5 messages for context
        .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    }

    // Create AI prompt for chat
    const prompt = `You are a helpful AI assistant for SmartHub, a productivity and task management platform. You help users with:

- Task management and organization
- Meeting scheduling and planning  
- Note-taking and documentation
- Team collaboration
- Productivity tips and workflows
- Analytics and insights
- General workplace productivity questions

User Information:
- Name: ${session.user.name || 'User'}
- Role: ${session.user.role || 'User'}
- Workspace: ${session.user.workspaceId || 'Default'}

${conversationContext ? `Recent Conversation:\n${conversationContext}\n` : ''}

Current User Message: "${message}"

Provide a helpful, concise, and friendly response. Keep responses under 200 words unless the user specifically asks for detailed information. Use a conversational tone and include relevant emojis when appropriate.

If the user asks about specific features or functionality, provide accurate information about SmartHub's capabilities including:
- Task creation, editing, and status management
- AI-powered task description enhancement
- Team collaboration and user management
- Meeting scheduling and attendance tracking
- Note creation and organization
- Analytics and reporting
- Mobile-responsive design

Response:`

    console.log("Processing chat message for user:", session.user.name)

    const response = await aiService.generateResponse(prompt, {
      userId: session.user.id,
      workspaceId: session.user.workspaceId,
      conversationType: "chat"
    })

    // Clean up the response
    const cleanedResponse = response
      .replace(/^Response:\s*/i, '') // Remove "Response:" prefix if present
      .trim()

    console.log("Chat response generated successfully")

    return NextResponse.json({
      success: true,
      response: cleanedResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Chat error:", error)
    
    // Provide a fallback response if AI fails
    const fallbackResponses = [
      "I'm having trouble processing your request right now. Could you please try again?",
      "Sorry, I'm experiencing some technical difficulties. Please try rephrasing your question.",
      "I'm currently unable to provide a response. Please check back in a moment.",
      "There seems to be a temporary issue with my AI processing. Please try again shortly."
    ]
    
    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]

    return NextResponse.json({
      success: true,
      response: fallbackResponse,
      fallback: true,
      timestamp: new Date().toISOString()
    })
  }
}

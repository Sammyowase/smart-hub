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

    const { context, previousTips } = await request.json()

    // Generate AI-powered daily tip
    const prompt = `Generate a helpful productivity tip for a SmartHub user. 

Context: The user is viewing their ${context || 'dashboard'} and needs actionable advice.

Requirements:
- Keep the tip concise but actionable (1-2 sentences)
- Focus on productivity, wellness, collaboration, efficiency, or focus
- Make it relevant to modern workplace challenges
- Include a clear, specific action they can take
- Avoid tips about: ${previousTips?.join(', ') || 'generic advice'}

Categories to choose from:
- productivity: Tips for getting more done efficiently
- wellness: Tips for maintaining work-life balance and health
- collaboration: Tips for working better with teams
- efficiency: Tips for optimizing workflows and processes
- focus: Tips for maintaining concentration and avoiding distractions

Return a JSON object with this exact structure:
{
  "title": "Brief, engaging title (max 6 words)",
  "content": "Detailed tip explanation (1-2 sentences, actionable)",
  "category": "one of: productivity, wellness, collaboration, efficiency, focus",
  "actionText": "Call-to-action button text (optional, max 3 words)",
  "actionUrl": "SmartHub URL if applicable (optional, like /dashboard/tasks)"
}

Examples of good tips:
- Title: "Batch Similar Tasks", Content: "Group similar activities together to reduce context switching and maintain focus throughout your workday.", Category: "efficiency"
- Title: "Use Time Blocking", Content: "Schedule specific time slots for different types of work to create structure and improve productivity.", Category: "focus"
- Title: "Take Walking Meetings", Content: "Conduct phone calls or brainstorming sessions while walking to boost creativity and physical activity.", Category: "wellness"`

    const response = await aiService.generateResponse(prompt, {
      userId: session.user.id,
      workspaceId: session.user.workspaceId,
      conversationType: "system"
    })

    // Try to parse the AI response as JSON
    let tipData
    try {
      // Extract JSON from the response if it's wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        tipData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
      
      // Fallback: create a tip from the raw response
      const lines = response.split('\n').filter(line => line.trim())
      tipData = {
        title: "AI Productivity Tip",
        content: lines[0] || "Focus on one task at a time to improve your productivity and reduce stress.",
        category: "productivity",
        actionText: "Try Now",
        actionUrl: "/dashboard/tasks"
      }
    }

    // Validate the response structure
    const validCategories = ["productivity", "wellness", "collaboration", "efficiency", "focus"]
    if (!validCategories.includes(tipData.category)) {
      tipData.category = "productivity"
    }

    // Ensure required fields
    if (!tipData.title) {
      tipData.title = "Daily Productivity Tip"
    }
    if (!tipData.content) {
      tipData.content = "Take a moment to organize your workspace and prioritize your most important tasks for today."
    }

    // Limit field lengths for safety
    tipData.title = tipData.title.substring(0, 50)
    tipData.content = tipData.content.substring(0, 200)
    if (tipData.actionText) {
      tipData.actionText = tipData.actionText.substring(0, 20)
    }

    console.log("Generated AI daily tip:", tipData)

    return NextResponse.json(tipData)

  } catch (error) {
    console.error("Daily tip generation error:", error)
    
    // Return a fallback tip
    return NextResponse.json({
      title: "Stay Organized",
      content: "Take 5 minutes to review your tasks and prioritize what needs to be done today.",
      category: "productivity",
      actionText: "View Tasks",
      actionUrl: "/dashboard/tasks"
    })
  }
}

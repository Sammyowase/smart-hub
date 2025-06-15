import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

// Simple in-memory cache for AI meeting summaries
const meetingSummaryCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { 
      meetingTitle, 
      duration, 
      participants, 
      topics, 
      decisions, 
      actionItems,
      meetingNotes 
    } = await request.json()

    if (!meetingTitle?.trim()) {
      return NextResponse.json(
        { error: "Meeting title is required" },
        { status: 400 }
      )
    }

    // Create cache key
    const cacheKey = `${meetingTitle}-${duration || ''}-${participants?.length || 0}-${Date.now()}`.toLowerCase();
    
    // Check cache first (less likely to hit for meeting summaries, but good for retries)
    const cached = meetingSummaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Returning cached AI meeting summary");
      return NextResponse.json({
        success: true,
        summary: cached.result,
        meetingTitle,
        cached: true
      });
    }

    // Create comprehensive AI prompt for meeting summary
    const prompt = `Generate a comprehensive meeting summary for: "${meetingTitle}"

Meeting Details:
- Duration: ${duration || 'Not specified'}
- Participants: ${participants?.join(', ') || 'Not specified'}
- Topics Discussed: ${topics?.join(', ') || 'Various topics'}
- Decisions Made: ${decisions?.join(', ') || 'None specified'}
- Action Items: ${actionItems?.join(', ') || 'None specified'}
- Additional Notes: ${meetingNotes || 'None'}

Create a well-structured meeting summary with:

## Executive Summary
Brief overview of the meeting purpose and key outcomes

## Key Discussion Points
- Main topics covered during the meeting
- Important insights and perspectives shared

## Decisions Made
- Clear decisions reached during the meeting
- Rationale behind key decisions

## Action Items
- Specific tasks assigned with owners
- Deadlines and next steps
- Follow-up requirements

## Next Steps
- Immediate actions required
- Future meeting recommendations
- Timeline for deliverables

Format as professional markdown document. Be concise but comprehensive.`

    console.log("Generating AI meeting summary for:", meetingTitle)

    // Implement progressive timeout with user feedback
    let meetingSummary: string;
    
    try {
      // First attempt: 10 seconds (meeting summaries may take longer)
      const quickTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Quick timeout - trying extended processing')), 10000);
      });

      meetingSummary = await Promise.race([
        aiService.generateResponse(prompt, {
          userId: session.user.id,
          workspaceId: session.user.workspaceId,
          conversationType: "meeting_summary"
        }),
        quickTimeoutPromise
      ]);

    } catch (quickTimeoutError) {
      console.log("Quick timeout reached, attempting extended processing...");
      
      // Second attempt: 30 seconds with simplified prompt
      const extendedTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Extended timeout - using fallback')), 30000);
      });

      const simplifiedPrompt = `Summarize meeting: "${meetingTitle}"
Duration: ${duration || 'TBD'}
Participants: ${participants?.length || 0}
Topics: ${topics?.slice(0, 3)?.join(', ') || 'General discussion'}

Create executive summary, key points, decisions, and action items.`;

      try {
        meetingSummary = await Promise.race([
          aiService.generateResponse(simplifiedPrompt, {
            userId: session.user.id,
            workspaceId: session.user.workspaceId,
            conversationType: "meeting_summary"
          }),
          extendedTimeoutPromise
        ]);
        
        console.log("Extended processing completed successfully");
        
      } catch (extendedTimeoutError) {
        console.log("Extended timeout reached, using intelligent fallback");
        throw new Error('AI_TIMEOUT_FALLBACK');
      }
    }

    // Clean up the response
    const cleanedSummary = meetingSummary
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\s*Meeting Summary:\s*/i, '') // Remove any prefix
      .trim()

    // Cache the result
    meetingSummaryCache.set(cacheKey, {
      result: cleanedSummary,
      timestamp: Date.now()
    });

    console.log("Meeting summary generated successfully")

    return NextResponse.json({
      success: true,
      summary: cleanedSummary,
      meetingTitle,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("Meeting summary generation error:", error)
    
    // Intelligent fallback summary based on meeting data
    let fallbackSummary = "";
    
    const participantList = participants?.join(', ') || 'Team members';
    const durationText = duration || 'Standard duration';
    const topicsList = topics?.length > 0 ? topics.slice(0, 5) : ['General discussion'];
    const decisionsList = decisions?.length > 0 ? decisions.slice(0, 3) : ['Various decisions made'];
    const actionsList = actionItems?.length > 0 ? actionItems.slice(0, 3) : ['Follow-up actions identified'];

    fallbackSummary = `# Meeting Summary: ${meetingTitle}

## Executive Summary
Meeting held with ${participantList} for ${durationText}. The session covered key topics and resulted in actionable decisions and next steps.

## Key Discussion Points
${topicsList.map(topic => `- ${topic}`).join('\n')}

## Decisions Made
${decisionsList.map(decision => `- ${decision}`).join('\n')}

## Action Items
${actionsList.map(action => `- ${action}`).join('\n')}

## Next Steps
- Review and implement action items
- Schedule follow-up meetings as needed
- Monitor progress on assigned tasks
- Prepare for next phase of project

${meetingNotes ? `\n## Additional Notes\n${meetingNotes}` : ''}

---
*Summary generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*`;

    // Indicate this was a fallback summary
    const isTimeoutError = error instanceof Error && error.message.includes('timeout');
    
    return NextResponse.json({
      success: true,
      summary: fallbackSummary,
      meetingTitle,
      fallback: true,
      fallbackReason: isTimeoutError ? 'AI_TIMEOUT' : 'AI_ERROR',
      generatedAt: new Date().toISOString()
    })
  }
}

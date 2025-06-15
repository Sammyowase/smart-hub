import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

// Simple in-memory cache for AI meeting enhancements
const meetingEnhancementCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { title, currentDescription, duration, attendeeCount, meetingType } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Meeting title is required" },
        { status: 400 }
      )
    }

    // Create cache key
    const cacheKey = `${title}-${currentDescription || ''}-${duration || ''}-${attendeeCount || 0}-${meetingType || 'general'}`.toLowerCase();
    
    // Check cache first
    const cached = meetingEnhancementCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Returning cached AI meeting enhancement");
      return NextResponse.json({
        success: true,
        enhancedDescription: cached.result,
        originalTitle: title,
        originalDescription: currentDescription,
        cached: true
      });
    }

    // Create optimized AI prompt for meeting enhancement
    const prompt = `Create a comprehensive meeting description for: "${title}"
Current Description: ${currentDescription || 'None'}
Duration: ${duration || 'Not specified'}
Attendees: ${attendeeCount || 'Not specified'}
Type: ${meetingType || 'general'}

Generate a professional meeting description including:
- Clear meeting objectives and goals
- Detailed agenda items with time allocations
- Expected outcomes and deliverables
- Participant roles and responsibilities
- Pre-meeting preparation requirements
- Success criteria for the meeting

Format as structured, professional description (4-6 sentences). Focus on clarity and actionable outcomes.`

    console.log("Enhancing meeting description for:", title)

    // Implement progressive timeout with user feedback
    let enhancedDescription: string;
    
    try {
      // First attempt: 8 seconds (most requests should complete)
      const quickTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Quick timeout - trying extended processing')), 8000);
      });

      enhancedDescription = await Promise.race([
        aiService.generateResponse(prompt, {
          userId: session.user.id,
          workspaceId: session.user.workspaceId,
          conversationType: "meeting_enhancement"
        }),
        quickTimeoutPromise
      ]);

    } catch (quickTimeoutError) {
      console.log("Quick timeout reached, attempting extended processing...");
      
      // Second attempt: 25 seconds with simplified prompt
      const extendedTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Extended timeout - using fallback')), 25000);
      });

      const simplifiedPrompt = `Enhance meeting: "${title}"
Description: ${currentDescription || 'None'}
Duration: ${duration || 'TBD'}

Create clear agenda and objectives. Include preparation requirements and expected outcomes.`;

      try {
        enhancedDescription = await Promise.race([
          aiService.generateResponse(simplifiedPrompt, {
            userId: session.user.id,
            workspaceId: session.user.workspaceId,
            conversationType: "meeting_enhancement"
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
    const cleanedDescription = enhancedDescription
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\s*Enhanced Description:\s*/i, '') // Remove any prefix
      .trim()

    // Cache the result
    meetingEnhancementCache.set(cacheKey, {
      result: cleanedDescription,
      timestamp: Date.now()
    });

    console.log("Meeting description enhanced successfully")

    return NextResponse.json({
      success: true,
      enhancedDescription: cleanedDescription,
      originalTitle: title,
      originalDescription: currentDescription
    })

  } catch (error) {
    console.error("Meeting description enhancement error:", error)
    
    // Intelligent fallback enhancement based on meeting analysis
    let fallbackDescription = currentDescription || "";
    
    if (!fallbackDescription.trim() && title) {
      // Analyze title for context and create intelligent enhancement
      const titleLower = title.toLowerCase();
      let enhancedDescription = "";
      
      // Context-aware enhancement based on meeting type
      if (titleLower.includes('standup') || titleLower.includes('daily') || titleLower.includes('scrum')) {
        enhancedDescription = `Daily team standup meeting to review progress and plan the day ahead. Agenda: (1) What did you accomplish yesterday? (2) What will you work on today? (3) Are there any blockers or impediments? Each team member will provide a brief update (2-3 minutes max). Meeting duration: ${duration || '15-30 minutes'}. Come prepared with your updates and any questions or blockers you need help with.`;
      } else if (titleLower.includes('retrospective') || titleLower.includes('retro')) {
        enhancedDescription = `Team retrospective meeting to reflect on recent work and identify improvements. Agenda: (1) What went well? (2) What could be improved? (3) Action items for next iteration. All team members should come prepared to discuss successes, challenges, and suggestions for improvement. Expected outcomes: Clear action items and process improvements for the team.`;
      } else if (titleLower.includes('planning') || titleLower.includes('sprint')) {
        enhancedDescription = `Sprint/project planning meeting to define objectives and allocate work. Agenda: (1) Review project goals and priorities (2) Break down tasks and estimate effort (3) Assign responsibilities and set deadlines. Participants should review requirements beforehand and come prepared with questions. Expected outcomes: Clear sprint backlog with assigned tasks and realistic timelines.`;
      } else if (titleLower.includes('review') || titleLower.includes('demo')) {
        enhancedDescription = `Project review and demonstration meeting to showcase completed work and gather feedback. Agenda: (1) Demo of completed features/deliverables (2) Stakeholder feedback and questions (3) Next steps and priorities. Presenters should prepare demos and documentation. Expected outcomes: Stakeholder approval and clear direction for next phase.`;
      } else if (titleLower.includes('kickoff') || titleLower.includes('kick-off')) {
        enhancedDescription = `Project kickoff meeting to align team on objectives, scope, and approach. Agenda: (1) Project overview and goals (2) Team roles and responsibilities (3) Timeline and milestones (4) Communication plan and next steps. All team members should attend and come prepared with questions. Expected outcomes: Shared understanding of project scope and clear action plan.`;
      } else {
        // Generic enhancement with meeting structure
        const durationText = duration ? ` (${duration})` : '';
        const attendeeText = attendeeCount ? ` with ${attendeeCount} participants` : '';
        enhancedDescription = `${title}${durationText}${attendeeText}. Meeting objectives: Define clear goals and expected outcomes for this session. Agenda items: (1) Opening and introductions (2) Main discussion topics (3) Decision points and action items (4) Next steps and follow-up. Participants should come prepared with relevant materials and questions. Expected outcomes: Clear decisions, assigned action items, and defined next steps.`;
      }
      
      fallbackDescription = enhancedDescription;
      
    } else if (fallbackDescription.trim()) {
      // Enhance existing description with meeting structure
      fallbackDescription = `${fallbackDescription} Meeting will include structured agenda items, clear objectives, and defined outcomes. Participants should come prepared with relevant materials and questions. Expected deliverables: Action items with assigned owners and timelines.`;
    }

    // Indicate this was a fallback enhancement
    const isTimeoutError = error instanceof Error && error.message.includes('timeout');
    
    return NextResponse.json({
      success: true,
      enhancedDescription: fallbackDescription,
      originalTitle: title,
      originalDescription: currentDescription,
      fallback: true,
      fallbackReason: isTimeoutError ? 'AI_TIMEOUT' : 'AI_ERROR',
      processingTime: isTimeoutError ? '15000+ms' : 'unknown'
    })
  }
}

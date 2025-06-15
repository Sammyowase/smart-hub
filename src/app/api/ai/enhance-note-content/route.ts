import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

// Simple in-memory cache for AI note enhancements
const noteEnhancementCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { title, currentContent, noteType } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Note title is required" },
        { status: 400 }
      )
    }

    // Create cache key
    const cacheKey = `${title}-${currentContent || ''}-${noteType || 'general'}`.toLowerCase();
    
    // Check cache first
    const cached = noteEnhancementCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Returning cached AI note enhancement");
      return NextResponse.json({
        success: true,
        enhancedContent: cached.result,
        originalTitle: title,
        originalContent: currentContent,
        cached: true
      });
    }

    // Create optimized AI prompt for note enhancement
    const prompt = `Transform this note into well-structured documentation:

Title: "${title}"
Current Content: ${currentContent || 'None'}
Type: ${noteType || 'general'}

Create professional documentation with:
- Clear headings and sections
- Bullet points and numbered lists
- Professional language
- Additional context and explanations
- Actionable items and next steps

Return only the enhanced content with proper markdown formatting.`

    console.log("Enhancing note content for:", title)

    // Implement progressive timeout with user feedback
    let enhancedContent: string;
    
    try {
      // First attempt: 8 seconds (most requests should complete)
      const quickTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Quick timeout - trying extended processing')), 8000);
      });

      enhancedContent = await Promise.race([
        aiService.generateResponse(prompt, {
          userId: session.user.id,
          workspaceId: session.user.workspaceId,
          conversationType: "note_enhancement"
        }),
        quickTimeoutPromise
      ]);

    } catch (quickTimeoutError) {
      console.log("Quick timeout reached, attempting extended processing...");
      
      // Second attempt: 25 seconds with simplified prompt
      const extendedTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Extended timeout - using fallback')), 25000);
      });

      const simplifiedPrompt = `Improve note: "${title}"\nContent: ${currentContent || 'None'}\nMake it well-structured and professional.`;

      try {
        enhancedContent = await Promise.race([
          aiService.generateResponse(simplifiedPrompt, {
            userId: session.user.id,
            workspaceId: session.user.workspaceId,
            conversationType: "note_enhancement"
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
    const cleanedContent = enhancedContent
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\s*Enhanced Content:\s*/i, '') // Remove any prefix
      .trim()

    // Cache the result
    noteEnhancementCache.set(cacheKey, {
      result: cleanedContent,
      timestamp: Date.now()
    });

    console.log("Note content enhanced successfully")

    return NextResponse.json({
      success: true,
      enhancedContent: cleanedContent,
      originalTitle: title,
      originalContent: currentContent
    })

  } catch (error) {
    console.error("Note content enhancement error:", error)
    
    // Intelligent fallback enhancement based on note analysis
    let fallbackContent = currentContent || "";
    
    if (!fallbackContent.trim() && title) {
      // Analyze title for context and create intelligent enhancement
      const titleLower = title.toLowerCase();
      let enhancedContent = "";
      
      // Context-aware enhancement based on keywords
      if (titleLower.includes('meeting') || titleLower.includes('discussion')) {
        enhancedContent = `# ${title}\n\n## Meeting Overview\n- **Date:** [Date]\n- **Participants:** [List participants]\n- **Duration:** [Duration]\n\n## Key Discussion Points\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\n## Decisions Made\n- [Decision 1]\n- [Decision 2]\n\n## Action Items\n- [ ] [Action item 1] - Assigned to: [Name] - Due: [Date]\n- [ ] [Action item 2] - Assigned to: [Name] - Due: [Date]\n\n## Next Steps\n- [Next step 1]\n- [Next step 2]`;
      } else if (titleLower.includes('project') || titleLower.includes('plan')) {
        enhancedContent = `# ${title}\n\n## Project Overview\n[Brief description of the project]\n\n## Objectives\n- [Objective 1]\n- [Objective 2]\n- [Objective 3]\n\n## Key Requirements\n- [Requirement 1]\n- [Requirement 2]\n- [Requirement 3]\n\n## Timeline\n- **Phase 1:** [Description] - [Timeline]\n- **Phase 2:** [Description] - [Timeline]\n- **Phase 3:** [Description] - [Timeline]\n\n## Resources Needed\n- [Resource 1]\n- [Resource 2]\n\n## Success Criteria\n- [Criteria 1]\n- [Criteria 2]`;
      } else if (titleLower.includes('idea') || titleLower.includes('brainstorm')) {
        enhancedContent = `# ${title}\n\n## Concept Overview\n[Brief description of the idea]\n\n## Key Features\n- [Feature 1]\n- [Feature 2]\n- [Feature 3]\n\n## Benefits\n- [Benefit 1]\n- [Benefit 2]\n- [Benefit 3]\n\n## Implementation Considerations\n- [Consideration 1]\n- [Consideration 2]\n\n## Next Steps\n- [ ] [Research/validate idea]\n- [ ] [Create detailed plan]\n- [ ] [Identify resources needed]\n\n## Notes\n[Additional thoughts and considerations]`;
      } else {
        // Generic enhancement with proper structure
        enhancedContent = `# ${title}\n\n## Overview\n[Brief description or summary]\n\n## Key Points\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\n## Details\n[Detailed information and context]\n\n## Action Items\n- [ ] [Action item 1]\n- [ ] [Action item 2]\n\n## Notes\n[Additional notes and considerations]`;
      }
      
      fallbackContent = enhancedContent;
      
    } else if (fallbackContent.trim()) {
      // Enhance existing content with basic structure
      const lines = fallbackContent.split('\n').filter(line => line.trim());
      if (lines.length > 0 && !fallbackContent.includes('#')) {
        fallbackContent = `# ${title}\n\n${fallbackContent}\n\n## Summary\n[Key takeaways and important points]\n\n## Next Steps\n- [ ] [Follow-up action 1]\n- [ ] [Follow-up action 2]`;
      }
    }

    // Indicate this was a fallback enhancement
    const isTimeoutError = error instanceof Error && error.message.includes('timeout');
    
    return NextResponse.json({
      success: true,
      enhancedContent: fallbackContent,
      originalTitle: title,
      originalContent: currentContent,
      fallback: true,
      fallbackReason: isTimeoutError ? 'AI_TIMEOUT' : 'AI_ERROR',
      processingTime: isTimeoutError ? '15000+ms' : 'unknown'
    })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

// Simple in-memory cache for AI enhancements
const enhancementCache = new Map<string, { result: string; timestamp: number }>();
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

    const { title, currentDescription, priority } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      )
    }

    // Create cache key
    const cacheKey = `${title}-${currentDescription || ''}-${priority}`.toLowerCase();

    // Check cache first
    const cached = enhancementCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Returning cached AI enhancement");
      return NextResponse.json({
        success: true,
        enhancedDescription: cached.result,
        originalTitle: title,
        originalDescription: currentDescription,
        cached: true
      });
    }

    // Create sophisticated AI prompt for detailed task enhancement
    const prompt = `Create a comprehensive task description for: "${title}"
Current: ${currentDescription || 'None'}
Priority: ${priority}

Generate a detailed, actionable task description including:
- Clear objective and what needs to be accomplished
- Step-by-step breakdown of key activities
- Required resources and dependencies
- Acceptance criteria and definition of done
- Potential risks and mitigation strategies
- Estimated complexity level

Format as professional, structured description (3-5 sentences). Focus on clarity and actionability.`

    console.log("Enhancing task description for:", title)

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
          conversationType: "task_enhancement"
        }),
        quickTimeoutPromise
      ]);

    } catch (quickTimeoutError) {
      console.log("Quick timeout reached, attempting extended processing...");

      // Second attempt: 25 seconds with simplified prompt
      const extendedTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Extended timeout - using fallback')), 25000);
      });

      const simplifiedPrompt = `Enhance task: "${title}"
Current: ${currentDescription || 'None'}
Priority: ${priority}

Create clear, actionable description with key steps and requirements. 2-3 sentences.`;

      try {
        enhancedDescription = await Promise.race([
          aiService.generateResponse(simplifiedPrompt, {
            userId: session.user.id,
            workspaceId: session.user.workspaceId,
            conversationType: "task_enhancement"
          }),
          extendedTimeoutPromise
        ]);

        console.log("Extended processing completed successfully");

      } catch (extendedTimeoutError) {
        console.log("Extended timeout reached, using intelligent fallback");
        throw new Error('AI_TIMEOUT_FALLBACK');
      }
    }

    // Clean up the response (remove any quotes or extra formatting)
    const cleanedDescription = enhancedDescription
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/^\s*Enhanced Description:\s*/i, '') // Remove any prefix
      .trim()

    // Cache the result
    enhancementCache.set(cacheKey, {
      result: cleanedDescription,
      timestamp: Date.now()
    });

    console.log("Task description enhanced successfully")

    return NextResponse.json({
      success: true,
      enhancedDescription: cleanedDescription,
      originalTitle: title,
      originalDescription: currentDescription
    })

  } catch (error) {
    console.error("Task description enhancement error:", error)

    // Intelligent fallback enhancement based on task analysis
    let fallbackDescription = currentDescription || "";

    if (!fallbackDescription.trim() && title) {
      // Analyze title for context and create intelligent enhancement
      const titleLower = title.toLowerCase();
      let enhancedDescription = "";

      // Context-aware enhancement based on keywords
      if (titleLower.includes('dashboard') || titleLower.includes('ui') || titleLower.includes('interface')) {
        enhancedDescription = `Improve the ${title.toLowerCase()} by enhancing user experience, visual design, and functionality. Focus on usability, accessibility, and modern design principles.`;
      } else if (titleLower.includes('bug') || titleLower.includes('fix') || titleLower.includes('error')) {
        enhancedDescription = `Investigate and resolve the issue: ${title}. Identify root cause, implement fix, and test thoroughly to prevent regression.`;
      } else if (titleLower.includes('feature') || titleLower.includes('implement') || titleLower.includes('add')) {
        enhancedDescription = `Develop and implement: ${title}. Plan architecture, code solution, test functionality, and document implementation.`;
      } else if (titleLower.includes('test') || titleLower.includes('testing')) {
        enhancedDescription = `Create comprehensive tests for: ${title}. Design test cases, implement automated tests, and ensure quality coverage.`;
      } else if (titleLower.includes('performance') || titleLower.includes('optimize')) {
        enhancedDescription = `Optimize performance for: ${title}. Analyze bottlenecks, implement improvements, and measure performance gains.`;
      } else {
        // Generic enhancement with priority context
        const priorityContext = priority === "HIGH" || priority === "URGENT"
          ? "High-priority task requiring immediate attention. "
          : priority === "LOW"
          ? "Task to be completed when time permits. "
          : "";

        enhancedDescription = `${priorityContext}Complete the task: ${title}. Plan approach, execute solution, and verify results meet requirements.`;
      }

      fallbackDescription = enhancedDescription;

    } else if (fallbackDescription.trim()) {
      // Enhance existing description with context-aware improvements
      fallbackDescription = `${fallbackDescription} Ensure deliverables meet quality standards and requirements are fully satisfied.`;
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

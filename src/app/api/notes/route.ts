import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const notes = await prisma.note.findMany({
      where: {
        workspaceId: session.user.workspaceId,
        ...(category && category !== 'all' ? { category } : {})
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return NextResponse.json(notes)

  } catch (error) {
    console.error("Get notes error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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
    const { title, content, category, isShared = false } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      )
    }

    // Simple sentiment analysis (in production, use AI service)
    const sentiment = analyzeSentiment(content)

    const note = await prisma.note.create({
      data: {
        title,
        content,
        category: category || null,
        isShared,
        sentiment,
        createdById: session.user.id,
        workspaceId: session.user.workspaceId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(note)

  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Simple sentiment analysis function
function analyzeSentiment(content: string): "POSITIVE" | "NEUTRAL" | "NEGATIVE" {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'happy', 'success', 'achieve', 'win', 'progress']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'fail', 'problem', 'issue', 'difficult', 'hard', 'struggle', 'worry']
  
  const words = content.toLowerCase().split(/\s+/)
  let positiveCount = 0
  let negativeCount = 0
  
  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) positiveCount++
    if (negativeWords.some(nw => word.includes(nw))) negativeCount++
  })
  
  if (positiveCount > negativeCount) return "POSITIVE"
  if (negativeCount > positiveCount) return "NEGATIVE"
  return "NEUTRAL"
}

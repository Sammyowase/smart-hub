import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, category, isShared } = body

    // Verify note belongs to user's workspace
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        workspaceId: session.user.workspaceId
      }
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      )
    }

    // Simple sentiment analysis
    const sentiment = content ? analyzeSentiment(content) : existingNote.sentiment

    const updatedNote = await prisma.note.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content, sentiment }),
        ...(category !== undefined && { category }),
        ...(isShared !== undefined && { isShared }),
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

    return NextResponse.json(updatedNote)

  } catch (error) {
    console.error("Update note error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify note belongs to user's workspace
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        workspaceId: session.user.workspaceId
      }
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      )
    }

    await prisma.note.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Note deleted successfully" })

  } catch (error) {
    console.error("Delete note error:", error)
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
